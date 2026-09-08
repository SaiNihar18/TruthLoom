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
    """Combine several rects (already known to belong together) into one box."""
    x0 = min(r.x0 for r in rects)
    y0 = min(r.y0 for r in rects)
    x1 = max(r.x1 for r in rects)
    y1 = max(r.y1 for r in rects)
    return fitz.Rect(x0, y0, x1, y1)


def _cluster_rects(rects) -> list[list]:
    """Group rects into clusters that each represent one contiguous occurrence.

    search_for returns several rects for a single occurrence that wraps
    across a line break, but also one rect per occurrence when a short or
    common search string (e.g. "Customers", which can match a table's row
    label and, case-insensitively, the word "customers" in an unrelated
    sentence elsewhere on the page) repeats at unrelated spots. Rect count
    alone can't tell those apart, only proximity can: rects that are on the
    same line and close together, or on the very next line down, are one
    occurrence, anything farther is a separate one.
    """
    ordered = sorted(rects, key=lambda r: (round(r.y0, 1), r.x0))
    clusters = [[ordered[0]]]
    for rect in ordered[1:]:
        prev = clusters[-1][-1]
        line_height = prev.y1 - prev.y0
        same_line = abs(rect.y0 - prev.y0) < 2
        next_line_down = 0 <= (rect.y0 - prev.y1) < line_height * 1.5
        close_enough = (same_line and (rect.x0 - prev.x1) < 30) or next_line_down
        if close_enough:
            clusters[-1].append(rect)
        else:
            clusters.append([rect])
    return clusters


def _unambiguous_match(rects):
    """Return the rects for a search hit only if it occurred exactly once.

    A hit that clusters into more than one group means the search string
    turned up in two unrelated places on the page. Guessing which one is
    right (e.g. always the first) is exactly how a short, common label like
    "Customers" can get confidently pointed at the wrong occurrence. Safer
    to say "not found here" and let a weaker fallback, or nothing, take
    over than to highlight a plausible-looking wrong spot.
    """
    if not rects:
        return None
    clusters = _cluster_rects(rects)
    return clusters[0] if len(clusters) == 1 else None


def _locate_on_physical_page(
    doc: fitz.Document, physical_index: int, quote: str, value: str | None = None, unit: str | None = None
) -> dict | None:
    if physical_index < 0 or physical_index >= len(doc):
        return None

    page = doc[physical_index]
    partial = False

    match = _unambiguous_match(page.search_for(quote))
    if not match:
        match = _unambiguous_match(page.search_for(_normalize(quote)))
    if not match:
        label = _longest_label_segment(quote)
        if label:
            match = _unambiguous_match(page.search_for(label))
            partial = match is not None

    if match:
        rect = _union_rect(match)
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
