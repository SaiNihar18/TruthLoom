// A fact can be involved in several relationships at once, e.g. corroborated
// word for word by one document and only loosely reconciled with an
// unrelated-scope fact from another. When we need a single headline status
// for a compact view, contradictions take priority since they're the thing
// a reader most needs to notice, then corroboration, since an exact
// independent match is a stronger and more specific finding than a
// difference that merely got explained away, then reconciled differences.
// The count below still reflects every relationship, so a fact with more
// than one is never silently reduced to just the headline type.
const PRIORITY = ["contradicts", "corroborates", "reconcilable"];

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
    hasOtherTypes: types.size > 1,
    ...STATUS_INFO[primaryType],
  };
}

export function statusInfo(type) {
  return STATUS_INFO[type] || { label: type, className: "" };
}
