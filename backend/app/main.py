import logging
from pathlib import Path

import fitz
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from . import storage
from .ingest import ingest_pdf, process_relationships

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

PAGE_IMAGE_DPI = 150

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


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # An exception that reaches here would otherwise be handled by
    # Starlette's outermost error middleware, which sits outside
    # CORSMiddleware and so returns a response with no CORS headers at all.
    # Browsers report that as a CORS failure, hiding the real error. Handling
    # it here keeps the response inside the normal middleware stack so the
    # browser actually sees the error instead of a misleading CORS message.
    logger.exception("Unhandled error while processing %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error, check the server log."})


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/documents")
def upload_document(file: UploadFile, background_tasks: BackgroundTasks):
    # Plain def, not async def: extraction and comparison calls are blocking
    # network I/O, and FastAPI runs sync path functions in a worker thread
    # instead of the main event loop, so a slow upload doesn't freeze every
    # other request.
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")

    dest_path = UPLOAD_DIR / file.filename
    contents = file.file.read()
    dest_path.write_bytes(contents)

    try:
        result, pending_groups = ingest_pdf(str(dest_path), file.filename)
    except ValueError as exc:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(502, str(exc)) from exc
    except RuntimeError as exc:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            503,
            "Extraction failed because all configured LLM providers are currently rate "
            "limited or have hit their usage quota. This is a free tier limit, not a bug, "
            "wait a bit and try again.",
        ) from exc

    # Facts come back immediately. Cross-document relationship classification
    # runs after the response is sent, since each fact's candidates need
    # their own reasoning call and shouldn't hold up showing the extracted
    # facts.
    background_tasks.add_task(process_relationships, pending_groups)

    return result


@app.get("/documents")
def list_documents():
    return storage.get_all_documents()


@app.get("/documents/{document_id}/facts")
def get_document_facts(document_id: int):
    return storage.get_facts_for_document(document_id)


@app.get("/documents/{document_id}/download")
def download_document(document_id: int):
    filename = storage.get_document_filename(document_id)
    pdf_path = UPLOAD_DIR / filename
    if not pdf_path.exists():
        raise HTTPException(404, "Source PDF is no longer available on the server")
    return FileResponse(pdf_path, media_type="application/pdf", filename=filename)


@app.delete("/documents/{document_id}")
def delete_document(document_id: int):
    filename = storage.delete_document(document_id)
    if filename is None:
        raise HTTPException(404, "Document not found")
    (UPLOAD_DIR / filename).unlink(missing_ok=True)
    return {"deleted": True, "document_id": document_id}


@app.get("/facts")
def get_all_facts():
    return storage.get_all_facts()


@app.get("/facts/{fact_id}/relationships")
def get_fact_relationships(fact_id: int):
    return storage.get_relationships_for_fact(fact_id)


@app.get("/relationships")
def list_relationships():
    return storage.get_all_relationships()


def _open_document_pdf(document_id: int, page_number: int) -> tuple[fitz.Document, fitz.Page]:
    filename = storage.get_document_filename(document_id)
    pdf_path = UPLOAD_DIR / filename
    if not pdf_path.exists():
        raise HTTPException(404, "Source PDF is no longer available on the server")

    doc = fitz.open(str(pdf_path))
    if page_number < 1 or page_number > len(doc):
        doc.close()
        raise HTTPException(404, "Page out of range for this document")
    return doc, doc[page_number - 1]


@app.get("/documents/{document_id}/pages/{page_number}/meta")
def get_page_meta(document_id: int, page_number: int):
    doc, page = _open_document_pdf(document_id, page_number)
    rect = page.rect
    doc.close()
    return {
        "width_points": rect.width,
        "height_points": rect.height,
        "dpi": PAGE_IMAGE_DPI,
        "scale": PAGE_IMAGE_DPI / 72,
    }


@app.get("/documents/{document_id}/pages/{page_number}/image")
def get_page_image(document_id: int, page_number: int):
    doc, page = _open_document_pdf(document_id, page_number)
    pixmap = page.get_pixmap(dpi=PAGE_IMAGE_DPI)
    png_bytes = pixmap.tobytes("png")
    doc.close()
    return Response(content=png_bytes, media_type="image/png")
