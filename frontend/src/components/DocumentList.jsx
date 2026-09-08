import { prettifyFilename } from "../format";
import { downloadUrl } from "../api";

export default function DocumentList({ documents, selectedId, onSelect, onDelete }) {
  if (documents.length === 0) {
    return <p className="empty-hint">No documents yet.</p>;
  }

  return (
    <ul className="document-list">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className={doc.id === selectedId ? "document-item selected" : "document-item"}
          onClick={() => onSelect(doc.id)}
        >
          <div className="document-item-main">
            <span className="document-name">{prettifyFilename(doc.filename)}</span>
            <span className="document-original-name">{doc.filename}</span>
            <span className="document-fact-count">{doc.fact_count} facts</span>
          </div>
          <div className="document-item-actions">
            <a
              className="icon-button"
              title="Download PDF"
              href={downloadUrl(doc.id)}
              onClick={(e) => e.stopPropagation()}
            >
              ⭳
            </a>
            <button
              className="icon-button danger"
              title="Delete document"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(doc.id, doc.filename);
              }}
            >
              ×
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
