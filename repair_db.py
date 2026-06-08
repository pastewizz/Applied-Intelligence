from sqlalchemy import text
from database import engine

def patch_database():
    print("Checking database schema...")
    with engine.connect() as conn:
        try:
            # Try to query the column to see if it exists
            conn.execute(text("SELECT daily_history FROM usage LIMIT 1"))
            print("Column 'daily_history' already exists.")
        except Exception:
            print("Column 'daily_history' missing. Patching...")
            try:
                # Add the column. SQLite and Postgres both support this syntax.
                # Use a raw connection to avoid transaction issues in some environments
                with engine.begin() as transaction:
                    transaction.execute(text("ALTER TABLE usage ADD COLUMN daily_history TEXT DEFAULT '[0,0,0,0,0,0,0]'"))
                print("Database patched successfully!")
            except Exception as e:
                print(f"Error patching database: {e}")

if __name__ == "__main__":
    patch_database()
