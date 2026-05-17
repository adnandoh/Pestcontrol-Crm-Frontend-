import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { FullScreenLoading } from '../ui';
import { isBlogUser, isBlogCMSRoute, blogUserDefaultPath } from '../../utils/roles';

interface BlogRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps blog CMS routes — only blog_user and operational users may access.
 * Operational users can still open /blog/* from the main CRM.
 */
export const BlogRouteGuard: React.FC<BlogRouteGuardProps> = ({ children }) => {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenLoading text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

interface CRMRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Blocks blog_user from all operational CRM routes; redirects to blog dashboard.
 */
export const CRMRouteGuard: React.FC<CRMRouteGuardProps> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullScreenLoading text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isBlogUser(user) && !isBlogCMSRoute(location.pathname)) {
    return <Navigate to={blogUserDefaultPath()} replace />;
  }

  return <>{children}</>;
};

export default BlogRouteGuard;
