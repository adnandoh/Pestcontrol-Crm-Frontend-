import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FullScreenLoading } from '../ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenLoading text="Authenticating..." />;
  }

  const hasValidAuth = isAuthenticated && !!localStorage.getItem('access_token');
  
  if (!hasValidAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !user?.is_staff && requiredRole === 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export { ProtectedRoute };