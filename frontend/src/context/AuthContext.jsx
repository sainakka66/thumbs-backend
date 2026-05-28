import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TOKEN_KEY } from '../config/env';
import * as authService from '../services/authService';
import { decodeJwtPayload } from '../lib/jwt';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    setBooting(false);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setToken(null);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await authService.login(username, password);
    if (!data.success || !data.token) {
      throw new Error(data.message || 'Sign in failed');
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    return data;
  }, []);

  const logout = useCallback(async () => {
    if (token) await authService.logout();
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.clear();
    setToken(null);
  }, [token]);

  const role = useMemo(() => {
    if (!token) return null;
    return decodeJwtPayload(token)?.role || 'user';
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      role,
      isAuthenticated: Boolean(token),
      booting,
      login,
      logout,
    }),
    [token, role, booting, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
