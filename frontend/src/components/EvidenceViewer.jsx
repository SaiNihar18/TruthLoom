import { useEffect, useState } from "react";
import { getPageMeta, pageImageUrl } from "../api";
import LoadingLine from "./LoadingLine";

const CROP_HEIGHT = 220;

export default function EvidenceViewer({ documentId, documentName, fact }) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setMeta(null);
    setError(null);
    setExpanded(false);
    setImageLoaded(false);
    if (!fact || !fact.page) return;
    getPageMeta(documentId, fact.page)
      .then(setMeta)
      .catch((err) => setError(err.message));
  }, [documentId, fact?.id, fact?.page]);

  if (!fact) {
    return <p className="empty-hint">Select a fact to see its source evidence.</p>;
  }

  const bbox = fact.bbox;
  const imageWidth = meta ? meta.width_points * meta.scale : 0;
  const imageHeight = meta ? meta.height_points * meta.scale : 0;

  let cropOffsetY = 0;
  if (meta && bbox) {
    const centerY = ((bbox.y0 + bbox.y1) / 2) * meta.scale;
    const minOffset = Math.min(0, CROP_HEIGHT - imageHeight);
    cropOffsetY = Math.max(minOffset, Math.min(0, CROP_HEIGHT / 2 - centerY));
  }

  return (
    <div className="evidence-viewer fade-in" key={fact.id}>
      <div className="evidence-source-line">
        {documentName ? `${documentName}` : ""}
        {fact.page ? ` · Page ${fact.page}` : ""}
      </div>

      <blockquote className="evidence-quote">{fact.quote}</blockquote>

      {bbox && bbox.partial && (
        <p className="evidence-note caution">
          Only partially matched the document's text, shown with lower confidence.
        </p>
      )}
      {!bbox && fact.page && (
        <p className="evidence-note warn">
          Could not verify this quote against the document's text. Treat with lower confidence.
        </p>
      )}
      {!fact.page && <p className="empty-hint">This fact has no page reference to show.</p>}

      {error && <p className="upload-error">Could not load page: {error}</p>}

      {fact.page && !error && !meta && <LoadingLine text="Loading page..." />}

      {fact.page && !error && meta && (
        <>
          <div className="evidence-crop" style={{ height: CROP_HEIGHT }}>
            <img
              src={pageImageUrl(documentId, fact.page)}
              alt={`Page ${fact.page}`}
              onLoad={() => setImageLoaded(true)}
              className={imageLoaded ? "page-image loaded" : "page-image"}
              style={{ position: "absolute", top: cropOffsetY, left: 0, width: imageWidth }}
            />
            {bbox && (
              <div
                className={bbox.partial ? "highlight-box partial" : "highlight-box"}
                style={{
                  top: bbox.y0 * meta.scale + cropOffsetY,
                  left: bbox.x0 * meta.scale,
                  width: (bbox.x1 - bbox.x0) * meta.scale,
                  height: (bbox.y1 - bbox.y0) * meta.scale,
                }}
              />
            )}
          </div>
          <button className="link-button" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide full page" : "View full page →"}
          </button>
        </>
      )}

      {expanded && meta && (
        <div className="page-frame fade-in" style={{ width: imageWidth }}>
          <img src={pageImageUrl(documentId, fact.page)} alt={`Page ${fact.page} full`} className="page-image loaded" />
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
