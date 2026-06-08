import applied_intelligence as ai
import os

# 1. Replace with your actual API key from the dashboard
API_KEY = "YOUR_API_KEY_HERE"

# 2. Initialize the client
# If you are running locally, the base_url is http://localhost:8000
# Once you have a domain, update this to your production URL
client = ai.Client(
    api_key=API_KEY,
    base_url="http://localhost:8000" 
)

def main():
    print("--- Applied Intelligence Starter Kit ---")
    
    try:
        # 3. Create a chat completion
        print("\nSending request to 'frontier-model'...")
        
        response = client.chat.completions.create(
            model="frontier-model",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Write a short poem about the African savannah."}
            ]
        )
        
        # 4. Print the response
        print("\nAssistant Response:")
        print("-" * 20)
        print(response.choices[0].message.content)
        print("-" * 20)
        
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        print("Tip: Make sure your server is running and your API key is correct.")

if __name__ == "__main__":
    main()
