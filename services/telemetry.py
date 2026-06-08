"""
Telemetry Service
=================
Tracks every measurable dimension of a single API request:
  - Per-stage latency (embedding, routing, LLM, total)
  - Token breakdown (prompt / completion / total)
  - Cost in USD (calculated from model pricing)
  - Classification method (keyword / vector / llm / semantic_cache)
  - Cache hit status

Usage:
    span = TelemetrySpan()
    span.start("embedding")
    embedding = await get_embedding(text)
    span.stop("embedding")

    span.start("llm")
    result = await provider.complete(req)
    span.stop("llm")

    span.finalize(result, model_id, route_type, category, method)
    log = span.to_request_log(user_id, status_code)
"""
import time
from typing import Optional, Dict, Any


# Cost per 1M tokens in USD for each model in our registry.
# Keep in sync with services/router.py MODEL_REGISTRY.
MODEL_COSTS: Dict[str, Dict[str, float]] = {
    "meta-llama/Meta-Llama-3.1-8B-Instruct":    {"in": 0.02,  "out": 0.05},
    "meta-llama/Meta-Llama-3.1-70B-Instruct":   {"in": 0.35,  "out": 0.40},
    "Qwen/Qwen2.5-72B-Instruct":                {"in": 0.23,  "out": 0.40},
    "google/gemma-2-27b-it":                    {"in": 0.13,  "out": 0.38},
    "mistralai/Mistral-Nemo-Instruct-2407":     {"in": 0.10,  "out": 0.30},
}


def calculate_cost(model_name: str, prompt_tokens: int, completion_tokens: int) -> str:
    """Returns cost as a fixed-precision string, e.g. '0.000182'"""
    costs = MODEL_COSTS.get(model_name, {"in": 0.0, "out": 0.0})
    cost = (prompt_tokens / 1_000_000) * costs["in"] + \
           (completion_tokens / 1_000_000) * costs["out"]
    return f"{cost:.6f}"


class TelemetrySpan:
    """
    Lightweight per-request span tracker. Not thread-safe — one per request.
    """

    def __init__(self):
        self._wall_start = time.perf_counter()
        self._stages: Dict[str, float] = {}   # stage_name -> start time
        self._durations: Dict[str, int] = {}  # stage_name -> ms elapsed

        # Filled by finalize()
        self.prompt_tokens: int = 0
        self.completion_tokens: int = 0
        self.total_tokens: int = 0
        self.cost_usd: str = "0.000000"
        self.model: str = ""
        self.provider: str = "deepinfra"
        self.route_type: str = "primary"
        self.task_category: str = "GENERAL"
        self.classification_method: str = "llm"
        self.cache_hit: bool = False

    # ── Stage timing ─────────────────────────────────────────────────────────

    def start(self, stage: str):
        self._stages[stage] = time.perf_counter()

    def stop(self, stage: str):
        if stage in self._stages:
            elapsed_ms = int((time.perf_counter() - self._stages[stage]) * 1000)
            self._durations[stage] = elapsed_ms

    def elapsed(self, stage: str) -> Optional[int]:
        return self._durations.get(stage)

    def total_ms(self) -> int:
        return int((time.perf_counter() - self._wall_start) * 1000)

    # ── Finalization ─────────────────────────────────────────────────────────

    def finalize(
        self,
        inference_result: Dict[str, Any],
        model_name: str,
        route_type: str,
        category: str,
        classification_method: str,
        cache_hit: bool = False,
    ):
        usage = inference_result.get("usage", {})
        self.prompt_tokens     = usage.get("prompt_tokens", 0)
        self.completion_tokens = usage.get("completion_tokens", 0)
        self.total_tokens      = usage.get("total_tokens", self.prompt_tokens + self.completion_tokens)
        self.cost_usd          = calculate_cost(model_name, self.prompt_tokens, self.completion_tokens)
        self.model             = model_name
        self.route_type        = route_type
        self.task_category     = category
        self.classification_method = classification_method
        self.cache_hit         = cache_hit

        meta = inference_result.get("orchestration_meta", {})
        if meta.get("route_type"):
            self.route_type = meta["route_type"]

    def summary(self) -> Dict[str, Any]:
        """Returns a dictionary suitable for logging and JSON responses."""
        return {
            "total_latency_ms":      self.total_ms(),
            "embedding_latency_ms":  self._durations.get("embedding"),
            "routing_latency_ms":    self._durations.get("routing"),
            "llm_latency_ms":        self._durations.get("llm"),
            "prompt_tokens":         self.prompt_tokens,
            "completion_tokens":     self.completion_tokens,
            "total_tokens":          self.total_tokens,
            "cost_usd":              self.cost_usd,
            "model":                 self.model,
            "route_type":            self.route_type,
            "task_category":         self.task_category,
            "classification_method": self.classification_method,
            "cache_hit":             self.cache_hit,
        }

    def to_request_log(self, user_id: int, status_code: int):
        """Returns a RequestLog ORM object ready for db.add()."""
        from models import RequestLog
        return RequestLog(
            user_id               = user_id,
            task_category         = self.task_category,
            classification_method = self.classification_method,
            provider              = self.provider,
            model                 = self.model,
            route_type            = self.route_type,
            prompt_tokens         = self.prompt_tokens,
            completion_tokens     = self.completion_tokens,
            tokens_used           = self.total_tokens,
            cost_usd              = self.cost_usd,
            embedding_latency_ms  = self._durations.get("embedding"),
            routing_latency_ms    = self._durations.get("routing"),
            llm_latency_ms        = self._durations.get("llm"),
            total_latency_ms      = self.total_ms(),
            cache_hit             = self.cache_hit,
            status_code           = status_code,
        )
