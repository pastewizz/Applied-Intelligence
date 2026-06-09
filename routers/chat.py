from fastapi import APIRouter, Depends, Header, Request, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Usage, RequestLog, APIKey
from api_key import verify_api_key
from rate_limit import (
    get_plan_limits,
    check_rate_limit,
    check_context_limit,
    check_monthly_budget,
)
from services.inference import inference_service
from state import system_health
import datetime
import time
import json
from collections import defaultdict

router = APIRouter()


def friendly_error_response(message: str):
    """Returns an error formatted as a valid OpenAI-compatible chat completion response."""
    return {
        "id": "chatcmpl-error",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": "applied-intelligence",
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": f"⚠️ {message}"
                },
                "finish_reason": "stop"
            }
        ],
        "usage": {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        }
    }


@router.post("/v1/chat/completions")
async def chat(
    request: Request,
    authorization: str = Header(default=None),
    db: Session = Depends(get_db)
):
    # ─── STEP 1: Authentication ───────────────────────────────────────────────
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    raw_api_key = authorization.split(" ")[1]
    key_obj = verify_api_key(raw_api_key, db)  # Returns APIKey object now
    if not key_obj:
        raise HTTPException(status_code=403, detail="Invalid API key")

    user = key_obj.user

    # ─── STEP 2: Per-Key Token Budget Check ───────────────────────────────────
    # If this specific key has its own token limit, enforce it before anything else.
    if key_obj.token_limit is not None:
        consumed = key_obj.tokens_consumed or 0
        if consumed >= key_obj.token_limit:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"API key token budget exhausted. "
                    f"This key has used {consumed:,} of its {key_obj.token_limit:,} token limit. "
                    f"Create a new key or contact the account owner."
                ),
                headers={"X-RateLimit-Type": "key_budget"}
            )

    # ─── STEP 3: Resolve plan limits ──────────────────────────────────────────
    plan = user.plan or "free"
    limits = get_plan_limits(plan)

    # ─── STEP 4: Parse request body ───────────────────────────────────────────
    body = await request.json()
    messages = body.get("messages", [])
    requested_max_tokens = int(body.get("max_tokens", 300))
    temperature = float(body.get("temperature", 0.7))
    is_stream = body.get("stream", False)

    if not messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    # ─── STEP 5: Context Limit ────────────────────────────────────────────────
    estimated_input_tokens = check_context_limit(messages, limits["max_context_tokens"])

    # ─── STEP 6: Output Cap (silent clamp) ────────────────────────────────────
    capped_max_tokens = min(requested_max_tokens, limits["max_output_tokens"])

    # ─── STEP 7: RPM + TPM (sliding window, keyed to user) ───────────────────
    total_estimated_tokens = estimated_input_tokens + capped_max_tokens
    check_rate_limit(str(user.id), limits["rpm"], limits["tpm"], total_estimated_tokens)

    # ─── STEP 8: Monthly Budget (user-level) ──────────────────────────────────
    month_key = datetime.datetime.now().strftime("%Y-%m")
    usage = db.query(Usage).filter_by(user_id=user.id, month=month_key).first()
    tokens_used_so_far = usage.tokens_used if usage else 0
    check_monthly_budget(tokens_used_so_far, limits["month_tokens"], total_estimated_tokens)

    # ─── STEP 9: Inference ────────────────────────────────────────────────────
    if is_stream:
        async def event_generator():
            try:
                # We deduct tokens as if max_tokens was used for streaming
                # since tracking mid-stream is complex.
                async for chunk in inference_service.stream_completion(
                    messages,
                    max_tokens=capped_max_tokens,
                    temperature=temperature
                ):
                    yield f"data: {json.dumps(chunk)}\n\n"
                
                # Update basic telemetry
                system_health["latency"] = (system_health["latency"] * 0.9) + 100
                system_health["last_check"] = time.time()
                
                # Record Usage
                if not usage:
                    new_usage = Usage(user_id=user.id, month=month_key, requests_used=0, tokens_used=0, daily_history="[0,0,0,0,0,0,0]")
                    db.add(new_usage)
                    db.commit()
                    db.refresh(new_usage)
                    usage_to_update = new_usage
                else:
                    usage_to_update = usage
                    
                try:
                    history = json.loads(usage_to_update.daily_history)
                except Exception:
                    history = [0, 0, 0, 0, 0, 0, 0]
                history[-1] += 1
                usage_to_update.daily_history = json.dumps(history)
                usage_to_update.requests_used += 1
                usage_to_update.tokens_used += capped_max_tokens  # estimate
                
                key_obj.tokens_consumed = (key_obj.tokens_consumed or 0) + capped_max_tokens
                db.commit()
                
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps(friendly_error_response(str(e)))}\n\n"
                yield "data: [DONE]\n\n"
                
        return StreamingResponse(event_generator(), media_type="text/event-stream")

    try:
        result = await inference_service.run_completion(
            messages,
            max_tokens=capped_max_tokens,
            temperature=temperature
        )
        latency = result.get("latency_ms", 0)
        system_health["latency"] = (system_health["latency"] * 0.9) + (latency * 0.1)
        system_health["last_check"] = time.time()
        system_health["status"] = "operational"
    except Exception as e:
        system_health["status"] = "degraded"
        print(f"Inference Failure: {e}")
        raise HTTPException(status_code=500, detail="Inference engine unavailable")

    # ─── STEP 10: Record Usage ────────────────────────────────────────────────
    actual_tokens = result.get("usage", {}).get("total_tokens", 0)

    # User-level usage
    if not usage:
        usage = Usage(
            user_id=user.id,
            month=month_key,
            requests_used=0,
            tokens_used=0,
            daily_history="[0,0,0,0,0,0,0]"
        )
        db.add(usage)

    try:
        history = json.loads(usage.daily_history)
    except Exception:
        history = [0, 0, 0, 0, 0, 0, 0]
    history[-1] += 1
    usage.daily_history = json.dumps(history)
    usage.requests_used += 1
    usage.tokens_used += actual_tokens

    # Per-key usage tracking
    key_obj.tokens_consumed = (key_obj.tokens_consumed or 0) + actual_tokens

    # Analytics log
    orchestration_meta = result.get("orchestration_meta", {})
    usage_breakdown = result.get("usage", {})
    db.add(RequestLog(
        user_id=user.id,
        task_category=result.get("task_category", "GENERAL"),
        provider=orchestration_meta.get("primary", {}).get("provider", "deepinfra"),
        model=result.get("routed_model", "unknown"),
        route_type=orchestration_meta.get("route_type", "primary"),
        prompt_tokens=usage_breakdown.get("prompt_tokens", 0),
        completion_tokens=usage_breakdown.get("completion_tokens", 0),
        tokens_used=actual_tokens,
        total_latency_ms=latency,
        cache_hit=result.get("cached", False),
        status_code=200
    ))
    db.commit()

    # ─── STEP 11: Return ──────────────────────────────────────────────────────
    result["model"] = result.get("routed_model", result.get("model", "applied-intelligence"))
    return result


# ─── DEMO ENDPOINT ────────────────────────────────────────────────────────────
_demo_request_counts: dict = defaultdict(lambda: {"count": 0, "window_start": time.time()})

@router.post("/v1/demo/chat")
async def demo_chat(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    slot = _demo_request_counts[client_ip]

    if now - slot["window_start"] > 3600:
        slot["count"] = 0
        slot["window_start"] = now

    if slot["count"] >= 5:
        return friendly_error_response(
            "Demo rate limit reached (5 requests/hour). Sign up for an API key to continue."
        )

    slot["count"] += 1

    body = await request.json()
    messages = body.get("messages", [])
    max_tokens = min(int(body.get("max_tokens", 300)), 500)
    temperature = float(body.get("temperature", 0.7))

    input_text = " ".join(
        m.get("content", "") for m in messages if isinstance(m.get("content"), str)
    )
    if len(input_text) > 2000:
        return friendly_error_response("Input too long for demo mode. Max 2,000 characters.")

    return await inference_service.run_completion(messages, max_tokens=max_tokens, temperature=temperature)
