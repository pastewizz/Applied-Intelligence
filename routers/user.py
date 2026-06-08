from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, APIKey, Payment, Usage
from auth import get_current_user
from api_key import generate_api_key
import os
import datetime

router = APIRouter()

@router.get("/api/config")
def get_client_config():
    return {
        "supabase_url": os.getenv("SUPABASE_URL"),
        "supabase_anon_key": os.getenv("SUPABASE_ANON_KEY")
    }

@router.get("/me/keys")
def get_user_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns all active API keys for the user."""
    from api_key import list_user_keys
    keys = list_user_keys(user.id, db)
    return {"keys": keys}

@router.post("/register")
async def register_user(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generates a new named API key with an optional per-key token budget."""
    from api_key import generate_api_key
    try:
        body = await request.json()
        name = body.get("name", "New Key")
        token_limit = body.get("token_limit", None)  # Optional: integer or null
        # Validate: token_limit must be a positive integer if provided
        if token_limit is not None:
            token_limit = int(token_limit)
            if token_limit <= 0:
                raise HTTPException(status_code=400, detail="token_limit must be a positive integer")
    except HTTPException:
        raise
    except Exception:
        name = "New Key"
        token_limit = None

    raw_key = generate_api_key(user.id, db, name=name, token_limit=token_limit)
    return {"status": "success", "api_key": raw_key}

@router.delete("/me/keys/{key_id}")
def delete_key(key_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from api_key import delete_specific_key
    if delete_specific_key(user.id, key_id, db):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="Key not found")

@router.post("/me/keys/update-name")
async def update_key_name(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    body = await request.json()
    new_name = body.get("name")
    if not new_name:
        raise HTTPException(status_code=400, detail="Name required")
    
    key = db.query(APIKey).filter(APIKey.user_id == user.id).first()
    if key:
        key.name = new_name
        db.commit()
    return {"status": "success"}

@router.delete("/me/keys")
async def delete_key(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from api_key import delete_api_key
    if delete_api_key(user.id, db):
        return {"status": "success"}
    raise HTTPException(status_code=404, detail="No key found")

@router.get("/me/payments")
def get_payment_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payments = db.query(Payment).filter(Payment.user_id == user.id).order_by(Payment.created_at.desc()).all()
    return payments

@router.get("/me/usage")
def get_usage(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    month = datetime.datetime.now().strftime("%Y-%m")
    try:
        usage = db.query(Usage).filter(Usage.user_id == user.id, Usage.month == month).first()
        if not usage:
            usage = Usage(user_id=user.id, month=month, requests_used=0, tokens_used=0)
            db.add(usage)
            db.commit()
            db.refresh(usage)
    except Exception as e:
        print(f"Usage query error (likely missing column): {e}")
        # Fallback: Create a dummy usage object if the DB is out of sync
        return {
            "requests_used": 0,
            "requests_cap": 6000,
            "tokens_used": 0,
            "plan": user.plan,
            "history": [0,0,0,0,0,0,0]
        }
    
    caps = {
        "free": 6000,
        "starter": 25000,
        "builder": 75000,
        "pro": 200000
    }

    try:
        import json
        history = json.loads(usage.daily_history)
    except:
        history = [0,0,0,0,0,0,0]

    return {
        "requests_used": usage.requests_used,
        "tokens_used": usage.tokens_used,
        "requests_cap": caps.get(user.plan, 50),
        "plan": user.plan or "free",
        "history": history
    }
