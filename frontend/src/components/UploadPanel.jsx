import { useRef, useState } from "react";
import { uploadDocument } from "../api";

export default function UploadPanel({ onUploaded }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  async function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    setStatus("uploading");
    setError(null);
    try {
      const result = await uploadDocument(file);
      setStatus("idle");
      onUploaded(result);
    } catch (err) {
      setStatus("idle");
      setError(err.message);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="upload-panel">
      <label className="upload-button">
        {status === "uploading" ? "Extracting facts..." : "+ Add documents"}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          disabled={status === "uploading"}
          hidden
        />
      </label>
      {status === "uploading" && (
        <p className="upload-hint">
          Reading the document and extracting facts, this can take a minute or two for a large PDF.
        </p>
      )}
      {error && <p className="upload-error">{error}</p>}
    </div>
  );
}
