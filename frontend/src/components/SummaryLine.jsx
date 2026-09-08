export default function SummaryLine({ documents, facts, relationships }) {
  const fullyGrounded = facts.filter((f) => f.grounded && !f.partial_grounding).length;
  const groundedPct = facts.length ? Math.round((fullyGrounded / facts.length) * 100) : 0;

  const parts = [
    `${documents.length} document${documents.length === 1 ? "" : "s"}`,
    `${facts.length} fact${facts.length === 1 ? "" : "s"}`,
    `${groundedPct}% grounded`,
    `${relationships.length} relationship${relationships.length === 1 ? "" : "s"}`,
  ];

  return <p className="summary-line">{parts.join(" · ")}</p>;
}
