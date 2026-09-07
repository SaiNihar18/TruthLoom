import json
import sqlite3
from pathlib import Path

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
    partial_grounding INTEGER NOT NULL
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


def insert_fact(document_id: int, fact: dict, bbox: dict | None) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO facts
            (document_id, subject, predicate, value, unit, time_period, scope,
             quote, page, bbox, grounded, partial_grounding)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        ),
    )
    conn.commit()
    fact_id = cursor.lastrowid
    conn.close()
    return fact_id


def _row_to_fact(row: sqlite3.Row) -> dict:
    fact = dict(row)
    fact["bbox"] = json.loads(fact["bbox"]) if fact["bbox"] else None
    fact["grounded"] = bool(fact["grounded"])
    fact["partial_grounding"] = bool(fact["partial_grounding"])
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
