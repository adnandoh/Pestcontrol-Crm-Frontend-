import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isBlogUser, blogUserDefaultPath } from '../utils/roles';

const Forbidden: React.FC = () => {
  const { user } = useAuth();
  const home = isBlogUser(user) ? blogUserDefaultPath() : '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center max-w-md">
        <ShieldOff className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">You do not have permission to view this page.</p>
        <Link
          to={home}
          className="inline-flex items-center justify-center rounded-md bg-[#2d8a2f] text-white px-4 py-2 text-sm font-medium hover:bg-[#246b27]"
        >
          Go to {isBlogUser(user) ? 'Blog CMS' : 'Dashboard'}
        </Link>
      </div>
    </div>
  );
};

export default Forbidden;
