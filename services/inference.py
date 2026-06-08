from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import time
import httpx
import os
import json
import hashlib

from services.router import Router, update_model_telemetry

class InferenceRequest:
    def __init__(self, messages: List[Dict[str, str]], model: str, max_tokens: int = 300, temperature: float = 0.7):
        self.messages = messages
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature

class BaseProvider(ABC):
    @abstractmethod
    async def complete(self, request: InferenceRequest) -> Dict[str, Any]:
        pass

class DeepInfraProvider(BaseProvider):
    def __init__(self):
        self.api_key = os.getenv("DEEPINFRA_API_KEY")
        self.base_url = "https://api.deepinfra.com/v1/openai/chat/completions"

    async def complete(self, request: InferenceRequest) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": request.model,
            "messages": request.messages,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.base_url, headers=headers, json=payload, timeout=30.0)
            if response.status_code != 200:
                raise Exception(f"DeepInfra Error: {response.text}")
            return response.json()

    async def stream_complete(self, request: InferenceRequest):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": request.model,
            "messages": request.messages,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
            "stream": True
        }
        
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", self.base_url, headers=headers, json=payload, timeout=30.0) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    raise Exception(f"DeepInfra Error: {error_text.decode()}")
                
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            yield json.loads(data_str)
                        except:
                            pass

from services.router import Router, update_model_telemetry, SemanticClassifier
from database import SessionLocal
from models import SemanticCache

class InferenceService:
    """The central orchestration entry point."""
    def __init__(self):
        self.default_provider = DeepInfraProvider()

    def _extract_user_content(self, messages: List[Dict[str, str]]) -> str:
        for m in reversed(messages):
            if m.get("role") == "user":
                return m.get("content", "").lower()
        return ""

    async def run_completion(self, messages: List[Dict[str, str]], max_tokens: int = 300, temperature: float = 0.7, force_category: str = None) -> Dict[str, Any]:
        user_content = self._extract_user_content(messages)
        emb = []
        
        # Only compute embeddings if we are doing semantic routing (no forced category)
        if user_content and not force_category:
            emb = await SemanticClassifier.get_embedding(user_content)
        
        # Semantic Caching
        db = SessionLocal()
        try:
            if emb:
                caches = db.query(SemanticCache).all()
                for c in caches:
                    try:
                        c_emb = json.loads(c.embedding_json)
                        if SemanticClassifier.cosine_similarity(emb, c_emb) > 0.98:
                            result = json.loads(c.response_json)
                            result["cached"] = True
                            result["semantic_cache"] = True
                            result["latency_ms"] = 0
                            return result
                    except Exception:
                        pass

            # Capability-Based Routing (Semantic or Forced)
            route = await Router.get_route(messages, force_category=force_category)

            # Orchestration Logic: Attempt Primary, Fallback on failure
            start_time = time.time()
            try:
                # 1. ATTEMPT PRIMARY
                req = InferenceRequest(
                    messages=messages, 
                    model=route["primary"]["model"],
                    max_tokens=max_tokens, 
                    temperature=temperature
                )
                result = await self.default_provider.complete(req)
                
                # SUCCESS TELEMETRY
                latency = int((time.time() - start_time) * 1000)
                update_model_telemetry(route["primary"]["id"], latency, success=True)
                
                result["orchestration_meta"] = {
                    "route_type": "primary",
                    "registry_id": route["primary"]["id"],
                    "scores": route["primary"]["meta"]
                }
            except Exception as primary_error:
                # FAILURE TELEMETRY
                update_model_telemetry(route["primary"]["id"], 0, success=False)
                
                # 2. ATTEMPT FALLBACK
                print(f"Orchestration Alert: Primary {route['primary']['id']} failed. Attempting fallback...")
                try:
                    fallback_start = time.time()
                    req = InferenceRequest(
                        messages=messages, 
                        model=route["fallback"]["model"],
                        max_tokens=max_tokens, 
                        temperature=temperature
                    )
                    result = await self.default_provider.complete(req)
                    
                    # FALLBACK SUCCESS
                    latency = int((time.time() - fallback_start) * 1000)
                    update_model_telemetry(route["fallback"]["id"], latency, success=True)

                    result["orchestration_meta"] = {
                        "route_type": "fallback",
                        "registry_id": route["fallback"]["id"],
                        "scores": route["fallback"]["meta"],
                        "error": str(primary_error)
                    }
                except Exception as fallback_error:
                    # FALLBACK FAILURE
                    update_model_telemetry(route["fallback"]["id"], 0, success=False)
                    raise Exception(f"Orchestration Critical: Both primary and fallback failed. {fallback_error}")
            
            result["latency_ms"] = int((time.time() - start_time) * 1000)
            result["task_category"] = route["category"]
            result["routed_model"] = route["primary"]["model"]
            result["cached"] = False
            result["semantic_cache"] = False
            
            # Save to Semantic Cache
            if emb and len(user_content) > 10:
                try:
                    # keep cache size manageable
                    if db.query(SemanticCache).count() > 5000:
                        oldest = db.query(SemanticCache).order_by(SemanticCache.created_at.asc()).first()
                        if oldest:
                            db.delete(oldest)
                    
                    cache_entry = SemanticCache(
                        prompt_text=user_content,
                        model_used=result["routed_model"],
                        response_json=json.dumps(result),
                        embedding_json=json.dumps(emb)
                    )
                    db.add(cache_entry)
                    db.commit()
                except Exception as e:
                    db.rollback()
                    print(f"Cache save error: {e}")
                    
            return result
        finally:
            db.close()

    async def stream_completion(self, messages: List[Dict[str, str]], max_tokens: int = 300, temperature: float = 0.7, force_category: str = None):
        user_content = self._extract_user_content(messages)
        
        # Capability-Based Routing (Semantic or Forced)
        route = await Router.get_route(messages, force_category=force_category)
        
        req = InferenceRequest(
            messages=messages, 
            model=route["primary"]["model"],
            max_tokens=max_tokens, 
            temperature=temperature
        )
        
        async for chunk in self.default_provider.stream_complete(req):
            yield chunk

# Global singleton for the service
inference_service = InferenceService()
