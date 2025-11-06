import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import type { AuthUser } from '../../types';

interface LayoutProps {
  user: AuthUser | null;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;
      // On desktop, start with sidebar open
      if (!isMobileView) {
        setIsSidebarOpen(true);
      } else {
        // On mobile, start with sidebar closed
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Sidebar visibility - can be toggled on both mobile and desktop
  const sidebarIsOpen = isSidebarOpen;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user || undefined} 
        onLogout={onLogout}
        onMenuToggle={toggleSidebar}
        isMenuOpen={isSidebarOpen}
      />
      <div className="relative">
        {/* Sidebar - Fixed on both mobile and desktop */}
        <Sidebar 
          isOpen={sidebarIsOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        {/* Main Content - Dynamic margin based on sidebar state */}
        <main className={`w-full min-h-[calc(100vh-4rem)] px-4 md:px-6 py-6 transition-all duration-300 ${sidebarIsOpen ? 'md:ml-64' : 'md:ml-0'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export { Layout };

