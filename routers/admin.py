from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, Usage, Payment, AuditLog, APIKey, RequestLog
from auth import get_current_user
from state import system_health
import os
import time
import datetime
from collections import defaultdict

router = APIRouter()

def log_admin_event(db: Session, admin_id: int, action: str, ip: str):
    log = AuditLog(admin_id=admin_id, action=action, ip_address=ip)
    db.add(log)
    db.commit()

admin_request_counts = defaultdict(lambda: {"count": 0, "window_start": 0})

def check_admin(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    slot = admin_request_counts[ip]
    if now - slot["window_start"] > 60:
        slot["count"] = 0
        slot["window_start"] = now
    slot["count"] += 1
    if slot["count"] > 10:
        raise HTTPException(status_code=429, detail="Too many admin requests")

    admin_email = os.getenv("ADMIN_EMAIL", "admin@konexa.ke")
    admin_secret = os.getenv("ADMIN_SECRET")
    request_secret = request.headers.get("X-Admin-Secret")

    print(f"DEBUG Admin Check: User Email={user.email}, Required Email={admin_email}")
    print(f"DEBUG Admin Check: Secret Match={request_secret == admin_secret}")

    if user.email != admin_email or not admin_secret or request_secret != admin_secret:
        log_admin_event(db, user.id, f"UNAUTHORIZED_ACCESS_ATTEMPT: {request.url.path}", ip)
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user

@router.get("/admin/stats")
def get_admin_stats(request: Request, admin: User = Depends(check_admin), db: Session = Depends(get_db)):
    log_admin_event(db, admin.id, "VIEW_STATS", request.client.host)
    total_users = db.query(User).count()
    total_requests = db.query(func.sum(Usage.requests_used)).scalar() or 0
    total_revenue = db.query(func.sum(Payment.amount)).filter(Payment.status == "completed").scalar() or 0
    
    return {
        "total_users": total_users,
        "total_requests": total_requests,
        "total_revenue": total_revenue
    }

@router.get("/admin/users")
def get_admin_users(request: Request, admin: User = Depends(check_admin), db: Session = Depends(get_db)):
    log_admin_event(db, admin.id, "VIEW_USERS", request.client.host)
    users = db.query(User).all()
    result = []
    for u in users:
        month = datetime.datetime.now().strftime("%Y-%m")
        usage = db.query(Usage).filter(Usage.user_id == u.id, Usage.month == month).first()
        result.append({
            "id": u.id,
            "email": u.email,
            "plan": u.plan,
            "created_at": u.created_at,
            "requests_used": usage.requests_used if usage else 0
        })
    return result

@router.post("/admin/users/{user_id}/toggle-active")
def toggle_user_active(user_id: int, request: Request, admin: User = Depends(check_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    keys = db.query(APIKey).filter(APIKey.user_id == user.id).all()
    target_state = not keys[0].active if keys else False
    for k in keys:
        k.active = target_state
    
    action = "DEACTIVATE_USER" if not target_state else "ACTIVATE_USER"
    log_admin_event(db, admin.id, f"{action}: {user.email}", request.client.host)
    db.commit()
    return {"status": "success", "is_active": target_state}

@router.get("/admin/payments")
def get_admin_payments(request: Request, admin: User = Depends(check_admin), db: Session = Depends(get_db)):
    log_admin_event(db, admin.id, "VIEW_PAYMENTS", request.client.host)
    payments = db.query(Payment).order_by(Payment.created_at.desc()).all()
    return payments

@router.get("/admin/logs")
def get_admin_logs(request: Request, admin: User = Depends(check_admin), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    result = []
    for l in logs:
        u = db.query(User).filter(User.id == l.admin_id).first()
        result.append({
            "email": u.email if u else "Unknown",
            "action": l.action,
            "ip": l.ip_address,
            "time": l.timestamp
        })
    return result

@router.get("/admin/health")
def get_admin_health(admin: User = Depends(check_admin)):
    return system_health

@router.get("/admin/orchestration/stats")
def get_orchestration_stats(request: Request, admin: User = Depends(check_admin), db: Session = Depends(get_db)):
    """Provides deep insights into routing and performance."""
    log_admin_event(db, admin.id, "VIEW_ORCHESTRATION", request.client.host)
    
    # Task Category distribution
    task_stats = db.query(
        RequestLog.task_category, 
        func.count(RequestLog.id),
        func.avg(RequestLog.latency_ms)
    ).group_by(RequestLog.task_category).all()
    
    # Provider performance
    provider_stats = db.query(
        RequestLog.provider,
        func.avg(RequestLog.latency_ms),
        func.count(RequestLog.id)
    ).group_by(RequestLog.provider).all()

    # Recent request history for the stream
    recent_logs = db.query(RequestLog).order_by(RequestLog.created_at.desc()).limit(50).all()
    
    return {
        "categories": [
            {"name": t[0], "count": t[1], "avg_latency": round(t[2], 2) if t[2] else 0} 
            for t in task_stats
        ],
        "providers": [
            {"name": p[0], "avg_latency": round(p[1], 2) if p[1] else 0, "count": p[2]} 
            for p in provider_stats
        ],
        "recent": recent_logs
    }
