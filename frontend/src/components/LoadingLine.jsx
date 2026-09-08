export default function LoadingLine({ text }) {
  return (
    <p className="loading-line">
      <span className="spinner" />
      {text}
    </p>
  );
}
