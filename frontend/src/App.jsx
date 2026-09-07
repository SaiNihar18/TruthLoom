import { useEffect, useState } from "react";
import "./App.css";
import UploadPanel from "./components/UploadPanel";
import DocumentList from "./components/DocumentList";
import FactsTable from "./components/FactsTable";
import EvidenceViewer from "./components/EvidenceViewer";
import RelationshipsPanel from "./components/RelationshipsPanel";
import { listDocuments, getDocumentFacts } from "./api";

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [facts, setFacts] = useState([]);
  const [selectedFact, setSelectedFact] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    refreshDocuments();
  }, []);

  useEffect(() => {
    setSelectedFact(null);
    if (!selectedDocumentId) {
      setFacts([]);
      return;
    }
    getDocumentFacts(selectedDocumentId)
      .then(setFacts)
      .catch((err) => setLoadError(err.message));
  }, [selectedDocumentId]);

  function refreshDocuments() {
    listDocuments()
      .then(setDocuments)
      .catch((err) => setLoadError(err.message));
  }

  function handleUploaded(result) {
    refreshDocuments();
    setSelectedDocumentId(result.document_id);
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h1>TruthLoom</h1>
        <p className="tagline">Evidence-grounded facts across documents</p>
        <UploadPanel onUploaded={handleUploaded} />
        <DocumentList
          documents={documents}
          selectedId={selectedDocumentId}
          onSelect={setSelectedDocumentId}
        />
      </aside>

      <main className="main-content">
        {loadError && <p className="upload-error">{loadError}</p>}

        <section className="facts-section">
          <h2>Extracted facts</h2>
          <FactsTable facts={facts} selectedFactId={selectedFact?.id} onSelect={setSelectedFact} />
        </section>

        {selectedFact && (
          <section className="detail-section">
            <div className="evidence-column">
              <h2>Source evidence</h2>
              <EvidenceViewer documentId={selectedDocumentId} fact={selectedFact} />
            </div>
            <div className="relationships-column">
              <h2>Related facts in other documents</h2>
              <RelationshipsPanel fact={selectedFact} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
