function groundingLabel(fact) {
  if (!fact.grounded) return { text: "not grounded", className: "badge badge-warn" };
  if (fact.partial_grounding) return { text: "partial match", className: "badge badge-caution" };
  return { text: "grounded", className: "badge badge-ok" };
}

export default function FactsTable({ facts, selectedFactId, onSelect }) {
  if (facts.length === 0) {
    return <p className="empty-hint">This document has no extracted facts.</p>;
  }

  return (
    <div className="facts-table-wrap">
      <table className="facts-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Predicate</th>
            <th>Value</th>
            <th>Period</th>
            <th>Scope</th>
            <th>Page</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {facts.map((fact) => {
            const grounding = groundingLabel(fact);
            return (
              <tr
                key={fact.id}
                className={fact.id === selectedFactId ? "fact-row selected" : "fact-row"}
                onClick={() => onSelect(fact)}
              >
                <td>{fact.subject}</td>
                <td>{fact.predicate}</td>
                <td>
                  {fact.value} {fact.unit || ""}
                </td>
                <td>{fact.time_period || "-"}</td>
                <td>{fact.scope || "-"}</td>
                <td>{fact.page ?? "-"}</td>
                <td>
                  <span className={grounding.className}>{grounding.text}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
