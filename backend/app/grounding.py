import re

import fitz


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _longest_label_segment(quote: str) -> str | None:
    """Pull out the longest non-numeric phrase from a quote.

    Some quotes are the LLM's own concatenation of several table cells that
    are separate lines in the real PDF (a label line plus number lines further
    away), so the full quote never appears as contiguous text. The label part
    usually still does, so it's a reasonable fallback anchor.
    """
    segments = [s.strip(" /") for s in re.split(r"[\d(),%]+", quote)]
    segments = [s for s in segments if len(s) >= 6]
    if not segments:
        return None
    return max(segments, key=len)


def locate_quote(pdf_path: str, page_number: int, quote: str) -> dict | None:
    """Find where a quote actually sits on a page and return its bounding box.

    The LLM proposes a page and a verbatim quote, but we don't trust that on
    its own. Only a quote we can independently find in the PDF's text layer
    counts as grounded. If only part of it can be found, we say so instead of
    pretending the whole quote matched.
    """
    doc = fitz.open(pdf_path)
    if page_number < 1 or page_number > len(doc):
        doc.close()
        return None

    page = doc[page_number - 1]

    rects = page.search_for(quote)
    partial = False
    if not rects:
        rects = page.search_for(_normalize(quote))
    if not rects:
        label = _longest_label_segment(quote)
        if label:
            rects = page.search_for(label)
            partial = bool(rects)

    doc.close()

    if not rects:
        return None

    rect = rects[0]
    return {
        "page": page_number,
        "x0": rect.x0,
        "y0": rect.y0,
        "x1": rect.x1,
        "y1": rect.y1,
        "partial": partial,
    }
