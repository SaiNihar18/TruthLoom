import { prettifyFilename } from "../format";

export default function DocumentList({ documents, selectedId, onSelect }) {
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
          title={doc.filename}
        >
          <span className="document-name">{prettifyFilename(doc.filename)}</span>
          <span className="document-fact-count">{doc.fact_count} facts</span>
        </li>
      ))}
    </ul>
  );
}
