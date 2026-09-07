from abc import ABC, abstractmethod


class ExtractionProvider(ABC):
    """A provider that can read a PDF and return raw text output for a prompt."""

    name: str

    @abstractmethod
    def extract(self, pdf_path: str, prompt: str) -> str:
        raise NotImplementedError


class ReasoningProvider(ABC):
    """A provider that answers a text only prompt."""

    name: str

    @abstractmethod
    def complete(self, prompt: str) -> str:
        raise NotImplementedError
