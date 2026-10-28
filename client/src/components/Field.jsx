import { useState, useId } from 'react';

export function Field({ label, error, ...props }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} {...props} />
      {error && <p className="error" id={`${id}-e`} role="alert">{error}</p>}
    </div>
  );
}

export function PasswordField({ label, error, ...props }) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw-wrap">
        <input id={id} type={show ? 'text' : 'password'} aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} {...props} />
        <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-pressed={show}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && <p className="error" id={`${id}-e`} role="alert">{error}</p>}
    </div>
  );
}
