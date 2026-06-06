import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { isPricingAdmin } from '../../utils/roles';
import { FullScreenLoading } from '../ui';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <FullScreenLoading text="Loading..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isPricingAdmin(user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <ShieldOff className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Admin access only</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm">
          Pricing Master is restricted to Super Admin and Admin users.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-[#1e5a9e] px-4 py-2 text-sm font-medium text-white hover:bg-[#174a82]"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;
