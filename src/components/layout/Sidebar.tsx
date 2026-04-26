import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  ClipboardList,
  RefreshCw,
  FileText,
  Building2,
  LayoutDashboard,
  Users,
  Zap,
} from 'lucide-react';

import { cn } from '../../utils/cn';

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ className, isOpen = true, onClose }) => {
  const location = useLocation();

  const navigationGroups = [
    {
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'View Bookings', href: '/jobcards', icon: ClipboardList },
        { name: 'CRM Inquiries', href: '/crm-inquiries', icon: Zap },
        { name: 'Website Leads', href: '/inquiries', icon: MessageSquare },
      ]
    },
    {
      items: [
        { name: 'Society Orders', href: '/society-jobcards', icon: Building2 },
        { name: 'Client Directory', href: '/clients', icon: Users },
        { name: 'Technicians', href: '/technicians', icon: Users },
      ]
    },
    {
      items: [
        { name: 'Renewals', href: '/renewals', icon: RefreshCw },
        { name: 'References', href: '/references', icon: FileText },
      ]
    }
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
          className="fixed inset-0 z-[45] bg-black/20 backdrop-blur-[1px] md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'w-[240px] bg-[#f8f9fa] border-r border-gray-200 transition-all duration-300 ease-in-out',
          'fixed left-0 top-16 z-50 h-[calc(100vh-4rem)]',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <div className="flex h-full flex-col px-3 py-4">


          <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
            {navigationGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150',
                        active 
                          ? 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] text-gray-900' 
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center transition-colors',
                        active ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'
                      )}>
                        <Icon className="h-[18px] w-[18px]" />
                      </div>

                      <span className={cn(
                        'flex-1 text-[13px] font-medium transition-colors',
                        active ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
                      )}>
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>



        </div>
      </aside>
    </>
  );
};

export { Sidebar };
