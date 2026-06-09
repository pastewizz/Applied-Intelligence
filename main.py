from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Initialize environment
load_dotenv()

from routers import user, chat, payments, admin, analytics
from routers.admin_pricing import router as pricing_router
from database import engine
from sqlalchemy import inspect, text

app = FastAPI(
    title="Applied Intelligence API",
    version="0.1.0",
    docs_url=None,
    redoc_url=None
)

DEFAULT_PLANS = [
    {"plan_name": "free",       "display_name": "Free",       "price_kes": 0,    "rpm": 10,   "tpm": 12_000,    "month_tokens": 400_000,     "max_context_tokens": 4_000,   "max_output_tokens": 500,    "features": '["400K tokens/month","10 RPM","4K context"]'},
    {"plan_name": "starter",    "display_name": "Starter",    "price_kes": 300,  "rpm": 60,   "tpm": 60_000,    "month_tokens": 30_000_000,  "max_context_tokens": 16_000,  "max_output_tokens": 4_000,  "features": '["30M tokens/month","60 RPM","16K context"]'},
    {"plan_name": "pro",        "display_name": "Pro",        "price_kes": 800,  "rpm": 120,  "tpm": 120_000,   "month_tokens": 80_000_000,  "max_context_tokens": 32_000,  "max_output_tokens": 8_000,  "features": '["80M tokens/month","120 RPM","32K context"]'},
    {"plan_name": "premium",    "display_name": "Premium",    "price_kes": 1800, "rpm": 240,  "tpm": 200_000,   "month_tokens": 120_000_000, "max_context_tokens": 64_000,  "max_output_tokens": 16_000, "features": '["120M tokens/month","240 RPM","64K context","Analytics"]'},
    {"plan_name": "max",        "display_name": "Max",        "price_kes": 3500, "rpm": 500,  "tpm": 500_000,   "month_tokens": 150_000_000, "max_context_tokens": 128_000, "max_output_tokens": 32_000, "features": '["150M tokens/month","500 RPM","128K context","Analytics","Priority"]'},
    {"plan_name": "enterprise", "display_name": "Enterprise", "price_kes": 0,    "rpm": 5000, "tpm": 5_000_000, "month_tokens": 2_000_000_000,"max_context_tokens": 128_000, "max_output_tokens": 32_000, "features": '["Custom volume","5000 RPM","128K context","Dedicated SLA"]'},
]

@app.on_event("startup")
async def startup_event():
    print("Checking database schema on startup...")
    with engine.connect() as conn:
        # Patch: Usage daily history
        try:
            conn.execute(text("SELECT daily_history FROM usage LIMIT 1"))
        except Exception:
            try:
                with engine.begin() as t:
                    t.execute(text("ALTER TABLE usage ADD COLUMN daily_history TEXT DEFAULT '[0,0,0,0,0,0,0]'"))
            except Exception as e:
                print(f"Usage patch failed: {e}")

        # Patch: API Keys hashed_key
        try:
            conn.execute(text("SELECT hashed_key FROM api_keys LIMIT 1"))
        except Exception:
            try:
                with engine.begin() as t:
                    t.execute(text("ALTER TABLE api_keys ADD COLUMN hashed_key TEXT"))
                    t.execute(text("CREATE INDEX IF NOT EXISTS idx_api_keys_hashed_key ON api_keys(hashed_key)"))
            except Exception as e:
                print(f"API Key patch failed: {e}")

        # Patch: Per-key token budget
        try:
            conn.execute(text("SELECT token_limit FROM api_keys LIMIT 1"))
        except Exception:
            try:
                with engine.begin() as t:
                    t.execute(text("ALTER TABLE api_keys ADD COLUMN token_limit INTEGER"))
                    t.execute(text("ALTER TABLE api_keys ADD COLUMN tokens_consumed INTEGER DEFAULT 0"))
            except Exception as e:
                print(f"Per-key budget patch failed: {e}")

        # Patch: request_logs telemetry columns
        request_log_columns = {
            "task_category": "VARCHAR",
            "classification_method": "VARCHAR",
            "provider": "VARCHAR",
            "model": "VARCHAR",
            "route_type": "VARCHAR",
            "prompt_tokens": "INTEGER DEFAULT 0",
            "completion_tokens": "INTEGER DEFAULT 0",
            "tokens_used": "INTEGER DEFAULT 0",
            "cost_usd": "VARCHAR",
            "latency_ms": "INTEGER",
            "embedding_latency_ms": "INTEGER",
            "routing_latency_ms": "INTEGER",
            "llm_latency_ms": "INTEGER",
            "total_latency_ms": "INTEGER",
            "cache_hit": "BOOLEAN DEFAULT FALSE",
            "status_code": "INTEGER",
            "created_at": "TIMESTAMP",
        }
        try:
            inspector = inspect(conn)
            existing_columns = {
                column["name"]
                for column in inspector.get_columns("request_logs")
            }
            for col, dtype in request_log_columns.items():
                if col not in existing_columns:
                    try:
                        with engine.begin() as t:
                            t.execute(text(f"ALTER TABLE request_logs ADD COLUMN {col} {dtype}"))
                        existing_columns.add(col)
                    except Exception as e:
                        print(f"request_logs.{col} patch failed: {e}")
        except Exception as e:
            print(f"request_logs schema check failed: {e}")

    # Seed plan_configs if empty
    try:
        from database import SessionLocal
        from models import PlanConfig
        db = SessionLocal()
        try:
            count = db.query(PlanConfig).count()
            if count == 0:
                print("Seeding plan_configs with default plans...")
                for p in DEFAULT_PLANS:
                    db.add(PlanConfig(**p))
                db.commit()
                print(f"Seeded {len(DEFAULT_PLANS)} plans.")
        finally:
            db.close()
    except Exception as e:
        print(f"Plan seed failed (table may not exist yet): {e}")

# Enable CORS for public API access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(user.router)
app.include_router(chat.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(analytics.router)
app.include_router(pricing_router)

@app.get("/")
def root():
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
    return {"message": "Konexa API is running"}

# Serve React frontend assets (Catch-all must be last)
if os.path.exists("frontend/dist"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
    @app.get("/{file_path:path}")
    def serve_static(file_path: str):
        full_path = os.path.join("frontend/dist", file_path)
        if os.path.exists(full_path) and os.path.isfile(full_path):
            return FileResponse(full_path)
        # Fallback to index.html for SPA routing
        return FileResponse("frontend/dist/index.html")
