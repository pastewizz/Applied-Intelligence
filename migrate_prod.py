"""
Production Database Migration Script
=====================================
Adds missing columns to request_logs, api_keys, and creates missing tables
in the Supabase PostgreSQL database.

Run with: venv\Scripts\python.exe migrate_prod.py
"""
import sys
# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from database import engine
from sqlalchemy import text, inspect

def column_exists(conn, table, column):
    result = conn.execute(text(
        f"SELECT column_name FROM information_schema.columns "
        f"WHERE table_name='{table}' AND column_name='{column}'"
    ))
    return result.fetchone() is not None

def table_exists(conn, table):
    result = conn.execute(text(
        f"SELECT table_name FROM information_schema.tables "
        f"WHERE table_name='{table}'"
    ))
    return result.fetchone() is not None

def run_migration():
    print("=" * 60)
    print("Applied Intelligence -- Production DB Migration")
    print("=" * 60)
    
    with engine.connect() as conn:
        # -- request_logs columns -----------------------------------------------
        print("\n[1/5] Checking request_logs table...")
        if not table_exists(conn, "request_logs"):
            conn.execute(text("""
                CREATE TABLE request_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    task_category VARCHAR,
                    provider VARCHAR,
                    model VARCHAR,
                    latency_ms INTEGER,
                    tokens_used INTEGER,
                    status_code INTEGER,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("  [+] Created request_logs table")
        else:
            for col, dtype in [
                ("task_category", "VARCHAR"),
                ("provider",      "VARCHAR"),
                ("model",         "VARCHAR"),
                ("latency_ms",    "INTEGER"),
                ("tokens_used",   "INTEGER"),
                ("status_code",   "INTEGER"),
                ("created_at",    "TIMESTAMP DEFAULT NOW()"),
            ]:
                if not column_exists(conn, "request_logs", col):
                    conn.execute(text(f"ALTER TABLE request_logs ADD COLUMN {col} {dtype}"))
                    conn.commit()
                    print(f"  [+] Added column: request_logs.{col}")
                else:
                    print(f"  [OK] Exists: request_logs.{col}")

        # -- api_keys columns ---------------------------------------------------
        print("\n[2/5] Checking api_keys table...")
        for col, dtype in [
            ("name",             "VARCHAR DEFAULT 'Default Key'"),
            ("token_limit",      "INTEGER"),
            ("tokens_consumed",  "INTEGER DEFAULT 0"),
        ]:
            if not column_exists(conn, "api_keys", col):
                conn.execute(text(f"ALTER TABLE api_keys ADD COLUMN {col} {dtype}"))
                conn.commit()
                print(f"  [+] Added column: api_keys.{col}")
            else:
                print(f"  [OK] Exists: api_keys.{col}")

        # -- semantic_routes table ----------------------------------------------
        print("\n[3/5] Checking semantic_routes table...")
        if not table_exists(conn, "semantic_routes"):
            conn.execute(text("""
                CREATE TABLE semantic_routes (
                    id SERIAL PRIMARY KEY,
                    prompt_text VARCHAR,
                    category VARCHAR,
                    embedding_json TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("  [+] Created semantic_routes table")
        else:
            print("  [OK] Table exists")

        # -- semantic_cache table -----------------------------------------------
        print("\n[4/5] Checking semantic_cache table...")
        if not table_exists(conn, "semantic_cache"):
            conn.execute(text("""
                CREATE TABLE semantic_cache (
                    id SERIAL PRIMARY KEY,
                    prompt_text VARCHAR,
                    model_used VARCHAR,
                    response_json TEXT,
                    embedding_json TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("  [+] Created semantic_cache table")
        else:
            print("  [OK] Table exists")

        # -- hashed_key column on api_keys -------------------------------------
        print("\n[5/5] Checking api_keys.hashed_key index column...")
        if not column_exists(conn, "api_keys", "hashed_key"):
            conn.execute(text("ALTER TABLE api_keys ADD COLUMN hashed_key VARCHAR"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_api_keys_hashed_key ON api_keys(hashed_key)"))
            conn.commit()
            print("  [+] Added hashed_key column and index")
        else:
            print("  [OK] Exists: api_keys.hashed_key")

    print("\n" + "=" * 60)
    print("DONE: Migration complete! Production database is up to date.")
    print("=" * 60)

if __name__ == "__main__":
    run_migration()
