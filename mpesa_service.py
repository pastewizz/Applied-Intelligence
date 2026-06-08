import requests
import base64
import time
import logging
from datetime import datetime
from config import MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_ENVIRONMENT

logger = logging.getLogger(__name__)

class MpesaService:
    def __init__(self):
        self.base_url = "https://sandbox.safaricom.co.ke" if MPESA_ENVIRONMENT == "sandbox" else "https://api.safaricom.co.ke"
        self.consumer_key = MPESA_CONSUMER_KEY
        self.consumer_secret = MPESA_CONSUMER_SECRET
        self.shortcode = MPESA_SHORTCODE
        self.passkey = MPESA_PASSKEY

        # Token cache
        self._access_token = None
        self._token_expiry = 0  # Unix timestamp when token expires

    def _get_access_token(self):
        """
        Returns a valid access token.
        If cached token exists and not expired, return it.
        Otherwise, fetch a new one and cache it.
        """
        current_time = time.time()
        # Refresh 1 minute early to avoid edge cases
        if self._access_token and current_time < self._token_expiry - 60:
            return self._access_token

        logger.info("Fetching new access token from Safaricom...")
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        response = requests.get(url, auth=(self.consumer_key, self.consumer_secret))
        response.raise_for_status()
        data = response.json()

        self._access_token = data["access_token"]
        # expires_in is in seconds (usually 3600)
        expires_in = int(data.get("expires_in", 3600))
        self._token_expiry = current_time + expires_in

        logger.info(f"Token obtained, expires at {datetime.fromtimestamp(self._token_expiry)}")
        return self._access_token

    def stk_push(self, phone: str, amount: float, account_reference: str, callback_url: str):
        access_token = self._get_access_token()  # Uses cached/refreshed token
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password_str = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(password_str.encode()).decode()

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone,
            "PartyB": self.shortcode,
            "PhoneNumber": phone,
            "CallBackURL": callback_url,
            "AccountReference": account_reference,
            "TransactionDesc": "Payment",
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()

    def query_status(self, checkout_request_id: str):
        access_token = self._get_access_token()  # Uses cached/refreshed token
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        password_str = f"{self.shortcode}{self.passkey}{timestamp}"
        password = base64.b64encode(password_str.encode()).decode()

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
