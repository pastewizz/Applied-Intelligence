import httpx
import os
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

DEEPINFRA_URL = "https://api.deepinfra.com/v1/openai/chat/completions"
DEEPINFRA_KEY = os.getenv("DEEPINFRA_API_KEY")

async def call_deepinfra(messages: list, max_tokens: int = 300, temperature: float = 0.7):
    if not DEEPINFRA_KEY or DEEPINFRA_KEY == "sk-xxxxxxxxxxxxxxxxxxxx":
         raise HTTPException(status_code=503, detail="Service is currently undergoing maintenance. Please try again later.")
         
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                DEEPINFRA_URL,
                headers={"Authorization": f"Bearer {DEEPINFRA_KEY}"},
                json={
                    "model": "Qwen/Qwen3-235B-A22B-Instruct-2507",
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
                timeout=120.0
            )
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError:
            raise HTTPException(status_code=503, detail="Upstream provider is experiencing high latency. Please try again.")
