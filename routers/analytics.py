from fastapi import APIRouter, Depends, Header, Request, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from api_key import verify_api_key
from services.inference import inference_service
from rate_limit import check_rate_limit, check_monthly_budget, get_plan_limits
from models import Usage, RequestLog
import datetime
import time
import json

router = APIRouter()

@router.post("/v1/fraud/analyze")
async def analyze_fraud(
    request: Request,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    # ─── STEP 1: Authentication ───────────────────────────────────────────────
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    raw_api_key = authorization.split(" ")[1]
    key_obj = verify_api_key(raw_api_key, db)
    if not key_obj:
        raise HTTPException(status_code=403, detail="Invalid API key")

    user = key_obj.user

    # ─── STEP 2: Strict JSON Body Parsing ─────────────────────────────────────
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
        
    transaction_data = body.get("transaction")
    if not transaction_data:
        raise HTTPException(status_code=400, detail="Missing 'transaction' object in JSON payload")

    # ─── STEP 3: Enforce Billing / Limits ─────────────────────────────────────
    plan = user.plan or "free"
    
    if plan in ["free", "starter", "pro"]:
        raise HTTPException(
            status_code=403, 
            detail="Fraud Detection API requires the Premium or Max plan."
        )
        
    limits = get_plan_limits(plan)
    
    # We estimate tokens simply for the limit check
    estimated_tokens = len(str(transaction_data)) // 4 + 200 # Roughly 200 tokens for the system prompt overhead
    
    if estimated_tokens > limits["max_context_tokens"]:
        raise HTTPException(
            status_code=400,
            detail=f"Transaction payload too large. Max allowed: {limits['max_context_tokens']} tokens."
        )
    
    check_rate_limit(str(user.id), limits["rpm"], limits["tpm"], estimated_tokens)

    month_key = datetime.datetime.now().strftime("%Y-%m")
    usage = db.query(Usage).filter_by(user_id=user.id, month=month_key).first()
    tokens_used_so_far = usage.tokens_used if usage else 0
    check_monthly_budget(tokens_used_so_far, limits["month_tokens"], estimated_tokens)

    # ─── STEP 4: Build System Prompt ──────────────────────────────────────────
    messages = [
        {
            "role": "system",
            "content": (
                "You are an enterprise fraud detection engine. Analyze the following transaction "
                "data for anomalies, impossible travel, high-risk flags, or suspicious activity. "
                "You MUST respond with strictly valid JSON matching this schema: "
                "{\"is_fraud\": boolean, \"risk_score\": int (0-100), \"reason\": \"string explanation\"} "
                "Do not include markdown blocks or any other text."
            )
        },
        {
            "role": "user",
            "content": json.dumps(transaction_data)
        }
    ]

    # ─── STEP 5: Run Inference (Bypass Semantic Router) ───────────────────────
    try:
        result = await inference_service.run_completion(
            messages,
            max_tokens=300,
            temperature=0.1, # Low temp for deterministic analytical results
            force_category="FRAUD_DETECTION" # Bypasses semantics entirely!
        )
    except Exception as e:
        print(f"Fraud API Error: {e}")
        raise HTTPException(status_code=500, detail="Analytics engine unavailable")

    # ─── STEP 6: Log Usage (With 10x Premium Multiplier) ──────────────────────
    actual_tokens = result.get("usage", {}).get("total_tokens", 0)
    billed_tokens = actual_tokens * 10
    
    if not usage:
        usage = Usage(user_id=user.id, month=month_key, requests_used=0, tokens_used=0, daily_history="[0,0,0,0,0,0,0]")
        db.add(usage)
        
    try:
        history = json.loads(usage.daily_history)
    except Exception:
        history = [0, 0, 0, 0, 0, 0, 0]
    history[-1] += 1
    usage.daily_history = json.dumps(history)
    usage.requests_used += 1
    usage.tokens_used += billed_tokens

    db.add(RequestLog(
        user_id=user.id,
        task_category="FRAUD_DETECTION",
        provider=result.get("orchestration_meta", {}).get("primary", {}).get("provider", "deepinfra"),
        model=result.get("routed_model", "unknown"),
        total_latency_ms=result.get("latency_ms", 0),
        tokens_used=billed_tokens,
        status_code=200
    ))
    db.commit()

    # ─── STEP 7: Return pure JSON to client ───────────────────────────────────
    # The LLM returns a string containing JSON. We try to parse it to ensure it's valid.
    raw_response = result["choices"][0]["message"]["content"]
    
    # Strip markdown if the LLM hallucinated it
    if raw_response.startswith("```json"):
        raw_response = raw_response[7:-3]
    elif raw_response.startswith("```"):
        raw_response = raw_response[3:-3]
        
    try:
        parsed_json = json.loads(raw_response.strip())
        return parsed_json
    except json.JSONDecodeError:
        # Fallback if the model failed to return strict JSON
        return {
            "is_fraud": False,
            "risk_score": 50,
            "reason": "Failed to parse model output into strict JSON.",
            "raw_output": raw_response
        }

@router.post("/v1/data/analyze")
async def analyze_data(
    request: Request,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    # ─── Authentication ───
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    raw_api_key = authorization.split(" ")[1]
    key_obj = verify_api_key(raw_api_key, db)
    if not key_obj:
        raise HTTPException(status_code=403, detail="Invalid API key")

    user = key_obj.user

    # ─── Payload Parsing ───
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
        
    dataset = body.get("dataset")
    query = body.get("query", "Extract key insights, trends, and anomalies from this dataset.")
    
    if not dataset:
        raise HTTPException(status_code=400, detail="Missing 'dataset' field in JSON payload")

    # ─── Enforce Billing / Limits ───
    plan = user.plan or "free"
    
    if plan == "free":
        raise HTTPException(
            status_code=403, 
            detail="Data Analytics API requires the Starter plan or higher."
        )
        
    limits = get_plan_limits(plan)
    estimated_tokens = len(str(dataset)) // 4 + len(query) // 4 + 200
    
    if estimated_tokens > limits["max_context_tokens"]:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset payload too large. Your plan allows {limits['max_context_tokens']} tokens. Upgrade your plan."
        )
    
    check_rate_limit(str(user.id), limits["rpm"], limits["tpm"], estimated_tokens)

    month_key = datetime.datetime.now().strftime("%Y-%m")
    usage = db.query(Usage).filter_by(user_id=user.id, month=month_key).first()
    tokens_used_so_far = usage.tokens_used if usage else 0
    check_monthly_budget(tokens_used_so_far, limits["month_tokens"], estimated_tokens)

    # ─── Build System Prompt ───
    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert data analyst engine. Analyze the provided dataset based on the user's query. "
                "You MUST respond with strictly valid JSON matching this schema: "
                "{\"insights\": [\"string\"], \"trends\": [\"string\"], \"anomalies\": [\"string\"], \"summary\": \"string\"} "
                "Do not include markdown blocks or any other text."
            )
        },
        {
            "role": "user",
            "content": f"Query: {query}\n\nDataset: {json.dumps(dataset)}"
        }
    ]

    # ─── Run Inference (Bypass Semantic Router) ───
    try:
        result = await inference_service.run_completion(
            messages,
            max_tokens=500,
            temperature=0.2, 
            force_category="ANALYTICS"
        )
    except Exception as e:
        print(f"Analytics API Error: {e}")
        raise HTTPException(status_code=500, detail="Analytics engine unavailable")

    # ─── Log Usage (With 5x Premium Multiplier) ───
    actual_tokens = result.get("usage", {}).get("total_tokens", 0)
    billed_tokens = actual_tokens * 5
    
    if not usage:
        usage = Usage(user_id=user.id, month=month_key, requests_used=0, tokens_used=0, daily_history="[0,0,0,0,0,0,0]")
        db.add(usage)
        
    try:
        history = json.loads(usage.daily_history)
    except Exception:
        history = [0, 0, 0, 0, 0, 0, 0]
    history[-1] += 1
    usage.daily_history = json.dumps(history)
    usage.requests_used += 1
    usage.tokens_used += billed_tokens

    db.add(RequestLog(
        user_id=user.id,
        task_category="ANALYTICS",
        provider=result.get("orchestration_meta", {}).get("primary", {}).get("provider", "deepinfra"),
        model=result.get("routed_model", "unknown"),
        total_latency_ms=result.get("latency_ms", 0),
        tokens_used=billed_tokens,
        status_code=200
    ))
    db.commit()

    # ─── Return JSON ───
    raw_response = result["choices"][0]["message"]["content"]
    
    if raw_response.startswith("```json"):
        raw_response = raw_response[7:-3]
    elif raw_response.startswith("```"):
        raw_response = raw_response[3:-3]
        
    try:
        return json.loads(raw_response.strip())
    except json.JSONDecodeError:
        return {
            "insights": [],
            "trends": [],
            "anomalies": [],
            "summary": "Failed to parse model output into strict JSON.",
            "raw_output": raw_response
        }
