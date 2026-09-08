const API_BASE = "http://localhost:8000";

async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const body = await response.text();
    let message = body;
    try {
      message = JSON.parse(body).detail || body;
    } catch {
      // body wasn't JSON, use it as-is
    }
    throw new Error(message);
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

export function getAllFacts() {
  return request("/facts");
}

export function getAllRelationships() {
  return request("/relationships");
}

export function getPageMeta(documentId, page) {
  return request(`/documents/${documentId}/pages/${page}/meta`);
}

export function pageImageUrl(documentId, page) {
  return `${API_BASE}/documents/${documentId}/pages/${page}/image`;
}

export function downloadUrl(documentId) {
  return `${API_BASE}/documents/${documentId}/download`;
}

export function deleteDocument(documentId) {
  return request(`/documents/${documentId}`, { method: "DELETE" });
}
