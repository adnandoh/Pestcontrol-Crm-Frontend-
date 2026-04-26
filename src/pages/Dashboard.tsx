import React, { useEffect, useState } from 'react';
import {
  Users,
  MessageSquare,
  ClipboardList,
  RefreshCw,
  Clock,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Home,
  LayoutGrid,
  Briefcase
} from 'lucide-react';
import { Card, CardContent, Button, PageLoading } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { DashboardStatisticsResponse } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const dashboardStats = await enhancedApiService.getDashboardStatistics();
      setStats(dashboardStats);
    } catch (error: any) {
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchStats();
  };

  if (isLoading && !stats) {
    return <PageLoading text="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6 bg-gray-50/5 h-full">
      {/* 1. Dashboard Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight italic uppercase">Command Center</h1>
          <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest italic">Live Business Intelligence & Growth Metrics</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isLoading}
          className="bg-white hover:bg-gray-50 text-blue-700 border-blue-100 h-8 text-[11px] font-black uppercase tracking-wider shadow-sm"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          {isLoading ? 'SYNCING DATA...' : 'RELOAD STATS'}
        </Button>
      </div>

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Inquiries', value: stats?.total_inquiries || 0, sub: `WEB: ${stats?.total_web_inquiries || 0} / CRM: ${stats?.total_crm_inquiries || 0}`, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Confirmed Bookings', value: stats?.total_job_cards || 0, sub: 'LATEST JOB RECORDS', icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Active Clients', value: stats?.total_clients || 0, sub: 'TOTAL CUSTOMER PROFILES', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Pending Renewals', value: stats?.renewals || 0, sub: 'UPCOMING AMC CONTRACTS', icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <Card key={i} className="border-gray-100 shadow-xs hover:shadow-md transition-all duration-200 group">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic mb-1">{stat.label}</p>
                  <p className="text-3xl font-black text-gray-800 tracking-tighter">{stat.value}</p>
                  <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-tight">{stat.sub}</p>
                </div>
                <div className={cn("p-2.5 rounded-lg transition-colors group-hover:bg-opacity-80", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tier Distribution */}
        <Card className="border-gray-100 italic">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
               <ShieldCheck className="h-4 w-4 text-blue-600" />
               <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-widest">Service Tier Distribution</h3>
            </div>
            <div className="space-y-4">
               <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                     <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-tight group-hover:text-gray-800 transition-colors">One-Time Service</span>
                  </div>
                  <span className="text-sm font-black text-gray-800 tabular-nums">{stats?.category_stats?.one_time || 0}</span>
               </div>
               <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                     <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                     <span className="text-xs font-bold text-gray-500 uppercase tracking-tight group-hover:text-gray-800 transition-colors">AMC (Annual Contract)</span>
                  </div>
                  <span className="text-sm font-black text-gray-800 tabular-nums">{stats?.category_stats?.amc || 0}</span>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Source */}
        <Card className="border-gray-100 italic">
          <CardContent className="p-5">
             <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
                <LayoutGrid className="h-4 w-4 text-indigo-600" />
                <h3 className="text-[11px] font-black text-gray-800 uppercase tracking-widest">Revenue Channel Split</h3>
             </div>
             <div className="space-y-4">
                <div className="flex items-center justify-between group">
                   <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-tight group-hover:text-gray-800 transition-colors">Retail / Individual</span>
                   </div>
                   <span className="text-sm font-black text-gray-800 tabular-nums">{stats?.job_type_stats?.individual || 0}</span>
                </div>
                <div className="flex items-center justify-between group">
                   <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-200" />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-tight group-hover:text-gray-800 transition-colors">Society / Corporate</span>
                   </div>
                   <span className="text-sm font-black text-gray-800 tabular-nums">{stats?.job_type_stats?.society || 0}</span>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Geolocation & Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: 'Top City Reach', icon: MapPin, color: 'text-blue-500', data: stats?.city_stats?.map(c => ({ key: c.city, val: c.count })) },
          { title: 'Property Stats', icon: Home, color: 'text-emerald-500', data: stats?.property_type_stats?.map(p => ({ key: p.property_type, val: p.count })) },
          { title: 'Size Breakdown', icon: Briefcase, color: 'text-amber-500', data: stats?.bhk_stats?.map(b => ({ key: b.bhk_size, val: b.count })) },
        ].map((sec, i) => (
          <Card key={i} className="border-gray-100">
            <CardContent className="p-4">
               <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
                  <sec.icon className={cn("h-3.5 w-3.5", sec.color)} />
                  <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-widest italic">{sec.title}</h4>
               </div>
               <div className="space-y-2.5">
                  {sec.data && sec.data.length > 0 ? (
                    sec.data.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                         <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter truncate max-w-[120px]">{item.key || 'UNKNOWN'}</span>
                         <span className="text-xs font-black text-gray-800 tabular-nums">{item.val}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[9px] font-bold text-gray-400 italic">NO DATA TRACKED</p>
                  )}
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lifecyle Status Track */}
      <Card className="border-gray-100">
        <CardContent className="p-5">
           <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] italic mb-5 border-b border-gray-50 pb-2">Booking Execution Lifecycle</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Pending', val: stats?.status_stats?.pending || 0, color: 'text-orange-500', bg: 'bg-orange-50', icon: Clock },
                { label: 'On Process', val: stats?.status_stats?.on_process || 0, color: 'text-blue-500', bg: 'bg-blue-50', icon: ShieldCheck },
                { label: 'Done', val: stats?.status_stats?.done || 0, color: 'text-emerald-500', bg: 'bg-emerald-50', icon: CheckCircle2 },
              ].map((s, i) => (
                <div key={i} className={cn("flex items-center justify-between p-3 rounded shadow-xs border border-transparent hover:border-gray-100 transition-all group", s.bg)}>
                   <div className="flex items-center gap-2">
                      <s.icon className={cn("h-4 w-4 group-hover:scale-110 transition-transform", s.color)} />
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter italic">{s.label}</span>
                   </div>
                   <span className="text-lg font-black text-gray-800 tabular-nums">{s.val}</span>
                </div>
              ))}
           </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;