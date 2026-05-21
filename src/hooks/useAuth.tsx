import { useState, useEffect, useLayoutEffect, useContext, createContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { enhancedApiService } from '../services/api.enhanced';
import {
  performSilentRefresh,
  refreshAccessTokenFromStorage,
  registerAuthSessionHandlers,
  refreshSessionIfNeeded,
  scheduleProactiveAccessRefresh,
  shouldRefreshAccessToken,
  SESSION_EXPIRED_MESSAGE,
} from '../services/authSession';
import type { AuthUser, LoginCredentials } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: (message?: string) => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const isAuthenticated = !!user && !!localStorage.getItem('access_token');

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await enhancedApiService.login(credentials);
      setUser(response.user);
      window.dispatchEvent(new Event('pest99-theme-sync'));
      localStorage.setItem('user_info', JSON.stringify(response.user));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback((message?: string) => {
    enhancedApiService.logout();
    setUser(null);
    if (message) {
      sessionStorage.setItem('auth_logout_message', message);
    }
    window.location.href = '/login';
  }, []);

  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      await refreshAccessTokenFromStorage();
      const userInfoStr = localStorage.getItem('user_info');
      if (userInfoStr) {
        setUser(JSON.parse(userInfoStr));
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout(SESSION_EXPIRED_MESSAGE);
      throw error;
    }
  }, [logout]);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);

      const token = localStorage.getItem('access_token');
      const refresh = localStorage.getItem('refresh_token');
      const userInfoStr = localStorage.getItem('user_info');

      if (!token || !refresh) {
        if (token || refresh) {
          enhancedApiService.logout();
        }
        setUser(null);
        return;
      }

      if (!userInfoStr) {
        logout(SESSION_EXPIRED_MESSAGE);
        return;
      }

      let storedUser: AuthUser;
      try {
        storedUser = JSON.parse(userInfoStr);
      } catch {
        logout(SESSION_EXPIRED_MESSAGE);
        return;
      }

      if (shouldRefreshAccessToken()) {
        const ok = await performSilentRefresh();
        if (!ok) {
          logout(SESSION_EXPIRED_MESSAGE);
          return;
        }
      } else {
        scheduleProactiveAccessRefresh();
      }

      setUser(storedUser);
    } catch (error) {
      console.warn('Auth check failed:', error);
      logout(SESSION_EXPIRED_MESSAGE);
      return;
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [logout]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' && !e.newValue) {
        setUser(null);
      } else if (e.key === 'user_info' && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue));
        } catch (error) {
          console.warn('Failed to parse updated user info:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      checkAuthStatus();
    }
  }, [checkAuthStatus, isInitialized]);

  useLayoutEffect(() => {
    registerAuthSessionHandlers({ logout: (message) => logout(message) });
  }, [logout]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshSessionIfNeeded().then((ok) => {
        if (!ok && localStorage.getItem('refresh_token') && shouldRefreshAccessToken()) {
          logout(SESSION_EXPIRED_MESSAGE);
        }
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [logout]);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
