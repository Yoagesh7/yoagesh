import requests
import os
from dotenv import load_dotenv

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
API_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

def test_chat():
    payload = {
        "model": "meta/llama-3.1-8b-instruct",
        "messages": [{"role": "user", "content": "hi"}],
        "temperature": 0.7,
        "max_tokens": 512
    }
    headers = {"Authorization": f"Bearer {NVIDIA_API_KEY}"}
    try:
        print(f"Testing NVIDIA API with key starting with: {NVIDIA_API_KEY[:10]}...")
        response = requests.post(API_URL, headers=headers, json=payload, timeout=25)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_chat()
