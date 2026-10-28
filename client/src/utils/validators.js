const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
const USER_RE = /^[A-Za-z0-9_]{3,20}$/;

export function validateSignup({ username, email, password, confirm }) {
  const e = {};
  if (!USER_RE.test(username)) e.username = '3-20 characters: letters, numbers or underscore';
  if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address';
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    e.password = '8-72 characters with at least one letter and one number';
  if (confirm !== password) e.confirm = 'Passwords do not match';
  return e;
}

export function validateLogin({ identifier, password }) {
  const e = {};
  if (!identifier.trim()) e.identifier = 'Enter your email or username';
  if (!password) e.password = 'Enter your password';
  return e;
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
