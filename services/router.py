import re
import random
from typing import List, Dict, Any

# =============================================================================
# 1. THE MODEL REGISTRY
# All inference nodes with capability and cost metadata.
# Source: deepinfra.com/pricing (scraped May 2026)
# cost_per_1m_in / cost_per_1m_out are in USD
# =============================================================================
MODEL_REGISTRY = {
    "llama-3.1-8b": {
        "provider": "deepinfra",
        "remote_name": "meta-llama/Meta-Llama-3.1-8B-Instruct",
        "cost_per_1m_in": 0.02,
        "cost_per_1m_out": 0.05,
        "reasoning_score": 5,
        "coding_score": 4,
        "speed_score": 10,
        "context_window": 128000
    },
    "llama-3.1-70b": {
        "provider": "deepinfra",
        "remote_name": "meta-llama/Meta-Llama-3.1-70B-Instruct",
        "cost_per_1m_in": 0.35,
        "cost_per_1m_out": 0.40,
        "reasoning_score": 9,
        "coding_score": 8,
        "speed_score": 7,
        "context_window": 128000
    },
    "qwen-2.5-72b": {
        "provider": "deepinfra",
        "remote_name": "Qwen/Qwen2.5-72B-Instruct",
        "cost_per_1m_in": 0.23,
        "cost_per_1m_out": 0.40,
        "reasoning_score": 8,
        "coding_score": 9,
        "speed_score": 7,
        "context_window": 128000
    },
    "gemma-2-27b": {
        "provider": "deepinfra",
        "remote_name": "google/gemma-2-27b-it",
        "cost_per_1m_in": 0.13,
        "cost_per_1m_out": 0.38,
        "reasoning_score": 7,
        "coding_score": 6,
        "speed_score": 8,
        "context_window": 8000
    },
    "mistral-nemo": {
        "provider": "deepinfra",
        "remote_name": "mistralai/Mistral-Nemo-Instruct-2407",
        "cost_per_1m_in": 0.10,
        "cost_per_1m_out": 0.30,
        "reasoning_score": 7,
        "coding_score": 6,
        "speed_score": 9,
        "context_window": 128000
    }
}

# =============================================================================
# 2. THE DYNAMIC HEALTH ENGINE (Bayesian EMA)
# Tracks real-time performance per model in memory.
# In a multi-worker production setup, migrate this to Redis.
# =============================================================================
HEALTH_METRICS: Dict[str, Dict] = {
    mid: {"latency_ema": 1.0, "success_rate": 1.0}
    for mid in MODEL_REGISTRY.keys()
}

# Sensitivity factor: Higher = faster reaction to latency changes
ALPHA = 0.3

def update_model_telemetry(model_id: str, latency_ms: float, success: bool):
    """
    Called after every request to update model health using EMA.
    This is the 'feedback loop' that makes the router self-learning.
    """
    if model_id not in HEALTH_METRICS:
        return

    latency_sec = latency_ms / 1000.0
    s = 1.0 if success else 0.0
    metric = HEALTH_METRICS[model_id]

    # EMA Formula: NewValue * Alpha + OldValue * (1 - Alpha)
    metric["latency_ema"] = (latency_sec * ALPHA) + (metric["latency_ema"] * (1 - ALPHA))
    metric["success_rate"] = (s * ALPHA) + (metric["success_rate"] * (1 - ALPHA))


# =============================================================================
# 3. TIER POLICIES (Full Multi-Model Rotation Pools)
# Each category has a deep candidate pool for true load distribution.
# The Bayesian router will select from this pool probabilistically.
# =============================================================================
TIER_POLICIES = {
    "CODE": {
        "candidates": ["qwen-2.5-72b", "llama-3.1-70b"],
        "fallback": "llama-3.1-8b"
    },
    "SUMMARY": {
        "candidates": ["gemma-2-27b", "mistral-nemo", "llama-3.1-8b"],
        "fallback": "llama-3.1-8b"
    },
    "TRANSLATE": {
        "candidates": ["llama-3.1-8b", "mistral-nemo"],
        "fallback": "llama-3.1-8b"
    },
    "GENERAL": {
        "candidates": ["qwen-2.5-72b", "llama-3.1-70b", "gemma-2-27b"],
        "fallback": "llama-3.1-8b"
    },
    "FRAUD_DETECTION": {
        "candidates": ["llama-3.1-70b", "qwen-2.5-72b"],
        "fallback": "llama-3.1-8b"
    },
    "ANALYTICS": {
        "candidates": ["qwen-2.5-72b", "llama-3.1-70b"],
        "fallback": "llama-3.1-8b"
    }
}


import httpx
import os
import json
from database import SessionLocal
from models import SemanticRoute
import math

