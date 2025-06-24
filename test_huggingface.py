import requests

HF_TOKEN = "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"
API_URL = "https://api-inference.huggingface.co/models/google/flan-t5-small"

headers = {
    "Authorization": f"Bearer {HF_TOKEN}"
}

def test_api():
    prompt = "Translate English to French: Hello, how are you?"
    payload = {"inputs": prompt}

    print("🔁 Sending request to Hugging Face...")
    response = requests.post(API_URL, headers=headers, json=payload)

    if response.status_code == 503:
        print("⏳ Model is loading, try again in a few seconds...")
        print("Message:", response.text)
    elif response.status_code == 200:
        print("✅ API is working!")
        print("Response:", response.json())
    else:
        print("❌ API call failed. Status Code:", response.status_code)
        print("Message:", response.text)

if __name__ == "__main__":
    test_api()
