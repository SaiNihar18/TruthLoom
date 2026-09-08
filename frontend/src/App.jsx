import { useEffect, useState } from "react";
import "./App.css";
import UploadPanel from "./components/UploadPanel";
import DocumentList from "./components/DocumentList";
import FactsTable from "./components/FactsTable";
import EvidenceViewer from "./components/EvidenceViewer";
import RelationshipsPanel from "./components/RelationshipsPanel";
import StatsBar from "./components/StatsBar";
import FindingsView from "./components/FindingsView";
import { listDocuments, getDocumentFacts, getAllFacts, getAllRelationships } from "./api";

export default function App() {
  const [activeTab, setActiveTab] = useState("documents");

  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [facts, setFacts] = useState([]);
  const [selectedFact, setSelectedFact] = useState(null);
  const [pendingFactId, setPendingFactId] = useState(null);

  const [allFacts, setAllFacts] = useState([]);
  const [allRelationships, setAllRelationships] = useState([]);

  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    refreshEverything();
  }, []);

  useEffect(() => {
    if (!selectedDocumentId) {
      setFacts([]);
      return;
    }
    getDocumentFacts(selectedDocumentId)
      .then(setFacts)
      .catch((err) => setLoadError(err.message));
  }, [selectedDocumentId]);

  useEffect(() => {
    if (pendingFactId == null) return;
    const target = facts.find((f) => f.id === pendingFactId);
    if (target) {
      setSelectedFact(target);
      setPendingFactId(null);
    }
  }, [facts, pendingFactId]);

  function refreshEverything() {
    listDocuments()
      .then(setDocuments)
      .catch((err) => setLoadError(err.message));
    getAllFacts()
      .then(setAllFacts)
      .catch((err) => setLoadError(err.message));
    getAllRelationships()
      .then(setAllRelationships)
      .catch((err) => setLoadError(err.message));
  }

  function handleUploaded(result) {
    refreshEverything();
    setSelectedDocumentId(result.document_id);
    setActiveTab("documents");
  }

  function goToFact(documentId, factId) {
    setActiveTab("documents");
    setSelectedFact(null);
    if (documentId === selectedDocumentId) {
      setPendingFactId(factId);
    } else {
      setSelectedDocumentId(documentId);
      setPendingFactId(factId);
    }
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <h1>TruthLoom</h1>
          <p className="tagline">Evidence-grounded facts, checked against each other across documents</p>
        </div>
        <nav className="tab-switcher">
          <button
            className={activeTab === "documents" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("documents")}
          >
            Documents
          </button>
          <button
            className={activeTab === "findings" ? "tab-button active" : "tab-button"}
            onClick={() => setActiveTab("findings")}
          >
            Findings
          </button>
        </nav>
      </header>

      <StatsBar documents={documents} facts={allFacts} relationships={allRelationships} />

      {loadError && <p className="upload-error top-level-error">{loadError}</p>}

      {activeTab === "documents" ? (
        <div className="documents-tab">
          <aside className="sidebar">
            <UploadPanel onUploaded={handleUploaded} />
            <h3 className="sidebar-heading">Documents</h3>
            <DocumentList
              documents={documents}
              selectedId={selectedDocumentId}
              onSelect={(id) => {
                setSelectedDocumentId(id);
                setSelectedFact(null);
              }}
            />
          </aside>

          <main className="main-content">
            {!selectedDocumentId && (
              <p className="empty-hint large">
                Select a document on the left, or upload a new PDF, to see the facts extracted
                from it.
              </p>
            )}

            {selectedDocumentId && (
              <section className="facts-section">
                <h2>Extracted facts</h2>
                <p className="section-intro">
                  Each fact is linked to the exact sentence or figure in the source PDF that
                  supports it. Click a row to see that evidence and anything it corroborates,
                  contradicts, or reconciles with in other documents.
                </p>
                <FactsTable facts={facts} selectedFactId={selectedFact?.id} onSelect={setSelectedFact} />
              </section>
            )}

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
      ) : (
        <main className="main-content findings-tab">
          <FindingsView
            facts={allFacts}
            relationships={allRelationships}
            onViewFact={goToFact}
            onRefresh={refreshEverything}
          />
        </main>
      )}
    </div>
  );
}
