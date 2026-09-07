export default function DocumentList({ documents, selectedId, onSelect }) {
  if (documents.length === 0) {
    return <p className="empty-hint">No documents yet, upload a PDF to get started.</p>;
  }

  return (
    <ul className="document-list">
      {documents.map((doc) => (
        <li
          key={doc.id}
          className={doc.id === selectedId ? "document-item selected" : "document-item"}
          onClick={() => onSelect(doc.id)}
        >
          <span className="document-name">{doc.filename}</span>
          <span className="document-fact-count">{doc.fact_count} facts</span>
        </li>
      ))}
    </ul>
  );
}
