import { getFactRelationshipSummary } from "../factStatus";

function contextLine(fact) {
  const parts = [fact.subject, fact.time_period, fact.scope].filter(Boolean);
  return parts.join(" · ");
}

export default function FactsTable({ facts, relationships, selectedFactId, onSelect }) {
  if (facts.length === 0) {
    return <p className="empty-hint">This document has no extracted facts.</p>;
  }

  return (
    <div className="facts-table-wrap">
      <table className="facts-table">
        <thead>
          <tr>
            <th>Fact</th>
            <th>Value</th>
            <th>Context</th>
            <th>Source</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {facts.map((fact) => {
            const summary = getFactRelationshipSummary(fact.id, relationships);
            return (
              <tr
                key={fact.id}
                className={fact.id === selectedFactId ? "fact-row selected" : "fact-row"}
                onClick={() => onSelect(fact)}
              >
                <td className="fact-cell-name">{fact.predicate}</td>
                <td className="fact-cell-value">
                  {fact.value} {fact.unit || ""}
                </td>
                <td className="fact-cell-context">{contextLine(fact)}</td>
                <td className="fact-cell-source">
                  {fact.page != null ? `p. ${fact.page}` : "-"}
                  {!fact.grounded && <span className="dot-flag" title="Not grounded" />}
                  {fact.grounded && fact.partial_grounding && (
                    <span className="dot-flag caution" title="Partial match" />
                  )}
                </td>
                <td>
                  {summary ? (
                    <span className={`status-text ${summary.className}`}>
                      {summary.label}
                      {summary.hasOtherTypes && (
                        <span className="status-more" title="This fact has more than one kind of relationship, see below">
                          {" "}
                          +more
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="status-text status-muted">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
