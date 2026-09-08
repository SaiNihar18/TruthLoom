export default function StatsBar({ documents, facts, relationships }) {
  // "Fully grounded" excludes partial matches on purpose, so this number and
  // "extraction issues" below always add up to the total instead of both
  // counting partial matches and looking inconsistent side by side.
  const fullyGroundedCount = facts.filter((f) => f.grounded && !f.partial_grounding).length;
  const groundedPct = facts.length ? Math.round((fullyGroundedCount / facts.length) * 100) : 0;

  const counts = { corroborates: 0, contradicts: 0, reconcilable: 0 };
  for (const rel of relationships) {
    if (counts[rel.relationship_type] !== undefined) counts[rel.relationship_type] += 1;
  }
  const issueCount = facts.filter((f) => !f.grounded || f.partial_grounding).length;

  const tiles = [
    { label: "documents", value: documents.length, tone: "neutral" },
    { label: "facts extracted", value: facts.length, tone: "neutral" },
    { label: "fully grounded", value: `${groundedPct}%`, tone: "ok" },
    { label: "corroborations", value: counts.corroborates, tone: "ok" },
    { label: "contradictions", value: counts.contradicts, tone: "danger" },
    { label: "reconciled", value: counts.reconcilable, tone: "caution" },
    { label: "extraction issues", value: issueCount, tone: "warn" },
  ];

  return (
    <div className="stats-bar">
      {tiles.map((tile) => (
        <div key={tile.label} className={`stat-tile stat-${tile.tone}`}>
          <div className="stat-value">{tile.value}</div>
          <div className="stat-label">{tile.label}</div>
        </div>
      ))}
    </div>
  );
}
