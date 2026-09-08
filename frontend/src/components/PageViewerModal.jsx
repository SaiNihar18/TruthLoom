import { useEffect, useState } from "react";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

function fitZoom(imageWidth, imageHeight) {
  const fitW = (window.innerWidth * 0.85) / imageWidth;
  const fitH = (window.innerHeight * 0.78) / imageHeight;
  return Math.min(1, fitW, fitH);
}

export default function PageViewerModal({ imageUrl, imageWidth, imageHeight, bbox, scale, pageLabel, onClose }) {
  const [zoom, setZoom] = useState(() => fitZoom(imageWidth, imageHeight));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z / 1.25));
  const zoomFit = () => setZoom(fitZoom(imageWidth, imageHeight));

  const displayWidth = imageWidth * zoom;
  const displayHeight = imageHeight * zoom;

  return (
    <div className="page-modal-backdrop" onClick={onClose}>
      <div className="page-modal" onClick={(e) => e.stopPropagation()}>
        <div className="page-modal-toolbar">
          <span className="page-modal-label">{pageLabel}</span>
          <div className="zoom-controls">
            <button className="zoom-button" onClick={zoomOut} aria-label="Zoom out" disabled={zoom <= MIN_ZOOM}>
              −
            </button>
            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            <button className="zoom-button" onClick={zoomIn} aria-label="Zoom in" disabled={zoom >= MAX_ZOOM}>
              +
            </button>
            <button className="link-button" onClick={zoomFit}>
              Fit
            </button>
          </div>
          <button className="page-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="page-modal-scroll">
          <div className="page-modal-canvas" style={{ width: displayWidth, height: displayHeight }}>
            <img src={imageUrl} alt={pageLabel} style={{ width: displayWidth, height: displayHeight }} />
            {bbox && (
              <div
                className={bbox.partial ? "highlight-box partial" : "highlight-box"}
                style={{
                  left: bbox.x0 * scale * zoom,
                  top: bbox.y0 * scale * zoom,
                  width: (bbox.x1 - bbox.x0) * scale * zoom,
                  height: (bbox.y1 - bbox.y0) * scale * zoom,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
