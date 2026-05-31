import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Clock,
  ShieldCheck,
  MapPin,
  Home,
  Briefcase,
  TrendingUp,
  UserCheck,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
import { Card, CardContent, PageLoading } from '../components/ui';
import { RevenueTargetCard } from '../components/dashboard/RevenueTargetCard';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { DashboardStatisticsResponse } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<string>(dayjs().tz("Asia/Kolkata").format("YYYY-MM-DD"));
  const [dateTo, setDateTo] = useState<string>(dayjs().tz("Asia/Kolkata").format("YYYY-MM-DD"));

  const fetchStats = async () => {
    try {
      setLoadError(null);
      const params: any = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      
      const dashboardStats = await enhancedApiService.getDashboardStatistics(params);
      setStats(dashboardStats);
    } catch (error: any) {
      console.error('Dashboard error:', error);
      setLoadError(error?.message || 'Could not load dashboard. Try refresh or login again.');
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

  const handleResetFilter = () => {
    const today = dayjs().tz("Asia/Kolkata").format("YYYY-MM-DD");
    setDateFrom(today);
    setDateTo(today);
  };

  if (isLoading && !stats) {
    return <PageLoading text="Loading dashboard..." />;
  }

  if (!stats && loadError) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-amber-600 mx-auto" />
        <p className="text-sm font-medium text-gray-800">{loadError}</p>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  const oneTimeCount = stats?.category_stats?.one_time || 0;
  const amcCount = stats?.category_stats?.amc || 0;
  const serviceMixTotal = oneTimeCount + amcCount;
  const retailCount = stats?.job_type_stats?.individual || 0;
  const corporateCount = stats?.job_type_stats?.society || 0;
  const clientMixTotal = retailCount + corporateCount;

  const PerformanceRing = ({
    value,
    total,
    color,
    trackClass,
  }: {
    value: number;
    total: number;
    color: string;
    trackClass: string;
  }) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    const circumference = 2 * Math.PI * 16;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative h-[88px] w-[88px] shrink-0">
        <svg viewBox="0 0 40 40" className="h-full w-full -rotate-90">
          <circle cx="20" cy="20" r="16" fill="none" className={trackClass} strokeWidth="5" />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-gray-900 dark:text-gray-50 leading-none">{percentage}%</span>
        </div>
      </div>
    );
  };

  const PerformanceStatRow = ({
    label,
    value,
    accent,
    accentBg,
  }: {
    label: string;
    value: number;
    accent: string;
    accentBg: string;
  }) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-100/80 bg-white/80 px-3.5 py-2.5 dark:border-gray-700/60 dark:bg-gray-800/40">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', accentBg)} />
        <span className={cn('text-[11px] font-bold uppercase tracking-wide truncate', accent)}>{label}</span>
      </div>
      <span className="text-xl font-black tabular-nums text-gray-900 dark:text-gray-50">{value}</span>
    </div>
  );

  return (
    <div className="space-y-4 pb-6 min-h-screen">
      {/* 🧭 1. Dashboard Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 animate-fade-up">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            Dashboard 
            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Live</span>
          </h1>
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
          <button
            onClick={handleResetFilter}
            className="p-1.5 bg-white hover:bg-gray-50 text-gray-500 hover:text-red-600 border border-gray-100 rounded-lg shadow-sm transition-all"
            title="Reset to Today"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 animate-fade-up delay-100">
        {[
          { label: 'Range Revenue', value: `₹${Math.round(stats?.range_revenue || 0).toLocaleString()}`, color: 'border-emerald-600', bg: 'bg-emerald-50/60' },
          { label: 'Today Revenue', value: `₹${Math.round(stats?.today_revenue || 0).toLocaleString()}`, color: 'border-blue-600', bg: 'bg-blue-50/60' },
          { label: 'Yesterday Revenue', value: `₹${Math.round(stats?.yesterday_revenue || 0).toLocaleString()}`, color: 'border-gray-400', bg: 'bg-gray-50/60' },
          { label: 'Total Bookings', value: stats?.total_job_cards || 0, color: 'border-indigo-500', bg: 'bg-indigo-50/40' },
          { label: 'CRM Inquiries', value: stats?.total_crm_inquiries || 0, color: 'border-purple-500', bg: 'bg-purple-50/40' },
          { label: 'Website Leads', value: stats?.total_web_inquiries || 0, color: 'border-orange-500', bg: 'bg-orange-50/40' },
        ].map((stat, i) => (
          <div key={i} className={cn("relative p-4 h-24 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white flex flex-col justify-center", stat.color)}>
             <div className={cn("absolute inset-0 opacity-50 group-hover:opacity-70 transition-opacity", stat.bg)} />
             <div className="relative">
                <p className="text-xl font-black text-gray-950 tracking-tighter leading-none mb-1">{stat.value}</p>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
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
        {/* 📊 4. PERFORMANCE INSIGHTS */}
        <Card className="lg:col-span-2 overflow-hidden rounded-2xl border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-crm-surface">
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6 dark:border-gray-700/80">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide text-gray-900 dark:text-gray-50">
                    Performance Insights
                  </h2>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                    Service & client mix for selected dates
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex rounded-full bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {serviceMixTotal + clientMixTotal} bookings
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:p-6 md:grid-cols-2">
              {/* Service mix */}
              <div className="flex min-h-[200px] flex-col rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/40 via-white to-white p-5 shadow-sm dark:border-blue-900/40 dark:from-blue-950/20 dark:via-crm-surface dark:to-crm-surface">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                      Service Mix
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">One-time vs AMC</p>
                  </div>
                  <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white">
                    {serviceMixTotal} total
                  </span>
                </div>

                <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-5">
                  <div className="flex flex-col items-center gap-2 sm:pl-1">
                    <PerformanceRing
                      value={amcCount}
                      total={serviceMixTotal}
                      color="#2563eb"
                      trackClass="stroke-blue-100 dark:stroke-blue-950"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      AMC share
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-center gap-2.5 min-w-0">
                    <PerformanceStatRow
                      label="One-Time"
                      value={oneTimeCount}
                      accent="text-gray-600 dark:text-gray-300"
                      accentBg="bg-gray-400"
                    />
                    <PerformanceStatRow
                      label="AMC"
                      value={amcCount}
                      accent="text-blue-600 dark:text-blue-400"
                      accentBg="bg-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Client type */}
              <div className="flex min-h-[200px] flex-col rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50/40 via-white to-white p-5 shadow-sm dark:border-violet-900/40 dark:from-violet-950/20 dark:via-crm-surface dark:to-crm-surface">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
                      Client Type
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Retail vs corporate</p>
                  </div>
                  <span className="rounded-lg bg-violet-600 px-2.5 py-1 text-[10px] font-black text-white">
                    {clientMixTotal} total
                  </span>
                </div>

                <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-5">
                  <div className="flex flex-col items-center gap-2 sm:pl-1">
                    <PerformanceRing
                      value={corporateCount}
                      total={clientMixTotal}
                      color="#7c3aed"
                      trackClass="stroke-violet-100 dark:stroke-violet-950"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                      Corporate share
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-center gap-2.5 min-w-0">
                    <PerformanceStatRow
                      label="Retail"
                      value={retailCount}
                      accent="text-gray-600 dark:text-gray-300"
                      accentBg="bg-gray-400"
                    />
                    <PerformanceStatRow
                      label="Corporate"
                      value={corporateCount}
                      accent="text-violet-600 dark:text-violet-400"
                      accentBg="bg-violet-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <RevenueTargetCard
          stats={stats}
          loading={isLoading}
          error={loadError}
          onRetry={handleRefresh}
        />
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
