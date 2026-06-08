"""
Admin Pricing Router
=====================
Allows authorized admins to view and update plan tier configurations
(pricing, RPM, TPM, token budgets) without redeploying the backend.

All endpoints are protected: the requesting Supabase user must have
plan == 'admin' OR be listed in ADMIN_EMAILS env variable.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, PlanConfig
from auth import get_current_user
import os

router = APIRouter(prefix="/admin/pricing", tags=["Admin Pricing"])

ADMIN_EMAILS = set(os.getenv("ADMIN_EMAILS", "").split(","))

def require_admin(user: User = Depends(get_current_user)):
    if user.plan != "admin" and user.email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _plan_to_dict(p: PlanConfig) -> dict:
    return {
        "id": p.id,
        "plan_name": p.plan_name,
        "price_kes": p.price_kes,
        "rpm": p.rpm,
        "tpm": p.tpm,
        "month_tokens": p.month_tokens,
        "max_context_tokens": p.max_context_tokens,
        "max_output_tokens": p.max_output_tokens,
        "display_name": p.display_name,
        "features": p.features,
    }


@router.get("")
def list_plans(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Return all plan configs sorted by price."""
    plans = db.query(PlanConfig).order_by(PlanConfig.price_kes.asc()).all()
    return [_plan_to_dict(p) for p in plans]


@router.get("/public")
def list_plans_public(db: Session = Depends(get_db)):
    """Public endpoint — returns display info only (no internal limits)."""
    plans = db.query(PlanConfig).order_by(PlanConfig.price_kes.asc()).all()
    return [
        {
            "plan_name": p.plan_name,
            "display_name": p.display_name,
            "price_kes": p.price_kes,
            "features": p.features,
        }
        for p in plans
    ]


@router.put("/{plan_name}")
def update_plan(
    plan_name: str,
    body: dict,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Update any field on a plan config. Creates the plan if it doesn't exist."""
    plan = db.query(PlanConfig).filter(PlanConfig.plan_name == plan_name).first()
    if not plan:
        plan = PlanConfig(plan_name=plan_name)
        db.add(plan)

    allowed = {
        "price_kes", "rpm", "tpm", "month_tokens",
        "max_context_tokens", "max_output_tokens",
        "display_name", "features",
    }
    for key, val in body.items():
        if key in allowed:
            setattr(plan, key, val)

    db.commit()
    db.refresh(plan)

    # Bust the in-memory cache so new limits apply immediately
    from rate_limit import bust_plan_cache
    bust_plan_cache()

    return {"status": "updated", "plan": _plan_to_dict(plan)}


@router.delete("/{plan_name}")
def delete_plan(
    plan_name: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    plan = db.query(PlanConfig).filter(PlanConfig.plan_name == plan_name).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    db.delete(plan)
    db.commit()
    from rate_limit import bust_plan_cache
    bust_plan_cache()
    return {"status": "deleted"}
