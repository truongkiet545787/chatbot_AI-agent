from openai import OpenAI

class OpenAIClient:
    def __init__(self, api_key):
        # Thiết lập base_url của OpenRouter để chuyển hướng API
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key
        )
        
    def chat(self, messages):
        # Gọi model free tự động trên OpenRouter
        completion = self.client.chat.completions.create(
            model="openrouter/free",
            messages=messages
        )
        return completion.choices[0].message.content
