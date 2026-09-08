export function prettifyFilename(filename) {
  const withoutExt = filename.replace(/\.pdf$/i, "");
  const withoutLeadingNumber = withoutExt.replace(/^\d+[-_]?/, "");
  const spaced = withoutLeadingNumber.replace(/[-_]+/g, " ").trim();
  return spaced.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
