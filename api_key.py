import secrets
import os
import hashlib
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session
from models import APIKey

# Load encryption key from environment
ENCRYPTION_KEY = os.getenv("API_ENCRYPTION_KEY")
if not ENCRYPTION_KEY:
    ENCRYPTION_KEY = b'G3_Xy8vB_mZ1hN9qLpW4rS2tU6vX8zA0cE2gI4kM6o8='

fernet = Fernet(ENCRYPTION_KEY)

def _get_hash(key: str) -> str:
    """Calculates a SHA-256 hash for fast indexed lookup."""
    return hashlib.sha256(key.encode()).hexdigest()

def generate_api_key(user_id: int, db: Session, name: str = "Default Key", token_limit: int = None) -> str:
    """
    Generates a new named API key with an optional per-key token budget.
    token_limit=None means the key inherits the user's plan-level monthly limit.
    """
    raw_key = "api_live_" + secrets.token_urlsafe(32)
    encrypted_blob = fernet.encrypt(raw_key.encode()).decode()
    fast_hash = _get_hash(raw_key)

    db_key = APIKey(
        user_id=user_id,
        key_hash=encrypted_blob,
        hashed_key=fast_hash,
        prefix="api_live_",
        name=name if name else f"Key {secrets.token_hex(2)}",
        active=True,
        token_limit=token_limit,
        tokens_consumed=0
    )
    db.add(db_key)
    db.commit()
    return raw_key

def list_user_keys(user_id: int, db: Session):
    """Returns all active keys for a user including their token budget status."""
    keys = db.query(APIKey).filter(APIKey.user_id == user_id, APIKey.active == True).all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "prefix": k.prefix + "...",
            "full_key": decrypt_api_key(k.key_hash),
            "token_limit": k.token_limit,           # None = uses plan limit
            "tokens_consumed": k.tokens_consumed or 0,
            "budget_exhausted": (
                k.token_limit is not None and
                (k.tokens_consumed or 0) >= k.token_limit
            )
        }
        for k in keys
    ]

def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypts a stored key hash back to its raw form."""
    try:
        return fernet.decrypt(encrypted_key.encode()).decode()
    except Exception:
        return None

def verify_api_key(api_key: str, db: Session):
    """
    O(1) Verification using SHA-256 hashed lookup.
    Returns the APIKey object (with .user relationship loaded) or None.
    """
    if not api_key:
        return None

    fast_hash = _get_hash(api_key)
    key_obj = db.query(APIKey).filter(
        APIKey.hashed_key == fast_hash,
        APIKey.active == True
    ).first()

    return key_obj  # Caller accesses key_obj.user for the user

def delete_specific_key(user_id: int, key_id: int, db: Session):
    """Deletes a specific key owned by the user."""
    key = db.query(APIKey).filter(APIKey.user_id == user_id, APIKey.id == key_id).first()
    if key:
        db.delete(key)
        db.commit()
        return True
    return False
