import { useRef, useState } from "react";
import { uploadDocument } from "../api";

export default function UploadPanel({ onUploaded }) {
  const [progress, setProgress] = useState(null);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);

  async function handleFileChange(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setErrors([]);
    const failed = [];

    for (let i = 0; i < files.length; i++) {
      setProgress({ index: i + 1, total: files.length, name: files[i].name });
      try {
        const result = await uploadDocument(files[i]);
        onUploaded(result);
      } catch (err) {
        failed.push(`${files[i].name}: ${err.message}`);
      }
    }

    setProgress(null);
    setErrors(failed);
    if (inputRef.current) inputRef.current.value = "";
  }

  const uploading = progress !== null;

  return (
    <div className="upload-panel">
      <label className="upload-button">
        {uploading ? `Uploading ${progress.index} of ${progress.total}...` : "+ Add documents"}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          hidden
        />
      </label>
      {uploading && (
        <p className="upload-hint">
          Reading {progress.name}, this can take a minute or two for a large PDF.
        </p>
      )}
      {errors.map((message, i) => (
        <p key={i} className="upload-error">
          {message}
        </p>
      ))}
    </div>
  );
}
