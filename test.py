import requests
import json
import time

API_KEY = "api_live_N01j5f4S4e2aekBo4Ci0NCDu5FZVkNndr2nrV365Z8M"
url = "http://localhost:8001/v1/chat/completions"

payload = {
    "messages": [
        {"role": "system", "content": "You are an expert developer."},
        {"role": "user", "content": "Write a quick Python script to reverse a string."}
    ],
    "max_tokens": 150
}

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

print("Firing request to Applied Intelligence...")
start = time.time()
response = requests.post(url, json=payload, headers=headers)
end = time.time()

print(f"Status Code: {response.status_code}")
print(f"Time Taken: {round(end - start, 2)}s")

if response.status_code == 200:
    print("\n--- Response ---")
    data = response.json()
    print(f"Routed Model: {data.get('routed_model')}")
    print(f"Category: {data.get('task_category')}")
    print(f"Latency Logged: {data.get('latency_ms')}ms")
    print(f"Content: {data['choices'][0]['message']['content'][:200]}...")
else:
    print(response.text)
