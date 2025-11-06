import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Breadcrumb } from './Breadcrumb';
import { AuthUser } from '../../types';
import { cn } from '../../utils/cn';

interface LayoutProps {
  children: React.ReactNode;
  user?: AuthUser;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={toggleSidebar}
      />
      
      {/* Main Content */}
      <div className={cn(
        'transition-all duration-300 min-h-screen',
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      )}>
        {/* Header */}
        <Header user={user} onLogout={onLogout} />
        
        {/* Breadcrumb */}
        <div className="px-6 py-4 bg-white border-b">
          <Breadcrumb />
        </div>
        
        {/* Page Content */}
        <main className="p-6 overflow-x-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export { Layout };