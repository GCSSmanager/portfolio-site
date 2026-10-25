
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  api, setToken, removeToken, hasToken,
  setUser as storeUser, removeUser, getStoredUser,
} from '@/lib/api';
import type { UserInfo, UserRole } from '@/types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!hasToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const { user: u } = await api.verifyToken();
        setUser(u);
        storeUser(u);
        setIsAuthenticated(true);
      } catch {
        removeToken();
        removeUser();
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async (loginStr: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.login(loginStr, password);
      setToken(response.token);
      storeUser(response.user);
      setUser(response.user);
      setIsAuthenticated(true);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    removeToken();
    removeUser();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const hasRole = useCallback((...roles: UserRole[]) => {
    return !!user && roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, logout, error, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}