import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        const userId = localStorage.getItem('user_id');
        const username = localStorage.getItem('username');
        const isStaff = localStorage.getItem('is_staff') === 'true';
        
        // Check if user has valid tokens
        const isAuthenticated = authService.isAuthenticated();

        if (isMounted) {
          if (userId && username && isAuthenticated) {
            // Ensure token is valid before setting user
            const validToken = await authService.ensureValidToken();
            if (validToken) {
              setUser({
                id: parseInt(userId),
                username,
                is_staff: isStaff,
              });
            } else {
              // Tokens are invalid, clear them
              authService.logout();
            }
          }
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error initializing auth:', error);
          // Clear invalid tokens on error
          authService.logout();
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
    };
  }, []);

  // Monitor user state changes with cleanup
  useEffect(() => {
    let isMounted = true;
    
    if (isMounted && process.env.NODE_ENV === 'development') {
      console.log('User state changed:', user);
    }
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Periodic token refresh to keep tokens fresh
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        await authService.ensureValidToken();
      } catch (error) {
        console.error('Periodic token refresh failed:', error);
        // If periodic refresh fails, user might need to re-login
        // But don't force logout immediately, let the interceptor handle it
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Attempting login...');
      const data = await authService.login(username, password);
      console.log('Login successful, user data:', data);
      setUser({
        id: data.user_id,
        username: data.username,
        is_staff: data.is_staff,
      });
      console.log('Navigating to dashboard...');
      navigate('/');
    } catch (err) {
      setError('Invalid username or password');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    navigate('/login');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};