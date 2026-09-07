import { useEffect, useState } from "react";
import { getFactRelationships } from "../api";

const BADGE_CLASS = {
  corroborates: "badge badge-ok",
  contradicts: "badge badge-danger",
  reconcilable: "badge badge-caution",
};

export default function RelationshipsPanel({ fact }) {
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

  if (loading) return <p className="empty-hint">Checking other documents...</p>;

  if (relationships.length === 0) {
    return <p className="empty-hint">No matching facts found in other documents yet.</p>;
  }

  return (
    <ul className="relationship-list">
      {relationships.map((rel, index) => (
        <li key={index} className="relationship-card">
          <span className={BADGE_CLASS[rel.relationship_type] || "badge"}>
            {rel.relationship_type}
          </span>
          <p className="relationship-fact">
            <strong>{rel.other_fact.subject}</strong> &middot; {rel.other_fact.predicate}:{" "}
            {rel.other_fact.value} {rel.other_fact.unit || ""}
            {rel.other_fact.time_period ? ` (${rel.other_fact.time_period})` : ""}
          </p>
          <p className="relationship-source">from {rel.other_fact.document_filename}</p>
          <p className="relationship-explanation">{rel.explanation}</p>
        </li>
      ))}
    </ul>
  );
}
