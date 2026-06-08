import requests

class Konexa:
    def __init__(self, api_key, base_url="https://api.konexa.ke"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    def chat_completion(self, messages, model="konexa-model", max_tokens=300, temperature=0.7):
        """
        Creates a model response for the given chat conversation.
        """
        url = f"{self.base_url}/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
