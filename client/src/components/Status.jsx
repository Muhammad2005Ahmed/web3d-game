export function Loading({ text = 'Loading…' }) {
  return <div className="state" role="status"><div className="spinner" /><p>{text}</p></div>;
}
export function ErrorBox({ message, onRetry }) {
  return (
    <div className="state error-box" role="alert">
      <p>{message}</p>
      {onRetry && <button className="btn btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}
