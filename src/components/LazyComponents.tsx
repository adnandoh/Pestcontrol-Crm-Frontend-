import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

// Loading component for lazy loading
const LoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      gap: 2,
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

// Higher-order component for lazy loading with error boundary
const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string
) => {
  const LazyComponent = (props: P) => (
    <Suspense fallback={<LoadingFallback message={loadingMessage} />}>
      <Component {...props} />
    </Suspense>
  );
  
  LazyComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  return LazyComponent;
};

// Lazy load page components
export const LazyDashboard = withLazyLoading(
  lazy(() => import('../pages/Dashboard')),
  'Loading dashboard...'
);

export const LazyJobCards = withLazyLoading(
  lazy(() => import('../pages/JobCards')),
  'Loading job cards...'
);

export const LazySocietyJobCards = withLazyLoading(
  lazy(() => import('../pages/SocietyJobCards')),
  'Loading society job cards...'
);

export const LazyCreateJobCard = withLazyLoading(
  lazy(() => import('../pages/CreateJobCard')),
  'Loading job card form...'
);

export const LazyEditJobCard = withLazyLoading(
  lazy(() => import('../pages/EditJobCard')),
  'Loading job card editor...'
);

export const LazyJobCardDetail = withLazyLoading(
  lazy(() => import('../pages/JobCardDetail')),
  'Loading job card details...'
);

export const LazyRenewals = withLazyLoading(
  lazy(() => import('../pages/Renewals')),
  'Loading renewals...'
);

export const LazyInquiries = withLazyLoading(
  lazy(() => import('../pages/Inquiries')),
  'Loading inquiries...'
);

export const LazyLogin = withLazyLoading(
  lazy(() => import('../pages/Login')),
  'Loading login...'
);

// Lazy load heavy components
export const LazyModernTable = withLazyLoading(
  lazy(() => import('./ModernTable')),
  'Loading table...'
);

export const LazyOptimizedTable = withLazyLoading(
  lazy(() => import('./OptimizedTable')),
  'Loading table...'
);

// Lazy load layout components
export const LazyLayout = withLazyLoading(
  lazy(() => import('./Layout/Layout')),
  'Loading layout...'
);

export const LazySidebar = withLazyLoading(
  lazy(() => import('./Layout/Sidebar')),
  'Loading navigation...'
);

export const LazyAppBar = withLazyLoading(
  lazy(() => import('./Layout/AppBar')),
  'Loading header...'
);
