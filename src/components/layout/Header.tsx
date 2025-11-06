import React from 'react';
import { LogOut, Settings, Menu, X } from 'lucide-react';
import { Button } from '../ui';
import type { AuthUser } from '../../types';

interface HeaderProps {
  user?: AuthUser;
  onLogout: () => void;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onMenuToggle, isMenuOpen = false }) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const userName = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'User';
  const userRole = user?.is_staff ? 'Admin' : 'User';

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left side - Menu toggle for mobile */}
        <div className="flex items-center space-x-4">
          {onMenuToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuToggle}
              className="md:hidden"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          )}
          <div className="hidden md:block flex-1">
            {/* This space can be used for breadcrumbs or other content */}
          </div>
        </div>

        {/* Right side - User Profile */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 hover:bg-gray-100"
          >
            <div className="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-gray-900">
                {userName}
              </div>
              <div className="text-xs text-gray-500">
                {userRole}
              </div>
            </div>
          </Button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white p-1 shadow-lg">
              <div className="px-3 py-3">
                <div className="text-sm font-medium text-gray-900">
                  {userName}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {user?.email}
                </div>
                <div className="text-xs text-gray-500">
                  {userRole}
                </div>
              </div>
              <div className="my-1 h-px bg-gray-200" />
              <button className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-gray-100 transition-colors">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </button>
              <button
                onClick={onLogout}
                className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-gray-100 transition-colors text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export { Header };