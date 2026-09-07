import base64

import fitz
from openai import OpenAI

from app.config import settings
from .base import ExtractionProvider

MODEL = "google/gemma-4-31b-it:free"
MAX_PAGES = 20


class OpenRouterProvider(ExtractionProvider):
    """Vision fallback for when Gemini is unavailable or rate limited.

    Gemini accepts a PDF directly, but this model needs page images instead,
    so we render pages ourselves before sending them.
    """

    name = "openrouter"

    def __init__(self):
        self.client = OpenAI(
            api_key=settings.openrouter_api_key,
            base_url="https://openrouter.ai/api/v1",
        )

    def extract(self, pdf_path: str, prompt: str) -> str:
        content = [{"type": "text", "text": prompt}]
        doc = fitz.open(pdf_path)
        for page in doc[:MAX_PAGES]:
            pixmap = page.get_pixmap(dpi=150)
            image_b64 = base64.b64encode(pixmap.tobytes("png")).decode("ascii")
            content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                }
            )
        doc.close()

        response = self.client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": content}],
        )
        return response.choices[0].message.content
