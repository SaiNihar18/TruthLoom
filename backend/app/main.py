from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import storage
from .ingest import ingest_pdf

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="TruthLoom")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    storage.init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/documents")
async def upload_document(file: UploadFile):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")

    dest_path = UPLOAD_DIR / file.filename
    contents = await file.read()
    dest_path.write_bytes(contents)

    try:
        result = ingest_pdf(str(dest_path), file.filename)
    except ValueError as exc:
        raise HTTPException(502, str(exc)) from exc

    return result


@app.get("/documents/{document_id}/facts")
def get_document_facts(document_id: int):
    return storage.get_facts_for_document(document_id)


@app.get("/facts")
def get_all_facts():
    return storage.get_all_facts()
