import json
import sqlite3
from pathlib import Path

import numpy as np

DB_PATH = Path(__file__).resolve().parent.parent / "data.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    uploaded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL REFERENCES documents(id),
    subject TEXT,
    predicate TEXT,
    value TEXT,
    unit TEXT,
    time_period TEXT,
    scope TEXT,
    quote TEXT,
    page INTEGER,
    bbox TEXT,
    grounded INTEGER NOT NULL,
    partial_grounding INTEGER NOT NULL,
    embedding BLOB
);

CREATE TABLE IF NOT EXISTS relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fact_a_id INTEGER NOT NULL REFERENCES facts(id),
    fact_b_id INTEGER NOT NULL REFERENCES facts(id),
    relationship_type TEXT NOT NULL,
    explanation TEXT NOT NULL
);
"""


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def insert_document(filename: str, uploaded_at: str) -> int:
    conn = get_connection()
    cursor = conn.execute(
        "INSERT INTO documents (filename, uploaded_at) VALUES (?, ?)",
        (filename, uploaded_at),
    )
    conn.commit()
    document_id = cursor.lastrowid
    conn.close()
    return document_id


def insert_fact(document_id: int, fact: dict, bbox: dict | None, embedding: np.ndarray | None) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO facts
            (document_id, subject, predicate, value, unit, time_period, scope,
             quote, page, bbox, grounded, partial_grounding, embedding)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            document_id,
            fact.get("subject"),
            fact.get("predicate"),
            fact.get("value"),
            fact.get("unit"),
            fact.get("time_period"),
            fact.get("scope"),
            fact.get("quote"),
            fact.get("page"),
            json.dumps(bbox) if bbox else None,
            1 if bbox else 0,
            1 if bbox and bbox.get("partial") else 0,
            embedding.astype(np.float32).tobytes() if embedding is not None else None,
        ),
    )
    conn.commit()
    fact_id = cursor.lastrowid
    conn.close()
    return fact_id


def insert_relationship(fact_a_id: int, fact_b_id: int, relationship_type: str, explanation: str) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO relationships (fact_a_id, fact_b_id, relationship_type, explanation)
        VALUES (?, ?, ?, ?)
        """,
        (fact_a_id, fact_b_id, relationship_type, explanation),
    )
    conn.commit()
    relationship_id = cursor.lastrowid
    conn.close()
    return relationship_id


def _row_to_fact(row: sqlite3.Row, include_embedding: bool = False) -> dict:
    fact = dict(row)
    embedding_blob = fact.pop("embedding", None)
    fact["bbox"] = json.loads(fact["bbox"]) if fact["bbox"] else None
    fact["grounded"] = bool(fact["grounded"])
    fact["partial_grounding"] = bool(fact["partial_grounding"])
    if include_embedding:
        fact["embedding"] = (
            np.frombuffer(embedding_blob, dtype=np.float32) if embedding_blob else None
        )
    return fact


def get_facts_for_document(document_id: int) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM facts WHERE document_id = ?", (document_id,)
    ).fetchall()
    conn.close()
    return [_row_to_fact(row) for row in rows]


def get_all_facts() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM facts").fetchall()
    conn.close()
    return [_row_to_fact(row) for row in rows]


def get_facts_from_other_documents(document_id: int) -> list[dict]:
    """Facts with their embeddings, used only for candidate matching."""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT facts.*, documents.filename AS document_filename
        FROM facts JOIN documents ON facts.document_id = documents.id
        WHERE facts.document_id != ? AND facts.embedding IS NOT NULL
        """,
        (document_id,),
    ).fetchall()
    conn.close()
    return [_row_to_fact(row, include_embedding=True) for row in rows]


def get_document_filename(document_id: int) -> str:
    conn = get_connection()
    row = conn.execute(
        "SELECT filename FROM documents WHERE id = ?", (document_id,)
    ).fetchone()
    conn.close()
    return row["filename"] if row else "unknown document"


def get_relationships_for_fact(fact_id: int) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM relationships WHERE fact_a_id = ? OR fact_b_id = ?",
        (fact_id, fact_id),
    ).fetchall()

    results = []
    for row in rows:
        other_id = row["fact_b_id"] if row["fact_a_id"] == fact_id else row["fact_a_id"]
        other_row = conn.execute(
            """
            SELECT facts.*, documents.filename AS document_filename
            FROM facts JOIN documents ON facts.document_id = documents.id
            WHERE facts.id = ?
            """,
            (other_id,),
        ).fetchone()
        results.append(
            {
                "relationship_type": row["relationship_type"],
                "explanation": row["explanation"],
                "other_fact": _row_to_fact(other_row) if other_row else None,
            }
        )
    conn.close()
    return results


def get_all_documents() -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT documents.id, documents.filename, documents.uploaded_at,
               COUNT(facts.id) AS fact_count
        FROM documents LEFT JOIN facts ON facts.document_id = documents.id
        GROUP BY documents.id
        ORDER BY documents.id
        """
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]
