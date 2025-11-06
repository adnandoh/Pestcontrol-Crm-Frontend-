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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // On desktop, always keep sidebar open
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // On desktop, sidebar should always be visible
  // On mobile, it's controlled by state
  const sidebarIsOpen = !isMobile ? true : isSidebarOpen;

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
        {/* Main Content - Always has left margin on desktop to account for fixed sidebar */}
        <main className="w-full md:ml-64 min-h-[calc(100vh-4rem)] px-4 md:px-6 py-6 transition-all duration-300">
          {children}
        </main>
      </div>
    </div>
  );
};

export { Layout };

