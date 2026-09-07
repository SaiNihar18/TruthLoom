from openai import OpenAI

from app.config import settings
from .base import ReasoningProvider

MODEL = "nvidia/nemotron-3-super-120b-a12b:free"


class OpenRouterTextProvider(ReasoningProvider):
    """Text-only fallback for the reasoning step, used when Groq's free tier
    rate limit is hit. A separate free pool means the two rarely run out at
    the same time.
    """

    name = "openrouter-text"

    def __init__(self):
        self.client = OpenAI(
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
        )

    def complete(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        if not response.choices or not response.choices[0].message.content:
            raise ValueError("OpenRouter returned an empty response")
        return response.choices[0].message.content
