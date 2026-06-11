import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, List, PlusCircle, FolderOpen, LogOut } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { AuthUser } from '../../types';

interface BlogSidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  user?: AuthUser | null;
  onLogout: () => void;
}

const navItems = [
  { name: 'Blog Dashboard', href: '/blog', icon: BookOpen },
  { name: 'Blog List', href: '/blog/list', icon: List },
  { name: 'Create Blog', href: '/blog/create', icon: PlusCircle },
  { name: 'Categories', href: '/blog/categories', icon: FolderOpen },
];

const BlogSidebar: React.FC<BlogSidebarProps> = ({
  className,
  isOpen = true,
  onClose,
  user,
  onLogout,
}) => {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/blog') return location.pathname === '/blog';
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {isOpen && onClose && (
        <div
          className="fixed inset-0 z-[45] bg-black/20 backdrop-blur-[1px] md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 z-[50] h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          className,
        )}
      >
        <div className="px-5 py-6 border-b border-gray-100">
          <img
            src="/pest-control-99-logo.png"
            alt="Pest Control 99"
            className="h-10 w-auto object-contain mb-2"
          />
          <p className="text-xs font-bold text-[#2d8a2f] uppercase tracking-wider">Blog CMS</p>
          {user && (
            <p className="text-[11px] text-gray-500 mt-1 truncate">
              {user.first_name || user.username}
              {user.role_display ? ` · ${user.role_display}` : ''}
            </p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#f0faf0] text-[#2d8a2f]'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <Icon className={cn('h-4 w-4', active ? 'text-[#2d8a2f]' : 'text-gray-400')} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default BlogSidebar;
