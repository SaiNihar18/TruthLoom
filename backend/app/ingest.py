import json
import logging
import re
from datetime import datetime, timezone

from . import storage
from .extraction_prompt import FACT_EXTRACTION_PROMPT
from .grounding import locate_quote
from .providers.fallback import extract_facts

logger = logging.getLogger(__name__)


def _parse_facts_json(raw: str) -> list[dict]:
    cleaned = re.sub(r"^```(json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    return json.loads(cleaned)


def ingest_pdf(pdf_path: str, filename: str) -> dict:
    """Run a PDF through extraction and grounding and store the result.

    Returns the document id and the facts that came out of it, including
    which ones we could and couldn't verify against the PDF's text layer.
    """
    raw_output = extract_facts(pdf_path, FACT_EXTRACTION_PROMPT)

    try:
        raw_facts = _parse_facts_json(raw_output)
    except json.JSONDecodeError:
        logger.error("Model output was not valid JSON: %s", raw_output[:500])
        raise ValueError("Extraction did not return parseable JSON")

    uploaded_at = datetime.now(timezone.utc).isoformat()
    document_id = storage.insert_document(filename, uploaded_at)

    stored_facts = []
    for raw_fact in raw_facts:
        page = raw_fact.get("page")
        quote = raw_fact.get("quote", "")
        bbox = locate_quote(pdf_path, page, quote) if page and quote else None
        fact_id = storage.insert_fact(document_id, raw_fact, bbox)
        stored = dict(raw_fact)
        stored["id"] = fact_id
        stored["document_id"] = document_id
        stored["grounded"] = bbox is not None
        stored["partial_grounding"] = bool(bbox and bbox.get("partial"))
        stored["bbox"] = bbox
        stored_facts.append(stored)

    return {"document_id": document_id, "facts": stored_facts}
