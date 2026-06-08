"""
Rate Limiting Engine
=====================
Enforces 4 hard limits per API key:
  1. RPM  - Requests Per Minute (sliding window, in-memory)
  2. TPM  - Tokens Per Minute (sliding window, in-memory)
  3. Monthly Token Budget (checked against DB, enforced in chat.py)
  4. Max Context Tokens per Request (checked before routing)

Architecture Note:
  RPM/TPM windows are stored in-memory. On Render restart, windows reset —
  this is acceptable. In a multi-worker setup, migrate to Redis.
"""
import time
from collections import defaultdict
from fastapi import HTTPException

# In-memory sliding window state per API key
_rpm_tpm_state: dict = defaultdict(lambda: {
    "requests": 0,
    "tokens": 0,
    "window_start": time.time()
})

# ─── DB-backed plan config cache ─────────────────────────────────────────────
# We cache the plan limits for 60 seconds to avoid a DB round-trip on every
# request. Admins can call bust_plan_cache() to clear it instantly.
_plan_cache: dict = {}
_plan_cache_ts: float = 0.0
_CACHE_TTL = 60.0  # seconds

# Hardcoded fallback (used if DB is unavailable)
_FALLBACK_LIMITS = {
    "free":       {"rpm": 10,   "tpm": 12_000,     "month_tokens": 400_000,    "max_context_tokens": 4_000,   "max_output_tokens": 500},
    "starter":    {"rpm": 60,   "tpm": 60_000,     "month_tokens": 30_000_000, "max_context_tokens": 16_000,  "max_output_tokens": 4_000},
    "pro":        {"rpm": 120,  "tpm": 120_000,    "month_tokens": 80_000_000, "max_context_tokens": 32_000,  "max_output_tokens": 8_000},
    "premium":    {"rpm": 240,  "tpm": 200_000,    "month_tokens": 120_000_000,"max_context_tokens": 64_000,  "max_output_tokens": 16_000},
    "max":        {"rpm": 500,  "tpm": 500_000,    "month_tokens": 150_000_000,"max_context_tokens": 128_000, "max_output_tokens": 32_000},
    "enterprise": {"rpm": 5000, "tpm": 5_000_000,  "month_tokens": 2_000_000_000,"max_context_tokens": 128_000,"max_output_tokens": 32_000},
}

def bust_plan_cache():
    """Instantly invalidates the cached plan limits (called after admin update)."""
    global _plan_cache, _plan_cache_ts
    _plan_cache = {}
    _plan_cache_ts = 0.0

def _load_plans_from_db() -> dict:
    """Loads all PlanConfig rows from the database and returns a limits dict."""
    try:
        from database import SessionLocal
        from models import PlanConfig
        db = SessionLocal()
        try:
            rows = db.query(PlanConfig).all()
            if not rows:
                return {}
            result = {}
            for r in rows:
                result[r.plan_name] = {
                    "rpm":                r.rpm,
                    "tpm":                r.tpm,
                    "month_tokens":       r.month_tokens,
                    "max_context_tokens": r.max_context_tokens,
                    "max_output_tokens":  r.max_output_tokens,
                }
            return result
        finally:
            db.close()
    except Exception as e:
        print(f"[rate_limit] Could not load plans from DB: {e}")
        return {}

def get_plan_limits(plan: str) -> dict:
    """Returns the limit config for a given plan name.
    Reads from DB (cached 60s), falls back to hardcoded if DB unavailable."""
    global _plan_cache, _plan_cache_ts
    now = time.time()
    if now - _plan_cache_ts > _CACHE_TTL:
        fresh = _load_plans_from_db()
        if fresh:
            _plan_cache = fresh
            _plan_cache_ts = now

    limits = _plan_cache if _plan_cache else _FALLBACK_LIMITS
    return limits.get(plan, limits.get("free", _FALLBACK_LIMITS["free"]))


def estimate_tokens(text: str) -> int:
    """
    Rough token estimator: 1 token ≈ 4 characters.
    Fast enough for pre-flight checks.
    """
    return max(1, len(text) // 4)

def check_rate_limit(
    user_id: str,
    max_rpm: int,
    max_tpm: int,
    requested_tokens: int
) -> bool:
    """
    Enforces RPM and TPM using a sliding 60-second window.
    Raises HTTP 429 with Retry-After header on violation.
    """
    now = time.time()
    slot = _rpm_tpm_state[user_id]

    # Reset window every 60 seconds
    window_age = now - slot["window_start"]
    if window_age > 60:
        slot["requests"] = 0
        slot["tokens"] = 0
        slot["window_start"] = now
        window_age = 0

    retry_after = max(1, int(60 - window_age))

    # RPM Check
    if slot["requests"] >= max_rpm:
        raise HTTPException(
            status_code=429,
            detail=f"RPM limit exceeded. Max {max_rpm} requests/minute.",
            headers={"Retry-After": str(retry_after), "X-RateLimit-Type": "rpm"}
        )

    # TPM Check
    if slot["tokens"] + requested_tokens > max_tpm:
        raise HTTPException(
            status_code=429,
            detail=f"TPM limit exceeded. Max {max_tpm} tokens/minute.",
            headers={"Retry-After": str(retry_after), "X-RateLimit-Type": "tpm"}
        )

    # Commit the usage
    slot["requests"] += 1
    slot["tokens"] += requested_tokens
    return True


def check_context_limit(messages: list, max_context_tokens: int) -> int:
    """
    Checks if the total input context exceeds the plan's allowed limit.
    Returns the estimated token count if within limits.
    Raises HTTP 400 if the context is too large.
    """
    full_text = " ".join(
        m.get("content", "") for m in messages
        if isinstance(m.get("content"), str)
    )
    estimated = estimate_tokens(full_text)

    if estimated > max_context_tokens:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Context too large. Your plan allows {max_context_tokens} input tokens "
                f"per request. Estimated size: {estimated} tokens. "
                f"Reduce your message history or upgrade your plan."
            ),
            headers={"X-RateLimit-Type": "context"}
        )

    return estimated


def check_monthly_budget(tokens_used: int, month_tokens_limit: int, tokens_requested: int):
    """
    Validates the user has remaining monthly token budget.
    Raises HTTP 429 if exhausted.
    """
    remaining = month_tokens_limit - tokens_used
    if remaining <= 0:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Monthly token budget exhausted. "
                f"Used {tokens_used:,} of {month_tokens_limit:,} tokens. "
                f"Upgrade your plan or wait until next month."
            ),
            headers={"X-RateLimit-Type": "monthly_budget"}
        )

    if tokens_requested > remaining:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Request would exceed monthly budget. "
                f"Remaining: {remaining:,} tokens. Requested: {tokens_requested:,} tokens."
            ),
            headers={"X-RateLimit-Type": "monthly_budget"}
        )
