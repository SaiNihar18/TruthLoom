const API_BASE = "http://localhost:8000";

async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status}: ${body}`);
  }
  return response.json();
}

export function listDocuments() {
  return request("/documents");
}

export function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/documents", { method: "POST", body: formData });
}

export function getDocumentFacts(documentId) {
  return request(`/documents/${documentId}/facts`);
}

export function getFactRelationships(factId) {
  return request(`/facts/${factId}/relationships`);
}

export function getPageMeta(documentId, page) {
  return request(`/documents/${documentId}/pages/${page}/meta`);
}

export function pageImageUrl(documentId, page) {
  return `${API_BASE}/documents/${documentId}/pages/${page}/image`;
}
