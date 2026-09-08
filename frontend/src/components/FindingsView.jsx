import { useState } from "react";
import { statusInfo } from "../factStatus";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "corroborates", label: "Corroborated" },
  { key: "contradicts", label: "Contradictions" },
  { key: "reconcilable", label: "Reconciled" },
  { key: "issues", label: "Needs review" },
];

function factLine(fact) {
  const context = [fact.time_period, fact.scope].filter(Boolean).join(" · ");
  return (
    <span>
      <strong>{fact.value} {fact.unit || ""}</strong>
      {context ? <span className="muted"> &middot; {context}</span> : null}
    </span>
  );
}

function RelationshipRow({ relationship, onOpenFact }) {
  const { fact_a, fact_b, relationship_type, explanation } = relationship;
  if (!fact_a || !fact_b) return null;
  const info = statusInfo(relationship_type);
  const sameName = fact_a.predicate === fact_b.predicate;

  return (
    <li className="finding-row">
      <span className={`finding-kicker ${info.className}`}>{info.label}</span>
      <div className="finding-title">{sameName ? fact_a.predicate : `${fact_a.predicate} / ${fact_b.predicate}`}</div>
      <div className="finding-values">
        <button className="link-button plain" onClick={() => onOpenFact(fact_a.document_id, fact_a.id)}>
          {factLine(fact_a)} <span className="muted">&mdash; {fact_a.document_filename}</span>
        </button>
        <button className="link-button plain" onClick={() => onOpenFact(fact_b.document_id, fact_b.id)}>
          {factLine(fact_b)} <span className="muted">&mdash; {fact_b.document_filename}</span>
        </button>
      </div>
      <p className="finding-explanation">{explanation}</p>
    </li>
  );
}

function IssueRow({ fact, onOpenFact }) {
  const isMissing = !fact.grounded;
  const why = isMissing
    ? "This figure could not be located in the source PDF's text layer at all. It may come from a table or chart the model paraphrased rather than quoted, or the extraction may simply be wrong."
    : "Only part of the surrounding sentence matched the PDF exactly, often because the source text is spread across a table and the model combined it into one line. Treat the value with lower confidence until checked.";

  return (
    <li className="finding-row">
      <span className="finding-kicker status-warn">Needs review</span>
      <div className="finding-title">
        {fact.predicate}: {fact.value} {fact.unit || ""}
      </div>
      <p className="finding-explanation">
        <strong>What was extracted:</strong> {fact.subject} &middot; {fact.predicate} &middot; {fact.value}{" "}
        {fact.unit || ""} {fact.time_period ? `(${fact.time_period})` : ""}
        <br />
        <strong>Why it's uncertain:</strong> {why}
        <br />
        <strong>Source:</strong> {fact.document_filename}, page {fact.page ?? "unknown"}
      </p>
      <button className="link-button" onClick={() => onOpenFact(fact.document_id, fact.id)}>
        Open source →
      </button>
    </li>
  );
}

export default function FindingsView({ facts, relationships, onViewFact, onRefresh }) {
  const [filter, setFilter] = useState("all");

  const issueFacts = facts.filter((f) => !f.grounded || f.partial_grounding);

  const counts = {
    all: relationships.length + issueFacts.length,
    corroborates: relationships.filter((r) => r.relationship_type === "corroborates").length,
    contradicts: relationships.filter((r) => r.relationship_type === "contradicts").length,
    reconcilable: relationships.filter((r) => r.relationship_type === "reconcilable").length,
    issues: issueFacts.length,
  };

  const showRelationships = filter !== "issues";
  const showIssues = filter === "all" || filter === "issues";
  const filteredRelationships =
    filter === "all" || filter === "issues" ? relationships : relationships.filter((r) => r.relationship_type === filter);

  const nothingToShow =
    (showRelationships ? filteredRelationships.length === 0 : true) && (showIssues ? issueFacts.length === 0 : true);

  return (
    <div className="findings-view">
      <div className="findings-header">
        <p className="section-intro">
          What TruthLoom found when it checked facts against each other across documents.
          Comparisons run in the background after upload, refresh if you just added one.
        </p>
        <button className="link-button" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? "filter-link active" : "filter-link"}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <span className="muted">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {nothingToShow && (
        <p className="empty-hint">
          {relationships.length === 0 && issueFacts.length === 0
            ? "Upload at least two related documents to see corroborations, contradictions, and reconciled differences here."
            : "Nothing in this category."}
        </p>
      )}

      <ul className="finding-list">
        {showRelationships &&
          filteredRelationships.map((rel) => (
            <RelationshipRow key={rel.id} relationship={rel} onOpenFact={onViewFact} />
          ))}
        {showIssues && issueFacts.map((fact) => <IssueRow key={`issue-${fact.id}`} fact={fact} onOpenFact={onViewFact} />)}
      </ul>
    </div>
  );
}