class SemanticClassifier:
    DEEPINFRA_KEY = os.getenv("DEEPINFRA_API_KEY")

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        return dot_product / (magnitude1 * magnitude2)

    @classmethod
    async def get_embedding(cls, text: str) -> List[float]:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.deepinfra.com/v1/openai/embeddings",
                headers={"Authorization": f"Bearer {cls.DEEPINFRA_KEY}"},
                json={
                    "model": "sentence-transformers/paraphrase-MiniLM-L6-v2",
                    "input": text
                },
                timeout=30.0
            )
            if res.status_code == 200:
                return res.json()["data"][0]["embedding"]
    @classmethod
    async def llm_fallback_classify(cls, user_content: str) -> str:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.deepinfra.com/v1/openai/chat/completions",
                headers={"Authorization": f"Bearer {cls.DEEPINFRA_KEY}"},
                json={
                    "model": "meta-llama/Meta-Llama-3.1-8B-Instruct",
                    "messages": [
                        {"role": "system", "content": "Classify the following prompt into one of these categories: CODE, SUMMARY, TRANSLATE, FRAUD_DETECTION, ANALYTICS, GENERAL. Respond with ONLY the category word."},
                        {"role": "user", "content": user_content[:500]}
                    ],
                    "max_tokens": 10,
                    "temperature": 0.0
                },
                timeout=10.0
            )
            if res.status_code == 200:
                content = res.json()["choices"][0]["message"]["content"].strip().upper()
                for cat in ["CODE", "SUMMARY", "TRANSLATE", "FRAUD_DETECTION", "ANALYTICS", "GENERAL"]:
                    if cat in content:
                        return cat
        return "GENERAL"
    def fast_keyword_classify(cls, prompt: str) -> str:
        prompt = prompt.lower()
        if any(w in prompt for w in ["def ", "class ", "function", "code", "python", "javascript", "react", "html", "css", "sql", "bug", "error", "debug"]):
            return "CODE"
        if any(w in prompt for w in ["translate", "spanish", "french", "german", "swahili", "meaning of"]):
            return "TRANSLATE"
        if any(w in prompt for w in ["summarize", "tl;dr", "tldr", "shorten", "bullet points", "summary", "gist"]):
            return "SUMMARY"
        if any(w in prompt for w in ["fraud", "suspicious", "scam", "transaction", "detect", "anomaly"]):
            return "FRAUD_DETECTION"
        if any(w in prompt for w in ["analyze", "data", "csv", "json", "trends", "insights", "metrics"]):
            return "ANALYTICS"
        return "GENERAL"

    @classmethod
    async def classify(cls, messages: List[Dict[str, str]]) -> str:
        import asyncio
        user_content = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                user_content = m.get("content", "").lower()
                break

        if not user_content:
            return "GENERAL"

        # 1. Speculative Execution: Fire Embedding and LLM classification concurrently
        # This dramatically reduces latency because we don't wait for one to finish before starting the other.
        embedding_task = asyncio.create_task(cls.get_embedding(user_content))
        llm_task = asyncio.create_task(cls.llm_fallback_classify(user_content))

        emb = await embedding_task

        # If embedding failed entirely, just await LLM
        if not emb:
            return await llm_task

        # 2. Vector search in database
        db = SessionLocal()
        try:
            routes = db.query(SemanticRoute).all()
            best_score = 0.0
            best_cat = "GENERAL"
            
            for r in routes:
                try:
                    route_emb = json.loads(r.embedding_json)
                    score = cls.cosine_similarity(emb, route_emb)
                    if score > best_score:
                        best_score = score
                        best_cat = r.category
                except Exception:
                    continue
                    
            # 3. Confidence Threshold
            if best_score > 0.85:
                # We found a semantic match! We can completely ignore the LLM result.
                llm_task.cancel()
                return best_cat
            else:
                # 4. No match found. Wait for the LLM task to finish reasoning.
                llm_cat = await llm_task
                
                # 5. Autonomously build semantics! Store the new vector and LLM category.
                # Next time this is asked, it will be caught by Step 3 with 0 LLM latency.
                new_route = SemanticRoute(
                    prompt_text=user_content[:200],
                    category=llm_cat,
                    embedding_json=json.dumps(emb)
                )
                db.add(new_route)
                db.commit()
                
                return llm_cat
        finally:
            db.close()



# =============================================================================
# 5. THE BAYESIAN ROUTER
# Selects models probabilistically based on real-time health scores.
# The "Punisher" formula ensures slow/failing models drain traffic exponentially.
# =============================================================================
class Router:

    @classmethod
    def _compute_weights(cls, candidates: List[str]) -> List[float]:
        weights = []
        for mid in candidates:
            health = HEALTH_METRICS[mid]

            # POWER-LAW PUNISHER:
            # Latency penalty squared — 2x slower = 4x less traffic
            # Success rate to the 10th power — 1 failure tanks probability fast
            latency_factor = (1.0 / max(health["latency_ema"], 0.01)) ** 2
            success_factor = health["success_rate"] ** 10

            weights.append(latency_factor * success_factor)
        return weights

    @classmethod
    async def get_route(cls, messages: List[Dict[str, str]], force_category: str = None) -> Dict[str, Any]:
        if force_category:
            category = force_category
        else:
            category = await SemanticClassifier.classify(messages)
            
        policy = TIER_POLICIES.get(category, TIER_POLICIES["GENERAL"])
        candidates = policy["candidates"]
        fallback_id = policy["fallback"]

        # Bayesian Weighted Selection
        weights = cls._compute_weights(candidates)
        primary_id = random.choices(candidates, weights=weights)[0]

        primary_meta = MODEL_REGISTRY[primary_id]
        fallback_meta = MODEL_REGISTRY[fallback_id]

        return {
            "category": category,
            "primary": {
                "id": primary_id,
                "model": primary_meta["remote_name"],
                "provider": primary_meta["provider"],
                "meta": primary_meta
            },
            "fallback": {
                "id": fallback_id,
                "model": fallback_meta["remote_name"],
                "provider": fallback_meta["provider"],
                "meta": fallback_meta
            }
        }
