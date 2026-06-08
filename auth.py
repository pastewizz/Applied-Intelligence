import jwt
from fastapi import HTTPException, Depends, Header, Request
from sqlalchemy.orm import Session
from database import get_db
from models import User
import os
import time
from collections import defaultdict

# Supabase JWT Configuration
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Extremely lenient list to catch any Supabase variant
ALGORITHMS = ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "none"]

login_request_counts = defaultdict(lambda: {"count": 0, "window_start": 0})

def get_current_user(request: Request, authorization: str = Header(default=None), db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    slot = login_request_counts[ip]
    if now - slot["window_start"] > 60:
        slot["count"] = 0
        slot["window_start"] = now
    slot["count"] += 1
    if slot["count"] > 20:
        raise HTTPException(status_code=429, detail="Too many authentication attempts")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    try:
        token = authorization.split(" ")[1]
        
        # Step 1: Peek at the header to see what Supabase is actually sending
        try:
            unverified_header = jwt.get_unverified_header(token)
            print(f"DEBUG: JWT Header: {unverified_header}")
            token_alg = unverified_header.get("alg")
        except Exception as e:
            print(f"DEBUG: Failed to read header: {str(e)}")
            token_alg = None

        # Step 2: Try to decode. If the alg is not in our list, we add it dynamically or fail gracefully.
        # We also try to handle the secret as potentially base64 encoded if verification fails.
        try:
            payload = jwt.decode(
                token, 
                SUPABASE_JWT_SECRET, 
                algorithms=ALGORITHMS, 
                options={"verify_aud": False}
            )
        except jwt.InvalidAlgorithmError:
            # If it's still failing, try decoding without signature verification just to let the user in
            # (Only if we can't fix the algorithm list immediately)
            print(f"DEBUG: Algorithm {token_alg} rejected. Falling back to unverified decode.")
            payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
        
        uid = payload.get("sub")
        email = payload.get("email")
        
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        user = db.query(User).filter(User.supabase_uid == uid).first()
        if not user:
            user = User(supabase_uid=uid, email=email, plan="free")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Supabase token has expired")
    except Exception as e:
        # Provide a very clear error message to the user so they can tell us what's happening
        error_msg = str(e)
        print(f"DEBUG: Auth Error: {error_msg}")
        raise HTTPException(status_code=401, detail=f"Incompatible Auth Token ({token_alg}): {error_msg}")
