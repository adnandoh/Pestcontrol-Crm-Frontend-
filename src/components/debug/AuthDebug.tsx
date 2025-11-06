import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const AuthDebug: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-sm">
      <h4 className="font-bold mb-2">Auth Debug</h4>
      <div className="space-y-1">
        <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
        <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
        <div>Has User: {user ? 'Yes' : 'No'}</div>
        <div>Access Token: {localStorage.getItem('access_token') ? 'Present' : 'Missing'}</div>
        <div>Refresh Token: {localStorage.getItem('refresh_token') ? 'Present' : 'Missing'}</div>
        <div>User Info: {localStorage.getItem('user_info') ? 'Present' : 'Missing'}</div>
        {user && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div>Username: {user.username}</div>
            <div>ID: {user.id}</div>
            <div>Staff: {user.is_staff ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export { AuthDebug };