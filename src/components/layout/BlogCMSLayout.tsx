import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import BlogSidebar from './BlogSidebar';
import type { AuthUser } from '../../types';

interface BlogCMSLayoutProps {
  user: AuthUser | null;
  onLogout: () => void;
  children: React.ReactNode;
}

const BlogCMSLayout: React.FC<BlogCMSLayoutProps> = ({ user, onLogout, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 md:pl-64">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-gray-800 hidden md:block">
            Pest Control 99 — Content Management
          </p>
          <span className="text-[10px] font-bold uppercase text-[#2d8a2f] bg-[#f0faf0] px-2 py-1 rounded">
            Blog User
          </span>
        </div>
      </header>

      <BlogSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        onLogout={onLogout}
      />

      <main className="md:pl-64 p-4 md:p-6 max-w-[1400px]">{children}</main>
    </div>
  );
};

export default BlogCMSLayout;
