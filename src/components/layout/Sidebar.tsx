import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  ClipboardList,
  RefreshCw,
  FileText,
  Building2,
  Plus,
  LayoutDashboard,
  Users,
  Zap,
  ChevronRight
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
        { name: 'DASHBOARD', href: '/', icon: LayoutDashboard },
        { name: 'VIEW BOOKINGS', href: '/jobcards', icon: ClipboardList },
        { name: 'CRM INQUIRIES', href: '/crm-inquiries', icon: Zap },
        { name: 'WEBSITE LEADS', href: '/inquiries', icon: MessageSquare },
      ]
    },
    {
      items: [
        { name: 'SOCIETY ORDERS', href: '/society-jobcards', icon: Building2 },
        { name: 'CLIENT DIRECTORY', href: '/clients', icon: Users },
        { name: 'TECHNICIANS', href: '/technicians', icon: Users },
      ]
    },
    {
      items: [
        { name: 'RENEWALS', href: '/renewals', icon: RefreshCw },
        { name: 'REFERENCES', href: '/references', icon: FileText },
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
          className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-[2px] md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'w-64 bg-white border-r border-gray-100 shadow-2xl transition-all duration-300 ease-in-out',
          'fixed left-0 top-16 z-50 h-[calc(100vh-4rem)]',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <div className="flex h-full flex-col p-4 bg-white">
          {/* Main Action Component */}
          <Link
            to="/jobcards/create"
            className="group mb-8 flex items-center justify-center gap-2 bg-[#00d084]/10 hover:bg-[#00d084]/20 text-[#00a86b] px-4 py-2.5 rounded-lg border border-[#00d084]/20 transition-all duration-300 shadow-sm"
          >
            <Plus className="h-4 w-4 stroke-[3px]" />
            <span className="text-[12px] font-black uppercase tracking-wider">Create Booking</span>
          </Link>

          <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-1">
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
                        'group flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200 border-l-4',
                        active 
                          ? 'bg-blue-50 border-blue-600 shadow-sm' 
                          : 'border-transparent hover:bg-gray-50 text-gray-400 hover:text-gray-600'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center transition-transform duration-200',
                        active ? 'text-blue-600 scale-110' : 'group-hover:scale-110'
                      )}>
                        <Icon className={cn("h-4.5 w-4.5 stroke-[2.5px]", active ? "text-blue-600" : "")} />
                      </div>

                      <span className={cn(
                        'flex-1 text-[11px] font-bold tracking-tight',
                        active ? 'text-blue-700' : 'text-gray-600'
                      )}>
                        {item.name}
                      </span>

                      {active && (
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Institutional Branding Footer */}
          <div className="mt-auto pt-6 border-t border-gray-50">
            <div className="flex flex-col gap-0.5 opacity-60">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Console v2.4</span>
              <span className="text-[11px] font-black text-blue-900 italic tracking-tighter uppercase">PestControl99</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export { Sidebar };
