import { useEffect, useState } from "react";
import { getFactRelationships } from "../api";
import { statusInfo } from "../factStatus";
import LoadingLine from "./LoadingLine";

export default function RelationshipsPanel({ fact, onOpenFact }) {
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fact) {
      setRelationships([]);
      return;
    }
    setLoading(true);
    getFactRelationships(fact.id)
      .then(setRelationships)
      .finally(() => setLoading(false));
  }, [fact?.id]);

  if (!fact) return null;

  if (loading) return <LoadingLine text="Checking other documents..." />;

  if (relationships.length === 0) {
    return (
      <div className="related-empty">
        <p className="empty-hint">No related facts found</p>
        <p className="section-intro">This fact has not been matched with information from another document.</p>
      </div>
    );
  }

  return (
    <div className="related-list fade-in" key={fact.id}>
      {relationships.map((rel, index) => {
        const info = statusInfo(rel.relationship_type);
        const other = rel.other_fact;
        return (
          <div key={index} className="related-item">
            <div className="related-item-header">
              <span className={`status-text ${info.className}`}>{info.label}</span>
              <span className="evidence-source-line">
                {other.document_filename} · Page {other.page ?? "-"}
              </span>
            </div>
            <blockquote className="evidence-quote small">{other.quote}</blockquote>
            {onOpenFact && (
              <button className="link-button" onClick={() => onOpenFact(other.document_id, other.id)}>
                Open comparison →
              </button>
            )}
            <p className="related-why">
              <span className="related-why-label">Why this matches</span>
              {rel.explanation}
            </p>
          </div>
        );
      })}
    </div>
  );
}
