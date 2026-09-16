/**
 * Authentication context.
 *
 * Holds the session, exposes `hasPermission` / `hasRole` helpers for *UI
 * convenience only* - every sensitive operation is still authorised by the
 * backend, which re-checks the same grant table.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearAuth,
  readAuth,
  setUnauthorizedHandler,
  writeAuth,
} from '../services/apiClient';
import { authApi } from '../services';

const AuthContext = createContext(null);

export const ROLES = {
  CONSUMER: 'CONSUMER',
  RETAIL_MANAGER: 'RETAIL_MANAGER',
  WAREHOUSE_OPERATOR: 'WAREHOUSE_OPERATOR',
  QUALITY_INSPECTOR: 'QUALITY_INSPECTOR',
  ADMIN: 'ADMIN',
};

export const ROLE_LABELS = {
  CONSUMER: 'Consumer',
  RETAIL_MANAGER: 'Retail Manager',
  WAREHOUSE_OPERATOR: 'Warehouse Operator',
  QUALITY_INSPECTOR: 'Quality Inspector',
  ADMIN: 'Administrator',
};

/** Landing route per role. */
export const ROLE_HOME = {
  CONSUMER: '/dashboard',
  RETAIL_MANAGER: '/dashboard',
  WAREHOUSE_OPERATOR: '/dashboard',
  QUALITY_INSPECTOR: '/dashboard',
  ADMIN: '/dashboard',
};

function sessionFromAuthResponse(payload) {
  return {
    accessToken: payload.tokens.access_token,
    refreshToken: payload.tokens.refresh_token,
    expiresAt: payload.tokens.expires_at,
    user: payload.user,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readAuth());
  const [initialising, setInitialising] = useState(true);
  const [error, setError] = useState(null);

  // Force a logout when a refresh fails inside the API client.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      clearAuth();
    });
  }, []);

  // Revalidate a persisted session on boot: a stored token may be stale.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const stored = readAuth();
      if (!stored?.accessToken) {
        setInitialising(false);
        return;
      }
      try {
        const user = await authApi.me();
        if (cancelled) return;
        const next = { ...stored, user };
        writeAuth(next);
        setSession(next);
      } catch {
        if (cancelled) return;
        clearAuth();
        setSession(null);
      } finally {
        if (!cancelled) setInitialising(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username, password) => {
    setError(null);
    const payload = await authApi.login(username, password);
    const next = sessionFromAuthResponse(payload);
    writeAuth(next);
    setSession(next);
    return next.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    setError(null);
    const payload = await authApi.googleLogin(credential);
    const next = sessionFromAuthResponse(payload);
    writeAuth(next);
    setSession(next);
    return next.user;
  }, []);

  const register = useCallback(async (form) => {
    setError(null);
    const payload = await authApi.register(form);
    const next = sessionFromAuthResponse(payload);
    writeAuth(next);
    setSession(next);
    return next.user;
  }, []);

  const logout = useCallback(async () => {
    const stored = readAuth();
    try {
      if (stored?.refreshToken) await authApi.logout(stored.refreshToken);
    } catch {
      /* the local session is cleared regardless */
    }
    clearAuth();
    setSession(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const user = await authApi.me();
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, user };
      writeAuth(next);
      return next;
    });
    return user;
  }, []);

  const value = useMemo(() => {
    const user = session?.user || null;
    const permissions = new Set(user?.permissions || []);
    const role = user?.role?.name || null;

    return {
      user,
      role,
      roleLabel: role ? ROLE_LABELS[role] || role : null,
      permissions: user?.permissions || [],
      isAuthenticated: Boolean(session?.accessToken && user),
      initialising,
      error,
      setError,
      login,
      loginWithGoogle,
      register,
      logout,
      refreshUser,
      hasPermission: (...required) => required.every((p) => permissions.has(p)),
      hasAnyPermission: (...required) => required.some((p) => permissions.has(p)),
      hasRole: (...roles) => roles.includes(role),
      isAdmin: role === ROLES.ADMIN,
      isConsumer: role === ROLES.CONSUMER,
    };
  }, [session, initialising, error, login, loginWithGoogle, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
