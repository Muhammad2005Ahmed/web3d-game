import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, PasswordField } from '../components/Field.jsx';
import { validateSignup } from '../utils/validators.js';

export default function Signup() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | error | success
  const [serverError, setServerError] = useState('');

  // After the success message, send the user to the Login page
  useEffect(() => {
    if (status !== 'success') return;
    const t = setTimeout(() => navigate('/login', { replace: true, state: { registered: true } }), 1500);
    return () => clearTimeout(t);
  }, [status, navigate]);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    const errs = validateSignup(v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStatus('loading'); setServerError('');
    try {
      await register({ username: v.username, email: v.email.trim(), password: v.password });
      setStatus('success'); // account created, but NOT logged in
    } catch (err) {
      if (err.details && typeof err.details === 'object') setErrors(err.details);
      setServerError(err.message); setStatus('error');
    }
  };

  if (status === 'success')
    return (
      <section className="auth-card card center">
        <h1>Account created 🎉</h1>
        <p className="muted" role="status">Now log in with your new account…</p>
        <Link to="/login" state={{ registered: true }} className="btn btn-primary">Go to Login</Link>
      </section>
    );

  return (
    <section className="auth-card card">
      <h1>Create your account</h1>
      <form onSubmit={submit} noValidate>
        <Field label="Username" value={v.username} onChange={set('username')} error={errors.username} autoComplete="username" />
        <Field label="Email" type="email" value={v.email} onChange={set('email')} error={errors.email} autoComplete="email" />
        <PasswordField label="Password" value={v.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
        <PasswordField label="Confirm password" value={v.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />
        {serverError && <p className="error box" role="alert">{serverError}</p>}
        <button className="btn btn-primary btn-block" disabled={status === 'loading'}>
          {status === 'loading' ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>
      <p className="muted center">Already registered? <Link to="/login">Login</Link></p>
    </section>
  );
}