import { useEffect, useState } from "react";
import { getPageMeta, pageImageUrl } from "../api";

export default function EvidenceViewer({ documentId, fact }) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setMeta(null);
    setError(null);
    if (!fact || !fact.page) return;
    getPageMeta(documentId, fact.page)
      .then(setMeta)
      .catch((err) => setError(err.message));
  }, [documentId, fact?.id, fact?.page]);

  if (!fact) {
    return <p className="empty-hint">Select a fact to see its source evidence.</p>;
  }

  if (!fact.page) {
    return <p className="empty-hint">This fact has no page reference to show.</p>;
  }

  const bbox = fact.bbox;

  return (
    <div className="evidence-viewer">
      <p className="evidence-quote">&ldquo;{fact.quote}&rdquo;</p>

      {bbox && bbox.partial && (
        <p className="evidence-note caution">
          Only part of this quote matched the PDF text exactly, likely because the model combined
          separate table cells into one line. The matched part is highlighted below.
        </p>
      )}
      {bbox && !bbox.partial && (
        <p className="evidence-note ok">Verified against the PDF text layer, highlighted below.</p>
      )}
      {!bbox && (
        <p className="evidence-note warn">
          Could not verify this quote against the PDF text layer. Shown for reference only, treat
          this fact with less confidence.
        </p>
      )}

      {error && <p className="upload-error">Could not load page: {error}</p>}

      {!error && !meta && <p className="empty-hint">Loading page {fact.page}...</p>}

      {meta && (
        <div
          className="page-frame"
          style={{ width: meta.width_points * meta.scale, height: meta.height_points * meta.scale }}
        >
          <img src={pageImageUrl(documentId, fact.page)} alt={`Page ${fact.page}`} />
          {bbox && (
            <div
              className={bbox.partial ? "highlight-box partial" : "highlight-box"}
              style={{
                left: bbox.x0 * meta.scale,
                top: bbox.y0 * meta.scale,
                width: (bbox.x1 - bbox.x0) * meta.scale,
                height: (bbox.y1 - bbox.y0) * meta.scale,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
