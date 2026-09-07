from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    gemini_api_key: str = ""
    groq_api_key: str = ""
    openrouter_api_key: str = ""

    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")


settings = Settings()
