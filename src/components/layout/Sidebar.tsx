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
          className="fixed inset-0 z-[15] bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'w-60 border-r border-gray-200 bg-gradient-to-b from-white to-gray-50/50 shadow-xl transition-all duration-300 ease-in-out',
          // Mobile: fixed positioning with overlay
          'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)]',
          // Desktop: fixed positioning
          'md:fixed md:left-0 md:top-16 md:h-[calc(100vh-4rem)] md:z-40',
          // Visibility - toggleable on both mobile and desktop
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        <nav className="flex h-full flex-col py-6 px-4 overflow-y-auto custom-scrollbar bg-[#ebf1f9]">
          {/* Quick Action: Create Booking (Modernized to fit new theme) */}
          <Link
            to="/jobcards/create"
            className={cn(
              'group relative mb-8 flex items-center justify-center space-x-3 rounded-lg px-4 py-3 text-xs font-bold transition-all duration-300',
              'bg-[#1a3353] text-white shadow-lg hover:bg-[#25416b] active:scale-[0.98]'
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="uppercase tracking-widest">Create Booking</span>
          </Link>

          <div className="space-y-1 group/nav">
            {navigationGroups.map((group, groupIdx) => (
              <React.Fragment key={groupIdx}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'group relative flex items-center gap-3.5 px-4 py-3.5 rounded-lg transition-all duration-200',
                        active 
                          ? 'bg-white shadow-sm border-l-4 border-[#1a3353]' 
                          : 'hover:bg-white/50 text-[#1a3353]'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center transition-transform duration-200 group-hover:scale-110',
                        active ? 'text-[#1a3353]' : 'text-[#1a3353]'
                      )}>
                        <Icon className="h-5 w-5 stroke-[2.5px]" />
                      </div>

                      <span className={cn(
                        'flex-1 text-[13px] font-bold tracking-tight transition-colors',
                        active ? 'text-[#1a3353]' : 'text-[#1a3353] opacity-90'
                      )}>
                        {/* Convert UPPERCASE to Title Case for better readability */}
                        {item.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                      </span>

                      {/* Reference Chevron Look (Static for now as requested by design flow) */}
                      <ChevronRight className={cn(
                        'h-3.5 w-3.5 text-[#1a3353]/30 transition-transform group-hover:translate-x-0.5',
                        active && 'rotate-90 text-[#1a3353]/60'
                      )} />
                    </Link>
                  );
                })}
                
                {/* Spacer between groups like the reference flow */}
                {groupIdx < navigationGroups.length - 1 && (
                  <div className="h-4" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Institutional Branding Footer (Matches reference style) */}
          <div className="mt-auto px-4 pt-10">
            <div className="border-t border-[#1a3353]/10 pt-4 flex flex-col gap-1">
              <span className="text-[10px] font-black text-[#1a3353]/40 uppercase tracking-widest">Operator Console</span>
              <span className="text-[11px] font-bold text-[#1a3353]/80">PEST CONTROL 99</span>
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
};

export { Sidebar };
