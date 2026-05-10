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
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, PageLoading, Badge } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { DashboardStatisticsResponse } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatisticsResponse | null>(null);
  const [complaintStats, setComplaintStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchStats = async () => {
    try {
      const params: any = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      
      const [dashboardStats, complaints] = await Promise.all([
        enhancedApiService.getDashboardStatistics(params),
        enhancedApiService.getComplaintStats()
      ]);
      
      setStats(dashboardStats);
      setComplaintStats(complaints);
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
          <div className="h-4 w-px bg-gray-200 mx-1" />
          <button
            onClick={handleRefresh}
            className="p-1.5 bg-white hover:bg-gray-50 text-gray-500 hover:text-blue-600 border border-gray-100 rounded-lg shadow-sm transition-all"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* 🚀 2. PRIMARY KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up delay-100">
        {[
          { label: 'Total Bookings', value: stats?.total_job_cards || 0, color: 'border-blue-500', bg: 'bg-blue-50/40' },
          { label: 'Active Jobs', value: stats?.status_stats?.on_process || 0, color: 'border-indigo-500', bg: 'bg-indigo-50/40' },
          { label: 'Pending Jobs', value: stats?.status_stats?.pending || 0, color: 'border-orange-500', bg: 'bg-orange-50/40' },
          { label: 'Total Revenue', value: `₹${Math.round(stats?.month_revenue || 0).toLocaleString()}`, color: 'border-emerald-500', bg: 'bg-emerald-50/40' },
        ].map((stat, i) => (
          <div key={i} className={cn("relative p-4 h-24 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white flex flex-col justify-center", stat.color)}>
             <div className={cn("absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity", stat.bg)} />
             <div className="relative">
                <p className="text-2xl font-black text-gray-950 tracking-tighter leading-none mb-1">{stat.value}</p>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{stat.label}</p>
             </div>
          </div>
        ))}
      </div>

      {/* ⚡ 3. TODAY FOCUS - COMPACT ROW */}
      <div className="bg-white p-4 sm:p-2.5 px-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4 sm:gap-0 animate-fade-up delay-200">
        <div className="flex items-center gap-2 pr-0 sm:pr-6 border-b sm:border-b-0 sm:border-r border-gray-100 w-full sm:w-auto pb-2 sm:pb-0">
           <Clock className="h-4 w-4 text-orange-500" />
           <h2 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Today Focus</h2>
        </div>
        <div className="flex flex-1 justify-between sm:justify-start gap-4 sm:gap-12 px-2 sm:px-8 w-full sm:w-auto">
           {[
             { label: 'Assigned', value: stats?.status_stats?.on_process || 0, color: 'text-blue-600' },
             { label: 'Pending', value: stats?.status_stats?.pending || 0, color: 'text-orange-600' },
             { label: 'Completed', value: stats?.status_stats?.done || 0, color: 'text-emerald-600' },
           ].map((item, i) => (
             <div key={i} className="flex items-center gap-2">
                <span className={cn("text-xl font-black", item.color)}>{item.value}</span>
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">{item.label}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch animate-fade-up delay-300">
        {/* 📊 4. PERFORMANCE SECTION - TIGHTER */}
        <Card className="lg:col-span-2 border-gray-100 shadow-sm rounded-xl overflow-hidden bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-6">
               <TrendingUp className="h-4 w-4 text-blue-600" />
               <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Performance Insights</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="flex items-center justify-between px-6 bg-gray-50/50 p-4 rounded-xl h-28">
                  <DonutChart 
                    value={stats?.category_stats?.amc || 0} 
                    total={(stats?.category_stats?.amc || 0) + (stats?.category_stats?.one_time || 0)} 
                    label="AMC" 
                    color="#3b82f6" 
                  />
                  <div className="space-y-2 text-right">
                     <div>
                        <p className="text-[9px] font-bold text-gray-600 uppercase">One-Time</p>
                        <p className="text-lg font-black text-gray-900">{stats?.category_stats?.one_time || 0}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-blue-600 uppercase">AMC</p>
                        <p className="text-lg font-black text-gray-900">{stats?.category_stats?.amc || 0}</p>
                     </div>
                  </div>
               </div>
               <div className="flex items-center justify-between px-6 bg-gray-50/50 p-4 rounded-xl h-28">
                  <DonutChart 
                    value={stats?.job_type_stats?.society || 0} 
                    total={(stats?.job_type_stats?.individual || 0) + (stats?.job_type_stats?.society || 0)} 
                    label="Corporate" 
                    color="#6366f1" 
                  />
                  <div className="space-y-2 text-right">
                     <div>
                        <p className="text-[9px] font-bold text-gray-600 uppercase">Retail</p>
                        <p className="text-lg font-black text-gray-900">{stats?.job_type_stats?.individual || 0}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-indigo-600 uppercase">Corporate</p>
                        <p className="text-lg font-black text-gray-900">{stats?.job_type_stats?.society || 0}</p>
                     </div>
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* 💰 5. BUSINESS INSIGHTS - PREMIUM CIRCULAR TARGET */}
        <Card className="border-gray-100 shadow-sm rounded-xl overflow-hidden bg-[#0f172a] text-white">
          <CardContent className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                </div>
                <h2 className="text-[12px] font-black uppercase tracking-widest text-white">Revenue Target</h2>
              </div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Month: {new Date().toLocaleString('default', { month: 'long' })}
              </div>
            </div>

            <div className="flex-1 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6 xl:gap-8">
              {/* Circular Target Chart */}
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex flex-col items-center justify-center shrink-0">
                <svg viewBox="0 0 42 42" className="w-32 h-32 sm:w-40 sm:h-40 transform -rotate-90">
                  <circle cx="21" cy="21" r="15.9155" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <circle
                    cx="21" cy="21" r="15.9155" fill="transparent"
                    stroke="#10b981" strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 15.9155} ${2 * Math.PI * 15.9155}`}
                    strokeDashoffset={2 * Math.PI * 15.9155 - (Math.min(Math.round(((stats?.month_revenue || 0) / 500000) * 100), 100) / 100) * (2 * Math.PI * 15.9155)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-black text-white leading-none">
                    {Math.min(Math.round(((stats?.month_revenue || 0) / 500000) * 100), 100)}%
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-tighter mt-1">Achieved</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="flex-1 grid grid-cols-1 gap-3 w-full">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Today Revenue</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-400">₹ {Math.round(stats?.today_revenue || 0).toLocaleString()}</p>
                </div>
                
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Current Month</p>
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <p className="text-lg sm:text-xl font-black text-white whitespace-nowrap">₹ {Math.round(stats?.month_revenue || 0).toLocaleString()}</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 whitespace-nowrap">/ 5,00,000</p>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                   <div className="space-y-0.5">
                      <p className="text-[8px] sm:text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Avg Ticket</p>
                      <p className="text-xs sm:text-sm font-black text-white">
                        ₹ {stats?.status_stats?.done ? Math.round((stats?.month_revenue || 0) / stats.status_stats.done).toLocaleString() : '0'}
                      </p>
                   </div>
                   <div className="h-8 w-px bg-white/10 mx-2" />
                   <div className="text-right space-y-0.5">
                      <p className="text-[8px] sm:text-[9px] font-bold text-gray-500 uppercase tracking-tighter">Jobs Done</p>
                      <p className="text-xs sm:text-sm font-black text-white">{stats?.status_stats?.done || 0}</p>
                   </div>
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
                     <Home className="h-3.5 w-3.5 text-gray-400" />
                     <span className="text-[11px] font-bold text-gray-600 uppercase">Top Property</span>
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

        {/* 🚨 8. COMPLAINT TRACKING */}
        <Card className="border-red-100 shadow-sm rounded-xl bg-red-50/20">
          <CardContent className="p-4 px-6">
            <div className="flex items-center justify-between mb-4 border-b border-red-100 pb-2">
              <div className="flex items-center gap-2">
                 <AlertCircle className="h-4 w-4 text-red-600" />
                 <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Complaints Tracking</h2>
              </div>
              <Badge variant="destructive" size="sm" className="text-[9px] uppercase font-black">
                {complaintStats?.unresolved_count || 0} Open
              </Badge>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Resolution Rate</p>
                  <p className="text-3xl font-black text-gray-900 leading-none">
                    {complaintStats?.resolution_rate || 0}%
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-red-600 uppercase tracking-tighter">
                    {complaintStats?.high_priority_count || 0} High Priority
                  </span>
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${complaintStats?.resolution_rate || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-red-100">
                <div className="bg-white/60 p-2 rounded-lg border border-red-50">
                  <p className="text-[8px] font-black text-gray-400 uppercase leading-tight">Total</p>
                  <p className="text-sm font-black text-gray-900">{complaintStats?.total_count || 0}</p>
                </div>
                <div className="bg-white/60 p-2 rounded-lg border border-red-50">
                  <p className="text-[8px] font-black text-gray-400 uppercase leading-tight">Resolved</p>
                  <p className="text-sm font-black text-emerald-600">{complaintStats?.resolved_count || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ⚙️ 9. OPERATIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-up delay-500">
         {[
           { label: 'Technicians Active', value: stats?.total_technicians || 0, icon: UserCheck, color: 'text-blue-500' },
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
