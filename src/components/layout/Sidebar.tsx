import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  ClipboardList,
  RefreshCw,
  FileText,
  Building2,
  Plus
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className, isOpen = true, onClose }) => {
  const location = useLocation();

  const navigation: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    isGreen?: boolean;
  }> = [
    {
      name: 'Create',
      href: '/jobcards/create',
      icon: Plus,
      isGreen: true, // Special styling for Create tab
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
      name: 'Inquiries',
      href: '/inquiries',
      icon: MessageSquare,
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
    // Special handling for Create tab - active when on create page
    if (href === '/jobcards/create') {
      return location.pathname === '/jobcards/create';
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
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)]',
          // Desktop: fixed positioning
          'md:fixed md:left-0 md:top-16 md:h-[calc(100vh-4rem)] md:z-40',
          // Visibility - toggleable on both mobile and desktop
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
      <nav className="flex h-full flex-col space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const isCreateTab = item.isGreen;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isCreateTab
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5',
                  isCreateTab
                    ? 'text-green-600'
                    : active
                    ? 'text-primary-600'
                    : 'text-gray-400'
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

