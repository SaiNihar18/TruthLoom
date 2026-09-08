// A fact can be involved in several relationships at once (e.g. corroborated
// by one document and contradicted by another). When we need a single
// headline status for a compact view, contradictions take priority since
// they're the thing a reader most needs to notice, then reconciled
// differences, then corroboration.
const PRIORITY = ["contradicts", "reconcilable", "corroborates"];

const STATUS_INFO = {
  corroborates: { label: "Corroborated", className: "status-ok" },
  contradicts: { label: "Potential contradiction", className: "status-danger" },
  reconcilable: { label: "Contextually reconciled", className: "status-caution" },
};

export function getFactRelationshipSummary(factId, relationships) {
  const touching = relationships.filter((r) => r.fact_a?.id === factId || r.fact_b?.id === factId);
  if (touching.length === 0) return null;

  const types = new Set(touching.map((r) => r.relationship_type));
  const primaryType = PRIORITY.find((t) => types.has(t));
  if (!primaryType) return null;

  return {
    type: primaryType,
    count: touching.length,
    ...STATUS_INFO[primaryType],
  };
}

export function statusInfo(type) {
  return STATUS_INFO[type] || { label: type, className: "" };
}
