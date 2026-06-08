from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

import urllib.parse

def get_engine():
    try:
        if DATABASE_URL.startswith("sqlite") or "[PROJECT_ID]" in DATABASE_URL:
            return create_engine("sqlite:///./app.db", connect_args={"check_same_thread": False})
        
        # Auto-encode password for Postgres to handle characters like '?' or '@'
        if "postgresql://" in DATABASE_URL:
            prefix, rest = DATABASE_URL.split("://", 1)
            user_pass, host_port_db = rest.split("@", 1)
            if ":" in user_pass:
                user, password = user_pass.split(":", 1)
                safe_password = urllib.parse.quote_plus(password)
                encoded_url = f"{prefix}://{user}:{safe_password}@{host_port_db}"
                return create_engine(encoded_url, pool_pre_ping=True, pool_recycle=300)
        
        return create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
    except Exception:
        return create_engine("sqlite:///./app.db", connect_args={"check_same_thread": False})

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
