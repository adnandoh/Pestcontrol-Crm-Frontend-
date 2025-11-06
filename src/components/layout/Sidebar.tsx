import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  MessageSquare,
  ClipboardList,
  Building2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  UserCheck
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const location = useLocation();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home
    },
    {
      name: 'Job Cards',
      href: '/jobcards',
      icon: ClipboardList
    },
    {
      name: 'Society Job Cards',
      href: '/society-jobcards',
      icon: Building2
    },
    {
      name: 'Inquiries',
      href: '/inquiries',
      icon: MessageSquare
    },
    {
      name: 'Renewals',
      href: '/renewals',
      icon: RefreshCw
    },
    {
      name: 'References',
      href: '/references',
      icon: UserCheck
    },
    {
      name: 'Clients',
      href: '/clients',
      icon: Users
    },
  ];

  return (
    <div className={cn(
      'fixed left-0 top-0 z-50 h-screen bg-card border-r transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex h-24 items-center justify-between px-4 border-b">
        {!isCollapsed && (
          <Link to="/" className="flex items-center justify-center">
            <img
              src="/logo pest99.png"
              alt="Pest99 Logo"
              className="h-24 w-24 object-contain"
            />
          </Link>
        )}

        <button
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-accent transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {/* Create Job Card Button */}
        <Link
          to="/jobcards/create"
          className={cn(
            'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors mb-4',
            location.pathname === '/jobcards/create'
              ? 'bg-green-100 text-green-900 border-r-2 border-green-600'
              : 'bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800'
          )}
          title={isCollapsed ? 'Create Job Card' : undefined}
        >
          <Plus className={cn('h-5 w-5', isCollapsed ? 'mx-auto' : 'mr-3')} />
          {!isCollapsed && (
            <span className="font-medium">Create Job Card</span>
          )}
        </Link>

        {/* Regular Navigation Items */}
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className={cn('h-5 w-5', isCollapsed ? 'mx-auto' : 'mr-3')} />
              {!isCollapsed && (
                <span className="font-medium">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div >
  );
};

export { Sidebar };