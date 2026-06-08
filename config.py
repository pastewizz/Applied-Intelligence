import os
from dotenv import load_dotenv

load_dotenv()

FIREBASE_CREDENTIALS = os.getenv("FIREBASE_PRIVATE_KEY_PATH", "serviceAccountKey.json")

# M-Pesa Configuration
MPESA_CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY")
MPESA_CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET")
MPESA_SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379")
MPESA_PASSKEY = os.getenv("MPESA_PASSKEY")
MPESA_CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL")
MPESA_ENVIRONMENT = os.getenv("MPESA_ENVIRONMENT", "sandbox")
