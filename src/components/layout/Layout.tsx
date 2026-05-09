import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CustomerHistoryDrawer } from '../clients/CustomerHistoryDrawer';
import type { AuthUser } from '../../types';

interface LayoutProps {
  user: AuthUser | null;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, onLogout, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

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

  const handleSelectClient = (clientId: number) => {
    setSelectedClientId(clientId);
    setIsHistoryDrawerOpen(true);
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
        onSelectClient={handleSelectClient}
      />
      {/* Sidebar - Fixed on both mobile and desktop */}
      <Sidebar
        isOpen={sidebarIsOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
      />
      {/* Main Content - Dynamic margin based on sidebar state, fixed positioning for proper scrolling */}
      <main
        className={`fixed top-16 right-0 bottom-0 overflow-y-auto transition-all duration-300 px-4 py-4 ${sidebarIsOpen ? 'md:left-[220px]' : 'left-0'
          }`}
        style={{
          scrollBehavior: 'smooth'
        }}
      >
        <div className="w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Global Customer History Drawer */}
      <CustomerHistoryDrawer
        clientId={selectedClientId}
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
      />
    </div>
  );
};

export { Layout };
