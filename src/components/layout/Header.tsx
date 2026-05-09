import React from 'react';
import { LogOut, Settings } from 'lucide-react';
import { Button } from '../ui';
import { GlobalSearch } from './GlobalSearch';
import type { AuthUser } from '../../types';

interface HeaderProps {
  user?: AuthUser;
  onLogout: () => void;
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
  onSelectClient?: (clientId: number) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onMenuToggle, isMenuOpen = false, onSelectClient }) => {
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const userName = user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'User';
  const userRole = user?.is_staff ? 'Admin' : 'User';

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Left side - Logo and Menu toggle */}
        <div className="flex items-center space-x-4">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="group relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:scale-105 active:scale-95"
              aria-label="Toggle menu"
            >
              <div className="relative h-5 w-5">
                {/* Animated hamburger/close icon */}
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : 'translate-y-0'
                    }`}
                />
                <span
                  className={`absolute left-0 top-2 h-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ${isMenuOpen ? 'w-0 opacity-0' : 'w-5 opacity-100'
                    }`}
                />
                <span
                  className={`absolute left-0 top-4 h-0.5 w-5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : 'translate-y-0'
                    }`}
                />
              </div>
              {/* Ripple effect on hover */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/10 group-hover:to-indigo-500/10 transition-all duration-300" />
            </button>
          )}
          {/* Logo - No text */}
          <div className="flex items-center">
            <img
              src="/logo pest99.png"
              alt="Pest99 Logo"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                // Fallback if image doesn't load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Global Search */}
        {onSelectClient && (
          <GlobalSearch onSelectClient={onSelectClient} />
        )}

        {/* Right side - User Profile */}
        <div className="relative" ref={menuRef}>
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
            <div className="hidden md:block text-left italic">
              <div className="text-xs font-black text-gray-800 uppercase tracking-tight leading-none mb-0.5">
                {userName}
              </div>
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">
                {userRole}
              </div>
            </div>
          </Button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white p-1 shadow-lg z-50">
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