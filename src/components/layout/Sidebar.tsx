import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  ClipboardList,
  RefreshCw,
  FileText,
  Building2
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className, isOpen = true, onClose }) => {
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Clients',
      href: '/clients',
      icon: Users,
    },
    {
      name: 'Inquiries',
      href: '/inquiries',
      icon: MessageSquare,
    },
    {
      name: 'Job Cards',
      href: '/jobcards',
      icon: ClipboardList,
    },
    {
      name: 'Society Job Cards',
      href: '/society-jobcards',
      icon: Building2,
    },
    {
      name: 'Renewals',
      href: '/renewals',
      icon: RefreshCw,
    },
    {
      name: 'References',
      href: '/references',
      icon: FileText,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 z-[15] bg-black bg-opacity-50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'w-64 border-r bg-white shadow-sm transition-transform duration-300',
          // Mobile: fixed positioning with overlay
          'fixed left-0 top-16 z-20 h-[calc(100vh-4rem)]',
          // Desktop: fixed but always visible
          'md:fixed md:left-0 md:top-16 md:h-[calc(100vh-4rem)] md:z-10',
          // Visibility - always visible on desktop, toggleable on mobile
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          className
        )}
      >
      <nav className="flex h-full flex-col space-y-1 p-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5',
                  active ? 'text-primary-600' : 'text-gray-400'
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
    </>
  );
};

export { Sidebar };

