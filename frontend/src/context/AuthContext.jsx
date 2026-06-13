import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { TOKEN_KEY, PERMISSIONS_KEY, ROLE_KEY } from '../config/env';
import * as authService from '../services/authService';
import { decodeJwtPayload } from '../lib/jwt';
import { normalizeRoleFromJwt, isPrivilegedRole } from '../lib/rbac';
import * as businessService from '../services/businessService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [permissions, setPermissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PERMISSIONS_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      if (token && !permissions.length) {
        try {
          const me = await businessService.fetchRbacMe();
          if (me?.permissions) {
            setPermissions(me.permissions);
            localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(me.permissions));
          }
          if (me?.user?.role) {
            localStorage.setItem(ROLE_KEY, me.user.role);
          }
        } catch {
          /* rbac/me optional before migration */
        }
      }
      setBooting(false);
    })();
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setToken(null);
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const applyAuthPayload = useCallback((data) => {
    if (!data.token) return data;
    localStorage.setItem(TOKEN_KEY, data.token);
    if (data.permissions) {
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(data.permissions));
      setPermissions(data.permissions);
    }
    if (data.role) localStorage.setItem(ROLE_KEY, data.role);
    setToken(data.token);
    return data;
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await authService.login(username, password);
    if (!data.success) throw new Error(data.message || 'Sign in failed');
    if (data.challengeRequired && data.pendingToken) {
      return { challengeRequired: true, ...data };
    }
    if (!data.token) throw new Error(data.message || 'Sign in failed');
    if (data.emailAlreadyVerified) {
      return {
        success: true,
        emailAlreadyVerified: true,
        emailMasked: data.emailMasked,
        pendingAuth: data,
      };
    }
    return applyAuthPayload(data);
  }, [applyAuthPayload]);

  const completeLoginChallenge = useCallback(
    async ({ pendingToken, code, method }) => {
      const { verifyLoginChallenge } = await import('../services/securityService');
      const data = await verifyLoginChallenge({ pendingToken, code, method });
      if (data.emailJustVerified) {
        return {
          success: true,
          emailJustVerified: true,
          emailMasked: data.emailMasked,
          pendingAuth: data,
        };
      }
      return applyAuthPayload(data);
    },
    [applyAuthPayload]
  );

  const finalizePendingAuth = useCallback(
    (pendingAuth) => {
      if (!pendingAuth?.token) return null;
      return applyAuthPayload(pendingAuth);
    },
    [applyAuthPayload]
  );

  const logout = useCallback(async () => {
    if (token) await authService.logout();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PERMISSIONS_KEY);
    localStorage.removeItem(ROLE_KEY);
    sessionStorage.clear();
    setToken(null);
    setPermissions([]);
  }, [token]);

  const role = useMemo(() => {
    if (!token) return null;
    const stored = localStorage.getItem(ROLE_KEY);
    if (stored) return stored;
    const payload = decodeJwtPayload(token);
    return normalizeRoleFromJwt(payload?.role) || 'SALESPERSON';
  }, [token]);

  const hasPermission = useCallback(
    (perm) => {
      if (isPrivilegedRole(role)) return true;
      const list = Array.isArray(perm) ? perm : [perm];
      return list.some((p) => permissions.includes(p));
    },
    [role, permissions]
  );

  const value = useMemo(
    () => ({
      token,
      role,
      permissions,
      hasPermission,
      isAuthenticated: Boolean(token),
      booting,
      login,
      completeLoginChallenge,
      finalizePendingAuth,
      logout,
    }),
    [token, role, permissions, hasPermission, booting, login, completeLoginChallenge, finalizePendingAuth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
