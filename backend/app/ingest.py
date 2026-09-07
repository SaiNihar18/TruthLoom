import json
import logging
import re
from datetime import datetime, timezone

from . import storage
from .embeddings import embed_fact
from .extraction_prompt import FACT_EXTRACTION_PROMPT
from .grounding import locate_quote
from .providers.fallback import extract_facts
from .reasoning import classify_many_grouped, find_candidates

logger = logging.getLogger(__name__)


def _parse_facts_json(raw: str) -> list[dict]:
    cleaned = re.sub(r"^```(json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    return json.loads(cleaned)


def ingest_pdf(pdf_path: str, filename: str) -> tuple[dict, list[tuple]]:
    """Run a PDF through extraction and grounding and store the result.

    Returns the document id and facts right away, since that's a single
    extraction call. Candidate cross-document pairs are also returned but
    NOT classified here, that step is comparatively slow (one reasoning
    call per candidate pair) and is meant to run as a background task after
    the response to the caller has already gone out.
    """
    raw_output = extract_facts(pdf_path, FACT_EXTRACTION_PROMPT)

    try:
        raw_facts = _parse_facts_json(raw_output)
    except json.JSONDecodeError:
        logger.error("Model output was not valid JSON: %s", raw_output[:500])
        raise ValueError("Extraction did not return parseable JSON")

    uploaded_at = datetime.now(timezone.utc).isoformat()
    document_id = storage.insert_document(filename, uploaded_at)

    other_facts = storage.get_facts_from_other_documents(document_id)

    stored_facts = []
    pending_groups = []
    for raw_fact in raw_facts:
        page = raw_fact.get("page")
        quote = raw_fact.get("quote", "")
        bbox = (
            locate_quote(pdf_path, page, quote, raw_fact.get("value"), raw_fact.get("unit"))
            if page and quote
            else None
        )
        if bbox:
            # locate_quote may have resolved a printed page number to a
            # different physical page, use that corrected page everywhere
            # downstream (storage, image rendering) instead of the model's
            # raw guess.
            raw_fact = dict(raw_fact)
            raw_fact["page"] = bbox["page"]

        try:
            embedding = embed_fact(raw_fact)
        except Exception:
            logger.exception("Embedding failed for fact, skipping cross-document matching")
            embedding = None

        fact_id = storage.insert_fact(document_id, raw_fact, bbox, embedding)
        stored = dict(raw_fact)
        stored["id"] = fact_id
        stored["document_id"] = document_id
        stored["grounded"] = bbox is not None
        stored["partial_grounding"] = bool(bbox and bbox.get("partial"))
        stored["bbox"] = bbox
        stored_facts.append(stored)

        if embedding is None:
            continue

        new_fact_for_matching = dict(raw_fact)
        new_fact_for_matching["embedding"] = embedding
        candidates = find_candidates(new_fact_for_matching, other_facts)
        if candidates:
            pending_groups.append((fact_id, raw_fact, filename, candidates))

    pending_pair_count = sum(len(candidates) for _, _, _, candidates in pending_groups)
    result = {"document_id": document_id, "facts": stored_facts, "relationships_pending": pending_pair_count}
    return result, pending_groups


def process_relationships(groups: list[tuple]) -> None:
    """Classify grouped candidate sets concurrently and store the results."""
    if not groups:
        return

    classified = classify_many_grouped(groups)
    for fact_id, candidate_id, result in classified:
        relationship_type = result.get("relationship", "unrelated")
        if relationship_type == "unrelated":
            continue
        storage.insert_relationship(fact_id, candidate_id, relationship_type, result.get("explanation", ""))
