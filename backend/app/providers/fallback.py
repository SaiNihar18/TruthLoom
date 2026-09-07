import logging
import time

from .base import ExtractionProvider, ReasoningProvider
from .gemini_provider import GeminiProvider
from .groq_provider import GroqProvider
from .openrouter_provider import OpenRouterProvider
from .openrouter_text_provider import OpenRouterTextProvider

logger = logging.getLogger(__name__)

RETRY_DELAYS_SECONDS = [2, 8]


def _run_with_fallback(providers, call):
    last_error = None
    for provider in providers:
        for attempt, delay in enumerate([0] + RETRY_DELAYS_SECONDS):
            if delay:
                time.sleep(delay)
            try:
                return call(provider)
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "%s failed on attempt %d: %s", provider.name, attempt + 1, exc
                )
        logger.warning("Giving up on %s, moving to next provider", provider.name)
    raise RuntimeError("All providers failed") from last_error


def extract_facts(pdf_path: str, prompt: str) -> str:
    providers: list[ExtractionProvider] = [GeminiProvider(), OpenRouterProvider()]
    return _run_with_fallback(providers, lambda p: p.extract(pdf_path, prompt))


def reason_about_facts(prompt: str) -> str:
    providers: list[ReasoningProvider] = [GroqProvider(), OpenRouterTextProvider()]
    return _run_with_fallback(providers, lambda p: p.complete(prompt))
