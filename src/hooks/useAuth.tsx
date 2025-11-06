import { useState, useEffect, useContext, createContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { enhancedApiService } from '../services/api.enhanced';
import type { AuthUser, LoginCredentials } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
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
      
      // Store user in localStorage for persistence
      localStorage.setItem('user_info', JSON.stringify(response.user));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    enhancedApiService.logout();
    setUser(null);
    // Force redirect to login
    window.location.href = '/login';
  }, []);

  const refreshToken = async (): Promise<void> => {
    try {
      const response = await enhancedApiService.refreshToken();
      setUser(response.user);
      
      // Update user in localStorage
      localStorage.setItem('user_info', JSON.stringify(response.user));
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      throw error;
    }
  };

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('access_token');
      const userInfoStr = localStorage.getItem('user_info');
      
      if (!token) {
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      // If we have user info in localStorage, use it immediately
      if (userInfoStr) {
        try {
          const storedUser = JSON.parse(userInfoStr);
          setUser(storedUser);
        } catch (e) {
          console.warn('Failed to parse stored user info:', e);
          logout();
        }
      } else {
        // No user info available, logout
        logout();
      }
    } catch (error) {
      console.warn('Auth check failed:', error);
      logout();
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [logout]);

  // Listen for storage changes (logout in other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token' && !e.newValue) {
        // Token was removed in another tab
        setUser(null);
      } else if (e.key === 'user_info' && e.newValue) {
        // User info was updated in another tab
        try {
          const updatedUser = JSON.parse(e.newValue);
          setUser(updatedUser);
        } catch (error) {
          console.warn('Failed to parse updated user info:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Check auth status on mount
  useEffect(() => {
    if (!isInitialized) {
      checkAuthStatus();
    }
  }, [checkAuthStatus, isInitialized]);

  // Removed periodic token refresh - API interceptor handles token refresh automatically on 401 errors

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