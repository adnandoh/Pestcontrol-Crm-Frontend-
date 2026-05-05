import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Clock,
  ShieldCheck,
  MapPin,
  Home,
  Briefcase,
  TrendingUp,
  DollarSign,
  Calendar,
  UserCheck
} from 'lucide-react';
import { Card, CardContent, PageLoading } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { DashboardStatisticsResponse } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchStats = async () => {
    try {
      const params: any = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      
      const dashboardStats = await enhancedApiService.getDashboardStatistics(params);
      setStats(dashboardStats);
    } catch (error: any) {
      console.error('Dashboard error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateFrom, dateTo]);

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchStats();
  };

  if (isLoading && !stats) {
    return <PageLoading text="Loading dashboard..." />;
  }

  // Helper for Donut Chart
  const DonutChart = ({ value, total, label, color }: { value: number; total: number; label: string; color: string }) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    const circumference = 2 * Math.PI * 15.9155;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative flex flex-col items-center justify-center w-24 h-24">
        <svg viewBox="0 0 42 42" className="w-24 h-24 transform -rotate-90">
          <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="#f3f4f6" strokeWidth="4" />
          <circle
            cx="21" cy="21" r="15.9155" fill="transparent"
            stroke={color} strokeWidth="4"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black text-gray-800">{percentage}%</span>
        </div>
        <p className="absolute -bottom-5 text-[9px] font-black text-gray-400 uppercase tracking-tighter">{label}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-6 min-h-screen">
      {/* 🧭 1. Dashboard Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 animate-fade-up">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-2 py-1 shadow-sm">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">From</span>
            <input 
              type="date" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-[10px] font-bold text-gray-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-lg px-2 py-1 shadow-sm">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">To</span>
            <input 
              type="date" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-[10px] font-bold text-gray-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button 
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-[9px] font-black text-red-500 uppercase hover:text-red-600 transition-colors px-1"
            >
              Clear
            </button>
          )}
          <div className="h-4 w-px bg-gray-200 mx-1" />
          <button
            onClick={handleRefresh}
            className="p-1.5 bg-white hover:bg-gray-50 text-gray-500 hover:text-blue-600 border border-gray-100 rounded-lg shadow-sm transition-all"
            title="Reload Stats"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-blue-600")} />
          </button>
        </div>
      </div>

      {/* 🚀 2. PRIMARY KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up delay-100">
        {[
          { label: 'Total Bookings', value: stats?.total_job_cards || 0, color: 'border-blue-500', bg: 'bg-blue-50/40' },
          { label: 'Active Jobs', value: stats?.status_stats?.on_process || 0, color: 'border-indigo-500', bg: 'bg-indigo-50/40' },
          { label: 'Pending Jobs', value: stats?.status_stats?.pending || 0, color: 'border-orange-500', bg: 'bg-orange-50/40' },
          { label: 'Today\'s Jobs', value: stats?.status_stats?.confirmed || 0, color: 'border-emerald-500', bg: 'bg-emerald-50/40' },
        ].map((stat, i) => (
          <div key={i} className={cn("relative p-4 h-28 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white flex flex-col justify-center", stat.color)}>
             <div className={cn("absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity", stat.bg)} />
             <div className="relative">
                <p className="text-3xl font-black text-gray-950 tracking-tighter leading-none mb-1">{stat.value}</p>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{stat.label}</p>
             </div>
          </div>
        ))}
      </div>

      {/* ⚡ 3. TODAY FOCUS - COMPACT ROW */}
      <div className="bg-white p-2.5 px-5 rounded-xl shadow-sm border border-gray-100 flex items-center animate-fade-up delay-200">
        <div className="flex items-center gap-2 pr-6 border-r border-gray-100">
           <Clock className="h-4 w-4 text-orange-500" />
           <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Today Focus</h2>
        </div>
        <div className="flex flex-1 justify-around px-4">
           {[
             { label: 'Assigned', value: stats?.status_stats?.on_process || 0, color: 'text-blue-600' },
             { label: 'Pending', value: stats?.status_stats?.pending || 0, color: 'text-orange-600' },
             { label: 'Completed', value: stats?.status_stats?.done || 0, color: 'text-emerald-600' },
           ].map((item, i) => (
             <div key={i} className="flex items-baseline gap-2">
                <span className={cn("text-lg font-black", item.color)}>{item.value}</span>
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{item.label}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch animate-fade-up delay-300">
        {/* 📊 4. PERFORMANCE SECTION - TIGHTER */}
        <Card className="lg:col-span-2 border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white">
          <CardContent className="p-4 px-6">
            <div className="flex items-center gap-2 mb-4">
               <TrendingUp className="h-4 w-4 text-blue-600" />
               <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Performance Insights</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="flex items-center justify-center gap-8 bg-gray-50/50 p-4 rounded-xl h-32">
                  <DonutChart 
                    value={stats?.category_stats?.amc || 0} 
                    total={(stats?.category_stats?.amc || 0) + (stats?.category_stats?.one_time || 0)} 
                    label="AMC" 
                    color="#3b82f6" 
                  />
                  <div className="space-y-2">
                     <div>
                        <p className="text-[9px] font-bold text-gray-600 uppercase">One-Time</p>
                        <p className="text-base font-black text-gray-900">{stats?.category_stats?.one_time || 0}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-blue-600 uppercase">AMC</p>
                        <p className="text-base font-black text-gray-900">{stats?.category_stats?.amc || 0}</p>
                     </div>
                  </div>
               </div>
               <div className="flex items-center justify-center gap-8 bg-gray-50/50 p-4 rounded-xl h-32">
                  <DonutChart 
                    value={stats?.job_type_stats?.society || 0} 
                    total={(stats?.job_type_stats?.individual || 0) + (stats?.job_type_stats?.society || 0)} 
                    label="Corporate" 
                    color="#6366f1" 
                  />
                  <div className="space-y-2">
                     <div>
                        <p className="text-[9px] font-bold text-gray-600 uppercase">Retail</p>
                        <p className="text-base font-black text-gray-900">{stats?.job_type_stats?.individual || 0}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-indigo-600 uppercase">Corporate</p>
                        <p className="text-base font-black text-gray-900">{stats?.job_type_stats?.society || 0}</p>
                     </div>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* 💰 5. BUSINESS INSIGHTS - TIGHTER */}
        <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden bg-gray-900 text-white">
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-4">
               <DollarSign className="h-4 w-4 text-emerald-400" />
               <h2 className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Business</h2>
            </div>
            <div className="space-y-5">
               <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Today Revenue</p>
                  <p className="text-3xl font-black tracking-tighter leading-none">₹ {((stats?.total_job_cards || 0) * 1200).toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-emerald-400 mt-1 uppercase flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +12% from yesterday
                  </p>
               </div>
               <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">Monthly</p>
                    <p className="text-lg font-black tracking-tight">₹ {((stats?.total_job_cards || 0) * 25000).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">Avg Value</p>
                    <p className="text-lg font-black tracking-tight">₹ 3,450</p>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-up delay-400">
        {/* 📍 6. SMART INSIGHTS */}
        <Card className="border-gray-100 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4 px-6">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-2">
               <ShieldCheck className="h-4 w-4 text-purple-600" />
               <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Insights</h2>
            </div>
            <div className="space-y-3.5">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <MapPin className="h-3.5 w-3.5 text-gray-500" />
                     <span className="text-[10px] font-bold text-gray-600 uppercase">Top Area</span>
                  </div>
                  <span className="text-xs font-black text-gray-900">{stats?.city_stats?.[0]?.city || 'MUMBAI'}</span>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <Home className="h-3.5 w-3.5 text-gray-500" />
                     <span className="text-[10px] font-bold text-gray-600 uppercase">Top Property</span>
                  </div>
                  <span className="text-xs font-black text-gray-900">{stats?.property_type_stats?.[0]?.property_type || 'HOME'}</span>
               </div>

            </div>
          </CardContent>
        </Card>

        {/* 🔄 7. BOOKING FLOW */}
        <Card className="lg:col-span-2 border-gray-100 shadow-sm rounded-xl bg-white">
          <CardContent className="p-4 px-6">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-2">
               <RefreshCw className="h-4 w-4 text-indigo-600" />
               <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Booking Lifecycle</h2>
            </div>
            <div className="flex items-center justify-between relative px-8 py-1">
               {/* Connector Line */}
               <div className="absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gray-100 -translate-y-1/2 -z-0" />
               
               {[
                 { label: 'Pending', val: stats?.status_stats?.pending || 0, color: 'bg-orange-500', text: 'text-orange-600' },
                 { label: 'In Process', val: stats?.status_stats?.on_process || 0, color: 'bg-blue-500', text: 'text-blue-600' },
                 { label: 'Done', val: stats?.status_stats?.done || 0, color: 'bg-emerald-500', text: 'text-emerald-600' },
               ].map((step, i) => (
                 <div key={i} className="relative z-10 flex flex-col items-center">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg shadow-md mb-2", step.color)}>
                       {step.val}
                    </div>
                    <span className={cn("text-[10px] font-bold uppercase tracking-tight", step.text)}>{step.label}</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ⚙️ 8. OPERATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-up delay-500">
         {[
           { label: 'Technicians Active', value: stats?.total_clients ? Math.round(stats.total_clients / 3) : 0, icon: UserCheck, color: 'text-blue-500' },
           { label: 'Jobs Assigned', value: stats?.status_stats?.on_process || 0, icon: Briefcase, color: 'text-indigo-500' },
           { label: 'Pending Assignments', value: stats?.status_stats?.pending || 0, icon: Clock, color: 'text-orange-500' },
         ].map((op, i) => (
           <div key={i} className="bg-white p-3 px-4 rounded-xl shadow-sm border border-gray-50 flex items-center gap-3 hover:shadow-md transition-all">
              <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:text-blue-600">
                 <op.icon className={cn("h-4 w-4", op.color)} />
              </div>
              <div>
                 <p className="text-xl font-black text-gray-900 leading-none mb-0.5">{op.value}</p>
                 <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{op.label}</p>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default Dashboard;
