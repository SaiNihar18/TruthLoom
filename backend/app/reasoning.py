import json
import logging
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np

from .providers.fallback import reason_about_facts

logger = logging.getLogger(__name__)

MIN_SIMILARITY = 0.55
MAX_CANDIDATES = 3

RELATIONSHIP_RULES = """Choose exactly one relationship for each pair:
- "corroborates": both facts state the same underlying claim, even if worded
  differently, rounded differently, or phrased with different units that
  convert to the same value.
- "contradicts": the facts make incompatible claims about the same subject,
  time period, and scope, and the difference cannot be explained by time,
  scope, or units.
- "reconcilable": the facts appear to differ but can be explained by
  different time periods, scopes, units, or context, for example one is
  provisional and the other final, or one is standalone and the other
  consolidated.
- "unrelated": the facts are not meaningfully comparable even though they
  looked similar enough to compare."""

BATCH_COMPARISON_PROMPT = """You are comparing one fact from "{doc_a}" against several candidate facts
from other documents, to decide how each pair relates.

Fact A, the one being checked:
subject: {a_subject}
predicate: {a_predicate}
value: {a_value} {a_unit}
time_period: {a_time_period}
scope: {a_scope}
quote: "{a_quote}"

Candidates to compare Fact A against, one at a time:
{candidates_block}

{rules}

Return only a JSON array with one object per candidate, in the same order they were given,
no other text:
[{{"index": 0, "relationship": "one of the four options above", "explanation": "one or two sentences citing the specific values, time periods, or scopes that drove this decision"}}, ...]
"""


def _format_fact(fact: dict) -> str:
    return (
        f"subject: {fact.get('subject')}\n"
        f"predicate: {fact.get('predicate')}\n"
        f"value: {fact.get('value')} {fact.get('unit') or ''}\n"
        f"time_period: {fact.get('time_period')}\n"
        f"scope: {fact.get('scope')}\n"
        f"quote: \"{fact.get('quote')}\""
    )


def _parse_json_block(raw: str):
    cleaned = re.sub(r"^```(json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    return json.loads(cleaned)


def find_candidates(new_fact: dict, other_facts: list[dict]) -> list[dict]:
    if new_fact.get("embedding") is None:
        return []

    scored = []
    for other in other_facts:
        similarity = float(np.dot(new_fact["embedding"], other["embedding"]))
        if similarity >= MIN_SIMILARITY:
            scored.append((similarity, other))

    scored.sort(key=lambda pair: -pair[0])
    return [fact for _, fact in scored[:MAX_CANDIDATES]]


def classify_against_candidates(fact_a: dict, doc_a_name: str, candidates: list[dict]) -> list[dict]:
    """One reasoning call covering every candidate for a single fact.

    Batching candidates into one call instead of firing one call per pair
    cuts both the number of requests and the repeated instruction and
    Fact A boilerplate, which matters a lot against a free tier's per
    minute token budget.
    """
    candidates_block = "\n\n".join(
        f'Candidate {i}, from "{c.get("document_filename", "another document")}":\n{_format_fact(c)}'
        for i, c in enumerate(candidates)
    )
    prompt = BATCH_COMPARISON_PROMPT.format(
        doc_a=doc_a_name,
        a_subject=fact_a.get("subject"),
        a_predicate=fact_a.get("predicate"),
        a_value=fact_a.get("value"),
        a_unit=fact_a.get("unit") or "",
        a_time_period=fact_a.get("time_period"),
        a_scope=fact_a.get("scope"),
        a_quote=fact_a.get("quote"),
        candidates_block=candidates_block,
        rules=RELATIONSHIP_RULES,
    )
    raw_output = reason_about_facts(prompt)
    try:
        parsed = _parse_json_block(raw_output)
    except json.JSONDecodeError:
        logger.error("Batch comparison output was not valid JSON: %s", raw_output[:300])
        return [{"relationship": "unrelated", "explanation": "Could not parse model output"} for _ in candidates]

    by_index = {item.get("index"): item for item in parsed if isinstance(item, dict)}
    return [
        by_index.get(i, {"relationship": "unrelated", "explanation": "Missing from model output"})
        for i in range(len(candidates))
    ]


def classify_many_grouped(groups: list[tuple[int, dict, str, list[dict]]], max_workers: int = 4) -> list[tuple[int, int, dict]]:
    """Classify several (new_fact_id, fact_a, doc_a_name, candidates) groups concurrently.

    Each group is one reasoning call regardless of how many candidates it
    holds, and groups run in parallel across a small thread pool, modest on
    purpose since free tier reasoning providers rate limit by tokens per
    minute, not by request count, so too much concurrency just trades one
    slow path for a burst of failures.
    """
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_group = {
            executor.submit(classify_against_candidates, fact_a, doc_a_name, candidates): (
                new_fact_id,
                candidates,
            )
            for new_fact_id, fact_a, doc_a_name, candidates in groups
        }
        for future in as_completed(future_to_group):
            new_fact_id, candidates = future_to_group[future]
            try:
                classifications = future.result()
            except Exception:
                logger.exception("Batch classification failed for a fact, skipping its candidates")
                continue
            for candidate, classification in zip(candidates, classifications):
                results.append((new_fact_id, candidate["id"], classification))
    return results
