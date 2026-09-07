import numpy as np
from sentence_transformers import SentenceTransformer

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def fact_text(fact: dict) -> str:
    parts = [fact.get("subject"), fact.get("predicate"), fact.get("scope"), fact.get("time_period")]
    return " | ".join(str(p) for p in parts if p)


def embed_fact(fact: dict) -> np.ndarray:
    text = fact_text(fact)
    return _get_model().encode(text, normalize_embeddings=True)
