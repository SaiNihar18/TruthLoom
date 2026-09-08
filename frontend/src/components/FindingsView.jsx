import { useState } from "react";

const RELATIONSHIP_INFO = {
  corroborates: {
    label: "Corroborates",
    badgeClass: "badge badge-ok",
    blurb: "The same underlying claim, stated independently in two documents.",
  },
  contradicts: {
    label: "Contradicts",
    badgeClass: "badge badge-danger",
    blurb: "Two documents make incompatible claims that time, scope, or units don't explain.",
  },
  reconcilable: {
    label: "Reconcilable",
    badgeClass: "badge badge-caution",
    blurb: "Looks like a mismatch, but is explained by a different period, scope, or unit.",
  },
};

const FILTERS = [
  { key: "all", label: "All findings" },
  { key: "corroborates", label: "Corroborations" },
  { key: "contradicts", label: "Contradictions" },
  { key: "reconcilable", label: "Reconciled" },
  { key: "issues", label: "Extraction issues" },
];

function FactChip({ fact, onView }) {
  return (
    <button className="fact-chip" onClick={() => onView(fact.document_id, fact.id)}>
      <span className="fact-chip-doc">{fact.document_filename}</span>
      <span className="fact-chip-body">
        <strong>{fact.subject}</strong> &middot; {fact.predicate}: {fact.value} {fact.unit || ""}
        {fact.time_period ? ` (${fact.time_period})` : ""}
      </span>
    </button>
  );
}

function RelationshipCard({ relationship, onViewFact }) {
  const info = RELATIONSHIP_INFO[relationship.relationship_type];
  if (!relationship.fact_a || !relationship.fact_b) return null;
  return (
    <li className="finding-card">
      <span className={info.badgeClass}>{info.label}</span>
      <div className="finding-pair">
        <FactChip fact={relationship.fact_a} onView={onViewFact} />
        <FactChip fact={relationship.fact_b} onView={onViewFact} />
      </div>
      <p className="finding-explanation">{relationship.explanation}</p>
    </li>
  );
}

function IssueCard({ fact, onViewFact }) {
  const reason = !fact.grounded
    ? "Could not be verified against the PDF's text layer at all."
    : "Only partially matched the PDF's text layer, treat with lower confidence.";
  return (
    <li className="finding-card">
      <span className={!fact.grounded ? "badge badge-warn" : "badge badge-caution"}>
        {!fact.grounded ? "Not grounded" : "Partial match"}
      </span>
      <div className="finding-pair">
        <FactChip fact={fact} onView={onViewFact} />
      </div>
      <p className="finding-explanation">{reason}</p>
    </li>
  );
}

export default function FindingsView({ facts, relationships, onViewFact, onRefresh }) {
  const [filter, setFilter] = useState("all");

  const issueFacts = facts.filter((f) => !f.grounded || f.partial_grounding);

  const filteredRelationships =
    filter === "all" || filter === "issues"
      ? relationships
      : relationships.filter((r) => r.relationship_type === filter);

  const showRelationships = filter !== "issues";
  const showIssues = filter === "all" || filter === "issues";

  const counts = {
    all: relationships.length + issueFacts.length,
    corroborates: relationships.filter((r) => r.relationship_type === "corroborates").length,
    contradicts: relationships.filter((r) => r.relationship_type === "contradicts").length,
    reconcilable: relationships.filter((r) => r.relationship_type === "reconcilable").length,
    issues: issueFacts.length,
  };

  const nothingToShow =
    (filter === "all" && relationships.length === 0 && issueFacts.length === 0) ||
    (filter !== "all" && filter !== "issues" && filteredRelationships.length === 0) ||
    (filter === "issues" && issueFacts.length === 0);

  return (
    <div className="findings-view">
      <div className="findings-header">
        <p className="section-intro">
          Every corroboration, contradiction, and context-explained difference the system found
          across documents, plus any fact it couldn't fully verify. Click a fact to jump to its
          source evidence. Cross-document comparisons run in the background after upload, so
          refresh if you just added a document.
        </p>
        <button className="refresh-button" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <div className="filter-bar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? "filter-chip active" : "filter-chip"}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <span className="filter-count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {nothingToShow && (
        <p className="empty-hint">
          {relationships.length === 0 && issueFacts.length === 0
            ? "Upload at least two related documents to see corroborations, contradictions, and reconciled differences here."
            : "Nothing in this category yet."}
        </p>
      )}

      <ul className="finding-list">
        {showRelationships &&
          filteredRelationships.map((rel) => (
            <RelationshipCard key={rel.id} relationship={rel} onViewFact={onViewFact} />
          ))}
        {showIssues &&
          issueFacts.map((fact) => <IssueCard key={`issue-${fact.id}`} fact={fact} onViewFact={onViewFact} />)}
      </ul>
    </div>
  );
}
