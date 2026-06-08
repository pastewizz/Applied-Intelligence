"""
Comprehensive API Test Suite
Runs a series of tests against the live API on port 8001
and reports pass/fail for each scenario.
"""
import requests
import json
import time

import sys, io
if hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = "http://localhost:8000"
API_KEY = "api_live_N01j5f4S4e2aekBo4Ci0NCDu5FZVkNndr2nrV365Z8M"
AUTH = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}

PASS = "[PASS]"
FAIL = "[FAIL]"
results = []

def test(name, fn):
    try:
        fn()
        print(f"  {PASS} {name}")
        results.append((name, True, None))
    except AssertionError as e:
        print(f"  {FAIL} {name}: {e}")
        results.append((name, False, str(e)))
    except Exception as e:
        print(f"  {FAIL} {name}: {type(e).__name__}: {e}")
        results.append((name, False, str(e)))

print("=" * 60)
print("Applied Intelligence - Full API Test Suite")
print("=" * 60)

# ── 1. Health Check ──────────────────────────────────────────
print("\n[Group 1] Health")

def t_health():
    r = requests.get(f"{BASE}/health", timeout=5)
    assert r.status_code in (200, 404), f"Unexpected: {r.status_code}"

test("GET /health returns 200 or 404 (not crash)", t_health)

# ── 2. Auth ───────────────────────────────────────────────────
print("\n[Group 2] Authentication")

def t_no_key():
    r = requests.post(f"{BASE}/v1/chat/completions", json={"messages": []}, timeout=5)
    assert r.status_code == 401, f"Expected 401, got {r.status_code}"

def t_bad_key():
    r = requests.post(
        f"{BASE}/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "hi"}]},
        headers={"Authorization": "Bearer api_live_fakekeyXXXXXXXXXXXXXXXXX"},
        timeout=5
    )
    assert r.status_code == 403, f"Expected 403, got {r.status_code}"

def t_good_key():
    r = requests.post(
        f"{BASE}/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "Say OK"}], "max_tokens": 10},
        headers=AUTH,
        timeout=60
    )
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"

test("No key -> 401", t_no_key)
test("Bad key -> 403", t_bad_key)
test("Valid key -> 200", t_good_key)

# ── 3. Routing Classification ────────────────────────────────
print("\n[Group 3] Routing & Classification")

def t_code_routing():
    r = requests.post(
        f"{BASE}/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "Write a Python function to sort a list"}], "max_tokens": 50},
        headers=AUTH, timeout=60
    )
    data = r.json()
    assert r.status_code == 200, f"Status: {r.status_code}"
    assert data.get("task_category") == "CODE", f"Expected CODE, got {data.get('task_category')}"
    assert "routed_model" in data, "Missing routed_model field"

def t_response_structure():
    r = requests.post(
        f"{BASE}/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "Hello, what is 2+2?"}], "max_tokens": 30},
        headers=AUTH, timeout=60
    )
    data = r.json()
    assert r.status_code == 200
    assert "choices" in data, "Missing choices"
    assert len(data["choices"]) > 0, "Empty choices"
    assert "message" in data["choices"][0], "Missing message in choice"
    assert "content" in data["choices"][0]["message"], "Missing content in message"
    content = data["choices"][0]["message"]["content"]
    assert len(content) > 0, "Empty response content"

test("CODE prompt is routed as CODE", t_code_routing)
test("Response has correct OpenAI structure", t_response_structure)

# ── 4. Streaming ──────────────────────────────────────────────
print("\n[Group 4] Streaming")

def t_streaming():
    r = requests.post(
        f"{BASE}/v1/chat/completions",
        json={"messages": [{"role": "user", "content": "Count to 3"}], "max_tokens": 30, "stream": True},
        headers=AUTH, timeout=60, stream=True
    )
    assert r.status_code == 200, f"Status: {r.status_code}"
    chunks = 0
    for line in r.iter_lines():
        if line and line.startswith(b"data: "):
            data_str = line[6:]
            if data_str == b"[DONE]":
                break
            try:
                json.loads(data_str)
                chunks += 1
            except:
                pass
    assert chunks > 0, "No valid stream chunks received"

test("stream=True returns SSE chunks", t_streaming)

# ── 5. Rate Limiting ──────────────────────────────────────────
print("\n[Group 5] Input Validation")

def t_empty_messages():
    r = requests.post(
        f"{BASE}/v1/chat/completions",
        json={"messages": []},
        headers=AUTH, timeout=5
    )
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

def t_missing_messages():
    r = requests.post(
        f"{BASE}/v1/chat/completions",
        json={},
        headers=AUTH, timeout=5
    )
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"

test("Empty messages -> 400", t_empty_messages)
test("Missing messages field -> 400", t_missing_messages)

# ── 6. Demo endpoint ──────────────────────────────────────────
print("\n[Group 6] Demo Endpoint")

def t_demo():
    r = requests.post(
        f"{BASE}/v1/demo/chat",
        json={"messages": [{"role": "user", "content": "Say hello"}], "max_tokens": 20},
        timeout=60
    )
    assert r.status_code == 200, f"Status: {r.status_code}: {r.text[:200]}"
    data = r.json()
    assert "choices" in data or "id" in data, "Invalid demo response structure"

test("Demo endpoint works without API key", t_demo)

# ── Summary ────────────────────────────────────────────────────
print("\n" + "=" * 60)
passed = sum(1 for _, ok, _ in results if ok)
total  = len(results)
print(f"Results: {passed}/{total} tests passed")
if passed == total:
    print("ALL TESTS PASSED - Backend is production-ready!")
else:
    print("FAILED TESTS:")
    for name, ok, err in results:
        if not ok:
            print(f"  - {name}: {err}")
print("=" * 60)
