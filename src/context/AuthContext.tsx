import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  AuthUser,
  RoleMetadata,
  DemoAccountCredential,
  PreviewEmailMessage,
  RedisSessionRecord,
  PermissionModule,
  UserRole,
} from '../types/campus.ts';

interface AuthContextValue {
  user: AuthUser | null;
  roleMetadata: RoleMetadata | null;
  accessToken: string | null;
  refreshToken: string | null;
  session: RedisSessionRecord | null;
  socket: Socket | null;
  isConnected: boolean;
  demoAccounts: DemoAccountCredential[];
  previewInbox: PreviewEmailMessage[];
  unreadInboxCount: number;
  authNotice: string | null;
  clearAuthNotice: () => void;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; requiresVerification?: boolean }>;
  loginAsRole: (role: UserRole) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  rotateTokenManually: () => Promise<{ ok: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ ok: boolean; message?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ ok: boolean; message?: string; error?: string }>;
  requestVerification: (email: string) => Promise<{ ok: boolean; message?: string; error?: string }>;
  verifyEmail: (token: string) => Promise<{ ok: boolean; message?: string; error?: string }>;
  refreshInbox: () => Promise<void>;
  markInboxRead: (id: string) => void;
  hasPermission: (perm: PermissionModule) => boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  ACCESS: 'campus360_access_token',
  REFRESH: 'campus360_refresh_token',
  USER: 'campus360_user',
  ROLE_META: 'campus360_role_meta',
  SESSION: 'campus360_session',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const [roleMetadata, setRoleMetadata] = useState<RoleMetadata | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ROLE_META);
      return raw ? (JSON.parse(raw) as RoleMetadata) : null;
    } catch {
      return null;
    }
  });

  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.ACCESS)
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.REFRESH)
  );
  const [session, setSession] = useState<RedisSessionRecord | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      return raw ? (JSON.parse(raw) as RedisSessionRecord) : null;
    } catch {
      return null;
    }
  });

  const [demoAccounts, setDemoAccounts] = useState<DemoAccountCredential[]>([]);
  const [previewInbox, setPreviewInbox] = useState<PreviewEmailMessage[]>([]);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const accessTokenRef = useRef(accessToken);
  const refreshTokenRef = useRef(refreshToken);
  accessTokenRef.current = accessToken;
  refreshTokenRef.current = refreshToken;

  const persistSessionState = useCallback(
    (
      nextUser: AuthUser | null,
      nextMeta: RoleMetadata | null,
      nextAccess: string | null,
      nextRefresh: string | null,
      nextSession: RedisSessionRecord | null
    ) => {
      setUser(nextUser);
      setRoleMetadata(nextMeta);
      setAccessToken(nextAccess);
      setRefreshToken(nextRefresh);
      setSession(nextSession);

      if (nextUser && nextAccess && nextRefresh) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(nextUser));
        localStorage.setItem(STORAGE_KEYS.ROLE_META, JSON.stringify(nextMeta));
        localStorage.setItem(STORAGE_KEYS.ACCESS, nextAccess);
        localStorage.setItem(STORAGE_KEYS.REFRESH, nextRefresh);
        if (nextSession) {
          localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(nextSession));
        }
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.ROLE_META);
        localStorage.removeItem(STORAGE_KEYS.ACCESS);
        localStorage.removeItem(STORAGE_KEYS.REFRESH);
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    },
    []
  );

  const refreshInbox = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/preview-inbox');
      if (res.ok) {
        const data = await res.json();
        setPreviewInbox(data.messages || []);
      }
    } catch {
      // ignore offline error
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/demo-accounts')
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts) setDemoAccounts(d.accounts);
      })
      .catch(() => {});
    refreshInbox();
  }, [refreshInbox]);

  // Connect Socket.IO with current JWT Access Token
  useEffect(() => {
    const newSocket = io({
      auth: accessToken ? { token: accessToken } : {},
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('session:revoked', (payload: { reason?: string }) => {
      persistSessionState(null, null, null, null, null);
      setAuthNotice(payload?.reason || 'Your session was revoked by a System Administrator.');
    });

    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [accessToken, persistSessionState]);

  const rotateTokenManually = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const currentRefresh = refreshTokenRef.current;
    if (!currentRefresh) {
      return { ok: false, error: 'No refresh token available' };
    }
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefresh }),
      });
      const data = await res.json();
      if (!res.ok) {
        persistSessionState(null, null, null, null, null);
        return { ok: false, error: data.error || 'Refresh token rotation failed' };
      }
      persistSessionState(
        data.user,
        data.roleMetadata,
        data.accessToken,
        data.refreshToken,
        data.session
      );
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error during token rotation' };
    }
  }, [persistSessionState]);

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers || {});
      if (accessTokenRef.current) {
        headers.set('Authorization', `Bearer ${accessTokenRef.current}`);
      }
      if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }

      let res = await fetch(url, { ...options, headers });
      if (res.status === 401 && refreshTokenRef.current) {
        const rotated = await rotateTokenManually();
        if (rotated.ok && accessTokenRef.current) {
          headers.set('Authorization', `Bearer ${accessTokenRef.current}`);
          res = await fetch(url, { ...options, headers });
        }
      }
      return res;
    },
    [rotateTokenManually]
  );

  // Verify stored session on boot
  useEffect(() => {
    if (!accessToken) return;
    authFetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) {
          persistSessionState(null, null, null, null, null);
          return;
        }
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setRoleMetadata(data.roleMetadata);
          if (data.session) setSession(data.session);
        }
      })
      .catch(() => {});
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.requiresVerification) {
            await refreshInbox();
          }
          return {
            ok: false,
            error: data.error || 'Authentication failed',
            requiresVerification: data.requiresVerification,
          };
        }

        persistSessionState(
          data.user,
          data.roleMetadata,
          data.accessToken,
          data.refreshToken,
          data.session
        );
        setAuthNotice(null);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Unable to reach Campus360 authentication server' };
      }
    },
    [persistSessionState, refreshInbox]
  );

  const loginAsRole = useCallback(
    async (role: UserRole) => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        const data = await res.json();
        if (!res.ok) {
          return { ok: false, error: data.error || 'Demo login failed' };
        }
        persistSessionState(
          data.user,
          data.roleMetadata,
          data.accessToken,
          data.refreshToken,
          data.session
        );
        setAuthNotice(null);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Unable to reach Campus360 server' };
      }
    },
    [persistSessionState]
  );

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: refreshTokenRef.current,
          sessionId: session?.id,
        }),
      });
    } catch {
      // ignore network error on logout
    }
    persistSessionState(null, null, null, null, null);
  }, [persistSessionState, session?.id]);

  const forgotPassword = useCallback(
    async (email: string) => {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      await refreshInbox();
      if (!res.ok) return { ok: false, error: data.error };
      return { ok: true, message: data.message };
    },
    [refreshInbox]
  );

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    // Refresh demo accounts so updated password is reflected
    fetch('/api/auth/demo-accounts')
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts) setDemoAccounts(d.accounts);
      })
      .catch(() => {});
    return { ok: true, message: data.message };
  }, []);

  const requestVerification = useCallback(
    async (email: string) => {
      const res = await fetch('/api/auth/request-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      await refreshInbox();
      if (!res.ok) return { ok: false, error: data.error };
      return { ok: true, message: data.message };
    },
    [refreshInbox]
  );

  const verifyEmail = useCallback(async (token: string) => {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    return { ok: true, message: data.message };
  }, []);

  const markInboxRead = useCallback((id: string) => {
    setPreviewInbox((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  }, []);

  const hasPermission = useCallback(
    (perm: PermissionModule) => {
      if (!user) return false;
      return user.permissions.includes(perm);
    },
    [user]
  );

  const unreadInboxCount = previewInbox.filter((m) => !m.read).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        roleMetadata,
        accessToken,
        refreshToken,
        session,
        socket,
        isConnected,
        demoAccounts,
        previewInbox,
        unreadInboxCount,
        authNotice,
        clearAuthNotice: () => setAuthNotice(null),
        login,
        loginAsRole,
        logout,
        rotateTokenManually,
        forgotPassword,
        resetPassword,
        requestVerification,
        verifyEmail,
        refreshInbox,
        markInboxRead,
        hasPermission,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
