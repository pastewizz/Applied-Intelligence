from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from database import get_db
from models import User, Payment
from auth import get_current_user
from mpesa_service import MpesaService
import ipaddress

router = APIRouter()
mpesa = MpesaService()

TRUSTED_CIDRS = ["196.201.214.0/24", "197.248.0.0/16", "197.254.0.0/16"]

def validate_mpesa_ip(ip: str) -> bool:
    client_ip = ipaddress.ip_address(ip)
    for cidr in TRUSTED_CIDRS:
        if client_ip in ipaddress.ip_network(cidr):
            return True
    return False

@router.post("/payments/stk-push")
async def pay_mpesa(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    body = await request.json()
    phone = body.get("phone")
    plan = body.get("plan")
    
    amounts = {"starter": 300, "builder": 700, "pro": 1500}
    amount = amounts.get(plan.lower())
    
    if not amount:
        raise HTTPException(status_code=400, detail="Invalid plan")
        
    try:
        from config import MPESA_CALLBACK_URL
        res = mpesa.stk_push(phone, amount, plan, MPESA_CALLBACK_URL)
        if res.get("ResponseCode") == "0":
            payment = Payment(
                user_id=user.id, 
                phone=phone, 
                amount=amount, 
                plan=plan, 
                status="pending",
                mpesa_receipt=res.get("CheckoutRequestID")
            )
            db.add(payment)
            db.commit()
            return {"message": "STK Push sent", "checkout_id": res.get("CheckoutRequestID")}
        return {"error": res.get("CustomerMessage", "Failed to trigger M-Pesa")}
    except Exception as e:
        return {"error": str(e)}

@router.post("/payments/callback")
async def mpesa_callback(request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "unknown"
    if not validate_mpesa_ip(client_ip):
         pass

    data = await request.json()
    stk_callback = data.get("Body", {}).get("stkCallback", {})
    result_code = stk_callback.get("ResultCode")
    checkout_id = stk_callback.get("CheckoutRequestID")
    
    if result_code == 0:
        metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])
        receipt = next((item.get("Value") for item in metadata if item.get("Name") == "MpesaReceiptNumber"), None)
        
        payment = db.query(Payment).filter(Payment.mpesa_receipt == checkout_id).first()
        if payment:
            payment.status = "completed"
            payment.mpesa_receipt = receipt
            user = db.query(User).filter(User.id == payment.user_id).first()
            user.plan = payment.plan.lower()
            db.commit()
    return {"ResultCode": 0, "ResultDesc": "Accepted"}

@router.get("/payments/{payment_id}/receipt")
def get_payment_receipt(payment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payment = db.query(Payment).filter(Payment.id == payment_id, Payment.user_id == user.id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    html_content = f"""
    <html>
        <body style="font-family: sans-serif; padding: 40px; color: #333;">
            <div style="max-width: 600px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 10px;">
                <h1 style="color: #000;">Konexa Receipt</h1>
                <hr>
                <p><strong>Transaction ID:</strong> {{payment.mpesa_receipt}}</p>
                <p><strong>Date:</strong> {{payment.created_at.strftime('%Y-%m-%d %H:%M:%S')}}</p>
                <p><strong>Customer:</strong> {{user.email}}</p>
                <p><strong>Plan:</strong> {{payment.plan.capitalize()}}</p>
                <p><strong>Amount:</strong> KSh {{payment.amount}}</p>
                <hr>
                <p style="text-align: center; color: #888;">Thank you for building with Konexa.</p>
            </div>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)
