import { useEffect, useState } from "react";
import "./App.css";
import UploadPanel from "./components/UploadPanel";
import DocumentList from "./components/DocumentList";
import FactsTable from "./components/FactsTable";
import EvidenceViewer from "./components/EvidenceViewer";
import RelationshipsPanel from "./components/RelationshipsPanel";
import SummaryLine from "./components/SummaryLine";
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
      .then((data) => {
        setFacts(data);
        setLoadError(null);
      })
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
    Promise.all([listDocuments(), getAllFacts(), getAllRelationships()])
      .then(([docs, facts, relationships]) => {
        setDocuments(docs);
        setAllFacts(facts);
        setAllRelationships(relationships);
        setLoadError(null);
      })
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
    setSelectedDocumentId(documentId);
    setPendingFactId(factId);
  }

  const selectedDocument = documents.find((d) => d.id === selectedDocumentId);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <h1>TruthLoom</h1>
          <p className="tagline">A document intelligence workspace for checking facts against each other</p>
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

      <SummaryLine documents={documents} facts={allFacts} relationships={allRelationships} />

      {loadError && (
        <div className="inline-error">
          <span>Couldn't load the latest data: {loadError}</span>
          <button className="link-button" onClick={refreshEverything}>
            Retry
          </button>
        </div>
      )}

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
                Select a document on the left, or add one, to see the facts extracted from it.
              </p>
            )}

            {selectedDocumentId && (
              <section className="facts-section">
                <h2>Extracted facts</h2>
                <p className="section-intro">
                  Each fact links to the sentence or figure that supports it. Select one to see its
                  evidence and how it compares with other documents.
                </p>
                <FactsTable
                  facts={facts}
                  relationships={allRelationships}
                  selectedFactId={selectedFact?.id}
                  onSelect={setSelectedFact}
                />
              </section>
            )}

            {selectedFact && (
              <section className="detail-section">
                <div className="evidence-column">
                  <h2>Source evidence</h2>
                  <EvidenceViewer
                    documentId={selectedDocumentId}
                    documentName={selectedDocument ? selectedDocument.filename : ""}
                    fact={selectedFact}
                  />
                </div>
                <div className="relationships-column">
                  <h2>Related information</h2>
                  <RelationshipsPanel fact={selectedFact} onOpenFact={goToFact} />
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
