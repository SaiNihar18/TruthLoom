import re

import fitz

_printed_page_cache: dict[str, dict[int, int]] = {}


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


def _build_printed_page_index(pdf_path: str) -> dict[int, int]:
    """Map a page number as printed in the document to its physical position.

    The starter datasets are curated excerpts that splice together
    non-contiguous ranges of a much longer original report (see each
    dataset's README), so a page printed as "44" in the source report can
    sit anywhere in this file. Gemini reads and reports the printed number,
    since that's what a human would cite, but our own page lookups need the
    physical index. This scans each page once for a lone small number near
    the top or bottom, the usual spot for a page header or footer.
    """
    if pdf_path in _printed_page_cache:
        return _printed_page_cache[pdf_path]

    index: dict[int, int] = {}
    doc = fitz.open(pdf_path)
    for physical_index, page in enumerate(doc):
        lines = [line.strip() for line in page.get_text().split("\n") if line.strip()]
        edge_lines = lines[:3] + lines[-3:]
        candidates = {int(line) for line in edge_lines if line.isdigit() and 1 <= int(line) <= 2000}
        if len(candidates) == 1:
            printed_number = candidates.pop()
            index.setdefault(printed_number, physical_index)
    doc.close()

    _printed_page_cache[pdf_path] = index
    return index


def _union_rect(rects) -> fitz.Rect:
    """Combine several rects into one bounding box.

    A distinctive multi-word search string that wraps across a line break
    comes back from search_for as several word-level rects for that single
    occurrence, not several separate matches, so the right box to highlight
    is their union, not just the first fragment.
    """
    x0 = min(r.x0 for r in rects)
    y0 = min(r.y0 for r in rects)
    x1 = max(r.x1 for r in rects)
    y1 = max(r.y1 for r in rects)
    return fitz.Rect(x0, y0, x1, y1)


def _locate_on_physical_page(
    doc: fitz.Document, physical_index: int, quote: str, value: str | None = None, unit: str | None = None
) -> dict | None:
    if physical_index < 0 or physical_index >= len(doc):
        return None

    page = doc[physical_index]
    partial = False

    rects = page.search_for(quote)
    if not rects:
        rects = page.search_for(_normalize(quote))
    if not rects:
        label = _longest_label_segment(quote)
        if label:
            rects = page.search_for(label)
            partial = bool(rects)

    if rects:
        # These are all long, distinctive strings, so several rects mean
        # fragments of one match, safe to merge into a single box.
        rect = _union_rect(rects)
    elif value:
        # Last resort: the value itself, when the surrounding sentence has
        # been paraphrased enough that nothing else matches. Unlike the
        # tiers above, a bare number can genuinely appear at several
        # unrelated spots on a dense page, so this only takes the first
        # occurrence rather than merging, and stays the weakest anchor.
        value_rects = page.search_for(f"{value} {unit}") if unit else []
        if not value_rects:
            value_rects = page.search_for(str(value))
        if not value_rects:
            return None
        rect = value_rects[0]
        partial = True
    else:
        return None

    return {
        "page": physical_index + 1,
        "x0": rect.x0,
        "y0": rect.y0,
        "x1": rect.x1,
        "y1": rect.y1,
        "partial": partial,
    }


def locate_quote(
    pdf_path: str, page_number: int, quote: str, value: str | None = None, unit: str | None = None
) -> dict | None:
    """Find where a quote actually sits on a page and return its bounding box.

    The LLM proposes a page and a verbatim quote, but we don't trust that on
    its own. Only a quote we can independently find in the PDF's text layer
    counts as grounded. If only part of it can be found, we say so instead of
    pretending the whole quote matched.

    The reported page number is tried first as a direct physical index (true
    for documents retained in full, like the earnings deck), then as a
    printed page number resolved through the excerpt's own header/footer
    numbering if that lookup fails.
    """
    doc = fitz.open(pdf_path)

    result = _locate_on_physical_page(doc, page_number - 1, quote, value, unit)
    if not result:
        printed_index = _build_printed_page_index(pdf_path)
        mapped_physical = printed_index.get(page_number)
        if mapped_physical is not None:
            result = _locate_on_physical_page(doc, mapped_physical, quote, value, unit)

    doc.close()
    return result
