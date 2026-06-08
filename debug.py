import asyncio
import json
import os
from services.inference import inference_service

# Ensure .env is loaded if needed
from dotenv import load_dotenv
load_dotenv()

async def main():
    messages = [
        {"role": "system", "content": "You are an expert developer."},
        {"role": "user", "content": "Write a quick Python script to reverse a string."}
    ]
    print(f"Using DeepInfra Key: {os.getenv('DEEPINFRA_API_KEY')[:5]}...")
    try:
        res = await inference_service.run_completion(messages)
        print(json.dumps(res, indent=2))
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
