import React from 'react';
import { Header } from './Header';
import type { AuthUser } from '../../types';

interface LayoutProps {
  user: AuthUser | null;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user || undefined} onLogout={onLogout} />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export { Layout };

