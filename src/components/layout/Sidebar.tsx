import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  MessageCircle,
  ClipboardList,
  RefreshCw,
  FileText,
  LayoutDashboard,
  Users,
  Zap,
  Star,
  BarChart3,
  Shield,
  History,
  ChevronDown,
  ChevronRight,
  Database,
  BookOpen,
  UserPlus,
  Camera,
  Smartphone,
  Receipt,
  IndianRupee,
  LocateFixed,
  Map,
  Clock,
  Route,
  MapPin,
  CheckSquare,
  Calendar,
} from 'lucide-react';

import { cn } from '../../utils/cn';
import type { AuthUser } from '../../types';
import { useDashboardCounts } from '../../hooks/useDashboardCounts';
import { isBlogUser, isPricingAdmin } from '../../utils/roles';

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
  user?: AuthUser | null;
}

const Sidebar: React.FC<SidebarProps> = ({ className, isOpen = true, onClose, user }) => {
  const location = useLocation();
  const { counts } = useDashboardCounts();

  if (isBlogUser(user)) {
    return null;
  }
  const [isMasterOpen, setIsMasterOpen] = React.useState(() => {
    return location.pathname.startsWith('/master/');
  });
  const [isStaffTrackingOpen, setIsStaffTrackingOpen] = React.useState(() => {
    return location.pathname.startsWith('/staff-tracking/');
  });

  const getBadgeCount = (name: string) => {
    switch (name) {
      case 'Website Leads':
        return counts.website_leads_unread;
      case 'CRM Inquiries':
        return counts.crm_inquiries_unread;
      case 'View Bookings':
        return 0;
      case 'Feedbacks':
        return counts.feedbacks;
      case 'Quotations':
        return counts.pending_quotations;
      default:
        return 0;
    }
  };

  const navigationGroups = [
    {
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'View Bookings', href: '/jobcards', icon: ClipboardList },
        { name: 'Quotations', href: '/quotations', icon: FileText },
        { name: 'Invoices', href: '/invoices', icon: Receipt },
        { name: 'Pending Amounts', href: '/pending-amounts', icon: IndianRupee },
        { name: 'CRM Inquiries', href: '/crm-inquiries', icon: Zap },
        { name: 'Partner Referrals', href: '/partner-referrals', icon: UserPlus },
        { name: 'Website Leads', href: '/inquiries', icon: MessageSquare },
        { name: 'Feedbacks', href: '/feedbacks', icon: Star },
      ]
    },
    {
      items: [
        { name: 'WhatsApp Inbox', href: '/whatsapp/inbox', icon: MessageCircle },
      ],
    },
    {
      items: [
        { name: 'Client Directory', href: '/clients', icon: Users },
        { name: 'Technicians', href: '/technicians', icon: Users },
        { name: 'Technician Reports', href: '/technician-reports', icon: BarChart3 },
        { name: 'Technician Selfies', href: '/technician-selfies', icon: Camera },
        { name: 'Staff Performance', href: '/staff-performance', icon: BarChart3 },
      ]
    },
    {
      items: [
        { name: 'Renewals', href: '/renewals', icon: RefreshCw },
        { name: 'References', href: '/references', icon: FileText },
      ]
    },
    {
      items: [
        { name: 'Blog CMS', href: '/blog', icon: BookOpen },
      ]
    },
    {
      items: [
        { name: 'Pricing Master', href: '/pricing-master', icon: IndianRupee, adminOnly: true },
        { name: 'Staff Management', href: '/staff', icon: Shield, superAdminOnly: true },
        { name: 'Add Employee', href: '/staff/add', icon: UserPlus, superAdminOnly: true },
        { name: 'Activity Logs', href: '/activity-logs', icon: History, superAdminOnly: true },
        { name: 'Partner App Version', href: '/partner-app-version', icon: Smartphone, superAdminOnly: true },
      ]
    }
  ];

  const masterItems = [
    { name: 'Master Countries', href: '/master/countries' },
    { name: 'Master States', href: '/master/states' },
    { name: 'Master Cities', href: '/master/cities' },
    { name: 'Master Locations', href: '/master/locations' },
  ];

  const staffTrackingItems = [
    { name: 'Live Map', href: '/staff-tracking/live', icon: Map },
    { name: 'Staff Directory', href: '/staff-tracking/staff', icon: Users },
    { name: 'Visits', href: '/staff-tracking/visits', icon: MapPin },
    { name: 'Tasks', href: '/staff-tracking/tasks', icon: CheckSquare },
    { name: 'Attendance', href: '/staff-tracking/attendance', icon: Clock },
    { name: 'Leave', href: '/staff-tracking/leave', icon: Calendar },
    { name: 'Expenses', href: '/staff-tracking/expenses', icon: Receipt },
    { name: 'Location History', href: '/staff-tracking/history', icon: Route },
  ];

  const isStaffTrackingActive = location.pathname.startsWith('/staff-tracking/');

  const pricingAdmin = isPricingAdmin(user);
  const showAdministration = Boolean(user?.is_superuser || pricingAdmin);

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay — always mounted for smooth fade */}
      {onClose && (
        <div
          className={cn(
            'fixed inset-0 z-[45] bg-black/40 backdrop-blur-[1px] md:hidden',
            'transition-opacity duration-500 ease-in-out',
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
          )}
          onClick={onClose}
          aria-hidden={!isOpen}
        />
      )}
      <aside
        id="crm-app-sidebar"
        className={cn(
          'w-[220px] bg-crm-surface-2 border-r border-crm-border',
          'fixed left-0 top-16 z-50 h-[calc(100vh-4rem)]',
          'transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform',
          isOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full shadow-none',
          className
        )}
      >
        <div className="flex h-full flex-col px-3 py-4">


          <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
            {navigationGroups.map((group, gIdx) => {
              const isAdminGroup = gIdx === navigationGroups.length - 1;
              if (isAdminGroup && !showAdministration) {
                return null;
              }

              const visibleItems = group.items.filter((item) => {
                if ('superAdminOnly' in item && item.superAdminOnly && !user?.is_superuser) {
                  return false;
                }
                if ('adminOnly' in item && item.adminOnly && !pricingAdmin) {
                  return false;
                }
                return true;
              });

              if (visibleItems.length === 0) {
                return null;
              }
              
              return (
                <div key={gIdx} className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150',
                          active 
                            ? 'bg-crm-surface shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)] text-crm-text border border-crm-border' 
                            : 'text-crm-muted hover:text-crm-text hover:bg-crm-hover'
                        )}
                      >
                        <div className={cn(
                          'flex items-center justify-center transition-colors',
                          active ? 'text-blue-600' : 'text-crm-muted group-hover:text-crm-text'
                        )}>
                          <Icon className="h-[18px] w-[18px]" />
                        </div>

                        <span className={cn(
                          'flex-1 text-[14px] font-semibold transition-colors',
                          active ? 'text-crm-text' : 'text-crm-text group-hover:text-crm-text'
                        )}>
                          {item.name}
                        </span>

                        {getBadgeCount(item.name) > 0 && (
                          <span className={cn(
                            "flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white shadow-sm",
                            item.name === 'Website Leads' ? "bg-red-600" :
                            item.name === 'CRM Inquiries' ? "bg-orange-500" :
                            item.name === 'Quotations' ? "bg-amber-500" :
                            "bg-green-600"
                          )}>
                            {getBadgeCount(item.name)}
                          </span>
                        )}
                      </Link>
                    );
                  })}

                  {gIdx === 1 && (
                    <div className="space-y-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsStaffTrackingOpen(!isStaffTrackingOpen)}
                        className={cn(
                          'w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-left',
                          isStaffTrackingActive
                            ? 'bg-crm-surface shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)] text-crm-text border border-crm-border'
                            : 'text-crm-muted hover:text-crm-text hover:bg-crm-hover border border-transparent',
                        )}
                      >
                        <div
                          className={cn(
                            'flex items-center justify-center transition-colors',
                            isStaffTrackingActive ? 'text-blue-600' : 'text-crm-muted group-hover:text-crm-text',
                          )}
                        >
                          <LocateFixed className="h-[18px] w-[18px] stroke-[2]" />
                        </div>
                        <span
                          className={cn(
                            'flex-1 text-[14px] font-semibold transition-colors',
                            isStaffTrackingActive ? 'text-crm-text' : 'text-crm-text group-hover:text-crm-text',
                          )}
                        >
                          Staff Tracking
                        </span>
                        {isStaffTrackingOpen ? (
                          <ChevronDown className="h-4 w-4 text-crm-muted shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-crm-muted shrink-0" />
                        )}
                      </button>

                      {isStaffTrackingOpen && (
                        <div className="ml-2 space-y-0.5 border-l border-crm-border pl-2 animate-in slide-in-from-top-1 duration-200">
                          {staffTrackingItems.map((item) => {
                            const SubIcon = item.icon;
                            const active = location.pathname === item.href;
                            return (
                              <Link
                                key={item.name}
                                to={item.href}
                                onClick={onClose}
                                className={cn(
                                  'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all',
                                  active
                                    ? 'bg-crm-surface text-blue-600 border border-crm-border shadow-sm'
                                    : 'text-crm-muted hover:text-crm-text hover:bg-crm-hover',
                                )}
                              >
                                <SubIcon
                                  className={cn(
                                    'h-4 w-4 shrink-0 stroke-[2]',
                                    active ? 'text-blue-600' : 'text-crm-muted group-hover:text-crm-text',
                                  )}
                                />
                                <span className="truncate">{item.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Master Collapsible Group */}
            {user?.is_superuser && (
              <div className="space-y-1 mt-4">
                <button
                  onClick={() => setIsMasterOpen(!isMasterOpen)}
                  className={cn(
                    'w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left border',
                    isMasterOpen || location.pathname.startsWith('/master/')
                      ? 'bg-crm-surface text-blue-600 border-crm-border'
                      : 'text-crm-muted hover:text-crm-text hover:bg-crm-hover border-transparent'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center transition-colors',
                    isMasterOpen || location.pathname.startsWith('/master/') ? 'text-blue-600' : 'text-crm-muted group-hover:text-crm-text'
                  )}>
                    <Database className={cn("h-5 w-5 fill-current opacity-20", (isMasterOpen || location.pathname.startsWith('/master/')) && "opacity-100")} />
                  </div>
                  <span className={cn(
                    "flex-1 text-[14px] font-bold tracking-tight",
                    isMasterOpen || location.pathname.startsWith('/master/') ? 'text-blue-600' : 'text-crm-text'
                  )}>
                    Master
                  </span>
                  {isMasterOpen ? (
                    <ChevronDown className="h-4 w-4 text-blue-600 rotate-180 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-crm-muted" />
                  )}
                </button>
                
                {isMasterOpen && (
                  <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                    {masterItems.map((item) => {
                      const active = location.pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={cn(
                            'group flex items-center gap-3 px-10 py-1.5 rounded-lg text-[13px] font-bold transition-all',
                            active 
                              ? 'text-blue-700' 
                              : 'text-blue-600/80 hover:text-blue-800'
                          )}
                        >
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full border border-blue-600/30",
                            active ? "bg-blue-600" : "bg-transparent group-hover:bg-blue-400"
                          )} />
                          <span className="truncate">
                            {item.name.replace('Master ', '')}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>



        </div>
      </aside>
    </>
  );
};

export { Sidebar };
