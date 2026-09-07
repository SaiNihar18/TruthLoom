from groq import Groq

from app.config import settings
from .base import ReasoningProvider

MODEL = "openai/gpt-oss-20b"


class GroqProvider(ReasoningProvider):
    name = "groq"

    def __init__(self):
        self.client = Groq(api_key=settings.groq_api_key)

    def complete(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        if not response.choices or not response.choices[0].message.content:
            raise ValueError("Groq returned an empty response")
        return response.choices[0].message.content
