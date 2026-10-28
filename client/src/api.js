const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  constructor(message, status, details) { super(message); this.status = status; this.details = details; }
}

export const tokenStore = {
  get() { try { return localStorage.getItem('token'); } catch { return null; } },
  set(t) { try { localStorage.setItem('token', t); } catch { /* storage blocked */ } },
  clear() { try { localStorage.removeItem('token'); } catch { /* storage blocked */ } },
};

export async function api(path, { method = 'GET', body } = {}) {
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth/login')) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.details);
  }
  if (data === null) throw new ApiError('Unexpected response from server', res.status);
  return data;
}
