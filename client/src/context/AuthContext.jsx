import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, tokenStore } from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  // Restore the session on page load
  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/auth/me').then((d) => setUser(d.user)).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const acceptSession = useCallback((data) => { tokenStore.set(data.token); setUser(data.user); }, []);
  const login = useCallback(async (identifier, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { identifier, password } });
    acceptSession(data);
  }, [acceptSession]);
  // register() only creates the account; the page calls acceptSession() after showing the success state
  const register = useCallback((values) => api('/auth/register', { method: 'POST', body: values }), []);
  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, acceptSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
