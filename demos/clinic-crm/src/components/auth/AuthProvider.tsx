import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import type { UserRole } from "../../lib/roles";
import { clearAuthToken, getAuthToken, setAuthToken } from "../../lib/auth-token";
import { setDiagnosticBookingMode } from "../../lib/features";
import { resources } from "../../lib/resources";

interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  employeeId?: string | null;
  employeeName?: string | null;
  employeeFullName?: string | null;
  employeeActive?: boolean | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SKIP_AUTO_LOGIN = "clinic-demo.skipAutoLogin";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const resetAuth = useCallback(() => {
    clearAuthToken();
    setUser(null);
    setLoading(false);
  }, []);

  const loadFeatures = useCallback(async () => {
    try {
      const data = await resources.settings.features();
      setDiagnosticBookingMode(data.diagnosticBookingMode);
    } catch {
      /* default */
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await api.get<{ user: AuthUser }>("/api/auth/me");
    setUser(response.data.user);
    await loadFeatures();
  }, [loadFeatures]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!getAuthToken() && sessionStorage.getItem(SKIP_AUTO_LOGIN) !== "1") {
          const response = await api.post<{ token: string; user: AuthUser }>("/api/auth/login", {
            username: "admin",
            password: "admin",
          });
          if (cancelled) return;
          setAuthToken(response.data.token);
          setUser(response.data.user);
          await loadFeatures();
          return;
        }

        if (!getAuthToken()) {
          if (!cancelled) setLoading(false);
          return;
        }

        const response = await api.get<{ user: AuthUser }>("/api/auth/me");
        if (cancelled) return;
        setUser(response.data.user);
        await loadFeatures();
      } catch {
        if (!cancelled) resetAuth();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadFeatures, resetAuth]);

  useEffect(() => {
    window.addEventListener("clinic-demo:auth-logout", resetAuth);
    return () => window.removeEventListener("clinic-demo:auth-logout", resetAuth);
  }, [resetAuth]);

  const login = useCallback(async (username: string, password: string) => {
    sessionStorage.removeItem(SKIP_AUTO_LOGIN);
    const response = await api.post<{ token: string; user: AuthUser }>("/api/auth/login", { username, password });
    setAuthToken(response.data.token);
    setUser(response.data.user);
    await loadFeatures();
  }, [loadFeatures]);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } finally {
      sessionStorage.setItem(SKIP_AUTO_LOGIN, "1");
      resetAuth();
    }
  }, [resetAuth]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.post("/api/auth/change-password", { currentPassword, newPassword });
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, changePassword, refreshUser }),
    [changePassword, loading, login, logout, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
