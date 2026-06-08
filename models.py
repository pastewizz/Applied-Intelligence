from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base, engine
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    supabase_uid = Column(String, unique=True, index=True)
    email = Column(String)
    plan = Column(String, default="free")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    api_keys = relationship("APIKey", back_populates="user")
    usage = relationship("Usage", back_populates="user")
    payments = relationship("Payment", back_populates="user")

class APIKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    key_hash = Column(String, unique=True)       # stores encrypted Fernet blob
    hashed_key = Column(String, index=True)      # stores SHA-256 for fast indexed lookup
    prefix = Column(String, index=True)          # indexed for fast filtering
    name = Column(String, default="Default Key")
    active = Column(Boolean, default=True)
    token_limit = Column(Integer, nullable=True)   # Per-key token budget (NULL = use plan limit)
    tokens_consumed = Column(Integer, default=0)   # Lifetime tokens used by this key
    user = relationship("User", back_populates="api_keys")

class Usage(Base):
    __tablename__ = "usage"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    month = Column(String)                       # e.g., "2026-05"
    requests_used = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    daily_history = Column(String, default="[0,0,0,0,0,0,0]") # Stores JSON array of last 7 days
    user = relationship("User", back_populates="usage")

class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    phone = Column(String)
    amount = Column(Integer)                     # in KSh
    plan = Column(String)
    mpesa_receipt = Column(String, unique=True)
    status = Column(String)                      # "pending", "completed", "failed"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user = relationship("User", back_populates="payments")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)                      # e.g., "GET /admin/stats"
    ip_address = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class RequestLog(Base):
    __tablename__ = "request_logs"
    id                    = Column(Integer, primary_key=True, index=True)
    user_id               = Column(Integer, ForeignKey("users.id"))
    task_category         = Column(String, index=True)    # CODE / GENERAL / FRAUD_DETECTION etc.
    classification_method = Column(String)                # "semantic_cache" / "vector" / "llm" / "keyword"
    provider              = Column(String)                # "deepinfra"
    model                 = Column(String)                # remote model name
    route_type            = Column(String)                # "primary" / "fallback"

    # ── Token breakdown ──────────────────────────────────────
    prompt_tokens         = Column(Integer, default=0)
    completion_tokens     = Column(Integer, default=0)
    tokens_used           = Column(Integer, default=0)    # total

    # ── Cost tracking (USD) ─────────────────────────────────
    cost_usd              = Column(String)                # stored as string to avoid float precision issues e.g. "0.000182"

    # ── Per-stage latency (ms) ──────────────────────────────
    embedding_latency_ms  = Column(Integer)               # time to get embedding vector
    routing_latency_ms    = Column(Integer)               # total classification + routing time
    llm_latency_ms        = Column(Integer)               # time waiting for LLM to respond
    total_latency_ms      = Column(Integer)               # end-to-end wall-clock time

    # ── Cache ────────────────────────────────────────────────
    cache_hit             = Column(Boolean, default=False) # True = semantic cache served this

    status_code           = Column(Integer)
    created_at            = Column(DateTime, default=datetime.datetime.utcnow)

class SemanticRoute(Base):
    __tablename__ = "semantic_routes"
    id = Column(Integer, primary_key=True, index=True)
    prompt_text = Column(String, index=True)
    category = Column(String, index=True)
    embedding_json = Column(String)  # JSON list of floats
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SemanticCache(Base):
    __tablename__ = "semantic_cache"
    id = Column(Integer, primary_key=True, index=True)
    prompt_text = Column(String)
    model_used = Column(String)
    response_json = Column(String)
    embedding_json = Column(String)  # JSON list of floats
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class PlanConfig(Base):
    """Live pricing/rate-limit config for each subscription tier.
    Admins edit these rows via the /admin/pricing API — no redeploy needed."""
    __tablename__ = "plan_configs"
    id                 = Column(Integer, primary_key=True, index=True)
    plan_name          = Column(String, unique=True, index=True)   # e.g. "starter"
    display_name       = Column(String, default="")                # e.g. "Starter"
    price_kes          = Column(Integer, default=0)                # monthly price in KSh
    rpm                = Column(Integer, default=10)               # requests per minute
    tpm                = Column(Integer, default=10000)            # tokens per minute
    month_tokens       = Column(Integer, default=400000)           # monthly token budget
    max_context_tokens = Column(Integer, default=4000)             # max input tokens/req
    max_output_tokens  = Column(Integer, default=500)              # max output tokens/req
    features           = Column(String, default="[]")              # JSON list of feature strings
    updated_at         = Column(DateTime, default=datetime.datetime.utcnow,
                                onupdate=datetime.datetime.utcnow)

# Safe table creation: If Postgres is down, we don't want the whole app to crash
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not initialize primary database ({e}). Falling back to local mode.")
