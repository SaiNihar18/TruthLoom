from google import genai
from google.genai import types

from app.config import settings
from .base import ExtractionProvider

MODEL = "gemini-3.6-flash"


class GeminiProvider(ExtractionProvider):
    name = "gemini"

    def __init__(self):
        self.client = genai.Client(api_key=settings.gemini_api_key)

    def extract(self, pdf_path: str, prompt: str) -> str:
        uploaded_file = self.client.files.upload(path=pdf_path)
        file_part = types.Part.from_uri(
            file_uri=uploaded_file.uri, mime_type=uploaded_file.mime_type
        )
        response = self.client.models.generate_content(
            model=MODEL,
            contents=[file_part, prompt],
        )
        return response.text
