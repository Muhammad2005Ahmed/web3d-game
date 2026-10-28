import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, PasswordField } from '../components/Field.jsx';
import { validateLogin } from '../utils/validators.js';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [v, setV] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | error
  const [serverError, setServerError] = useState('');

  if (user) return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const errs = validateLogin(v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStatus('loading'); setServerError('');
    try {
      await login(v.identifier.trim(), v.password);
    } catch (err) {
      setServerError(err.message); setStatus('error');
    }
  };

  return (
    <section className="auth-card card">
      <h1>Welcome back</h1>
            {location.state?.registered && <p className="ok box" role="status">Account created. Please log in.</p>}
      <form onSubmit={submit} noValidate>
        <Field label="Email or username" value={v.identifier} onChange={set('identifier')} error={errors.identifier} autoComplete="username" />
        <PasswordField label="Password" value={v.password} onChange={set('password')} error={errors.password} autoComplete="current-password" />
        {serverError && <p className="error box" role="alert">{serverError}</p>}
        <button className="btn btn-primary btn-block" disabled={status === 'loading'}>
          {status === 'loading' ? 'Logging in…' : 'Login'}
        </button>
      </form>
      <p className="muted center">New here? <Link to="/signup">Create an account</Link></p>
    </section>
  );
}
