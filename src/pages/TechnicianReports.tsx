
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  IndianRupee, 
  Star, 
  Clock, 
  Wrench, 
  Search, 
  Filter, 
  TrendingUp, 
  Award,
  ChevronRight,
  Calendar
} from 'lucide-react';
import dayjs from 'dayjs';
import { enhancedApiService } from '../services/api.enhanced';
import type { TechnicianPerformance } from '../types';
import { cn } from '../utils/cn';
import { Button } from '../components/ui';

const TechnicianReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<{
    stats: any;
    technicians: TechnicianPerformance[];
  } | null>(null);
  const [filters, setFilters] = useState({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().endOf('month').format('YYYY-MM-DD'),
    service_type: '',
    search: ''
  });
  const [activeDatePreset, setActiveDatePreset] = useState('this_month');

  useEffect(() => {
    fetchReports();
  }, [filters.from, filters.to, filters.service_type]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await enhancedApiService.getTechnicianPerformance({
        from: filters.from,
        to: filters.to,
        service_type: filters.service_type
      });
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch performance reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const setDatePreset = (preset: string) => {
    setActiveDatePreset(preset);
    let from = '';
    let to = dayjs().format('YYYY-MM-DD');

    switch (preset) {
      case 'today':
        from = dayjs().format('YYYY-MM-DD');
        break;
      case 'yesterday':
        from = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        to = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        break;
      case 'this_week':
        from = dayjs().startOf('week').format('YYYY-MM-DD');
        break;
      case 'this_month':
        from = dayjs().startOf('month').format('YYYY-MM-DD');
        break;
      default:
        return;
    }

    setFilters(prev => ({ ...prev, from, to }));
  };

  const filteredTechnicians = reports?.technicians?.filter(t => 
    t.name.toLowerCase().includes(filters.search.toLowerCase())
  ) || [];

  // Top Performers for Leaderboard
  const topByRating = [...(reports?.technicians || [])].sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 3);
  const topByRevenue = [...(reports?.technicians || [])].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 3);
  const topByJobs = [...(reports?.technicians || [])].sort((a, b) => b.completed_count - a.completed_count).slice(0, 3);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-blue-600" />
            Technician Performance
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-1">Real-time operational analytics and staff reporting</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'Week' },
              { id: 'this_month', label: 'Month' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={cn(
                  "px-4 py-1.5 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeDatePreset === p.id 
                    ? "bg-gray-900 text-white shadow-md" 
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <input
                type="date"
                value={filters.from}
                onChange={(e) => {
                  setFilters({ ...filters, from: e.target.value });
                  setActiveDatePreset('custom');
                }}
                className="pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            </div>
            <span className="text-gray-400 font-bold">to</span>
            <div className="relative group">
              <input
                type="date"
                value={filters.to}
                onChange={(e) => {
                  setFilters({ ...filters, to: e.target.value });
                  setActiveDatePreset('custom');
                }}
                className="pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { label: 'Completed Jobs', value: reports?.stats?.total_completed, icon: CheckCircle, color: 'emerald', trend: '+12%' },
          { label: 'Total Revenue', value: `₹${Math.round(reports?.stats?.total_revenue || 0).toLocaleString()}`, icon: IndianRupee, color: 'blue', trend: '+8%' },
          { label: 'Avg Rating', value: `${(reports?.stats?.avg_rating || 0).toFixed(1)} / 5.0`, icon: Star, color: 'amber', trend: 'Stable' },
          { label: 'Pending Jobs', value: reports?.stats?.pending_jobs, icon: Clock, color: 'rose', trend: '-5%' },
          { label: 'Service Calls', value: reports?.stats?.service_calls, icon: Wrench, color: 'indigo', trend: '+15%' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform`} />
            <div className="flex items-center justify-between relative">
              <div className={cn(
                "p-3 rounded-xl",
                `bg-${stat.color}-50 text-${stat.color}-600 group-hover:bg-${stat.color}-600 group-hover:text-white transition-colors`
              )}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                stat.trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : 
                stat.trend.startsWith('-') ? "bg-rose-50 text-rose-600" : "bg-gray-50 text-gray-500"
              )}>
                {stat.trend}
              </div>
            </div>
            <div className="mt-4 relative">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {loading ? '...' : stat.value ?? 0}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard & Top Performers */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Top by Ratings
            </h3>
          </div>
          <div className="p-4 space-y-4 flex-1">
            {topByRating.map((tech, i) => (
              <div key={tech.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black",
                    i === 0 ? "bg-amber-100 text-amber-700" : 
                    i === 1 ? "bg-gray-100 text-gray-600" : "bg-orange-50 text-orange-700"
                  )}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 uppercase group-hover:text-blue-600 transition-colors">{tech.name}</p>
                    <p className="text-[10px] font-bold text-gray-400">{tech.completed_count} Jobs Done</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-black text-sm">
                  <Star className="h-3.5 w-3.5 fill-amber-500" />
                  {(tech.avg_rating || 0).toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Top by Revenue
            </h3>
          </div>
          <div className="p-4 space-y-4 flex-1">
            {topByRevenue.map((tech, i) => (
              <div key={tech.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black",
                    i === 0 ? "bg-emerald-100 text-emerald-700" : 
                    i === 1 ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-700"
                  )}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 uppercase group-hover:text-blue-600 transition-colors">{tech.name}</p>
                    <p className="text-[10px] font-bold text-gray-400">{tech.mobile}</p>
                  </div>
                </div>
                <div className="text-emerald-600 font-black text-sm">
                  ₹{Math.round(tech.total_revenue).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Most Jobs Done
            </h3>
          </div>
          <div className="p-4 space-y-4 flex-1">
            {topByJobs.map((tech, i) => (
              <div key={tech.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black",
                    i === 0 ? "bg-blue-100 text-blue-700" : 
                    i === 1 ? "bg-gray-100 text-gray-600" : "bg-indigo-50 text-indigo-700"
                  )}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 uppercase group-hover:text-blue-600 transition-colors">{tech.name}</p>
                    <p className="text-[10px] font-bold text-gray-400">{(tech.completion_rate || 0).toFixed(0)}% Success Rate</p>
                  </div>
                </div>
                <div className="text-blue-600 font-black text-sm">
                  {tech.completed_count} Jobs
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Performance Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search technician by name..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-10 px-4 font-black uppercase text-[10px] tracking-widest gap-2">
              <Filter className="h-3.5 w-3.5" />
              Advanced Filters
            </Button>
            <Button size="sm" className="h-10 px-4 font-black uppercase text-[10px] tracking-widest gap-2 bg-gray-900 hover:bg-black">
              Export PDF
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Staff Member</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Stats (C/P/O)</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Svc Calls</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Revenue</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Avg Rating</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Completion</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-8">
                      <div className="h-4 bg-gray-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredTechnicians.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <p className="text-sm font-bold text-gray-400 italic">No technician data found for selected filters</p>
                  </td>
                </tr>
              ) : (
                filteredTechnicians.map((tech) => (
                  <tr key={tech.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100">
                          {tech.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase leading-none mb-1 group-hover:text-blue-600 transition-colors">
                            {tech.name}
                          </p>
                          <p className="text-[10px] font-bold text-gray-500">{tech.mobile}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black border border-emerald-100" title="Completed">
                          {tech.completed_count}
                        </span>
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-black border border-rose-100" title="Pending">
                          {tech.pending_count}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-black border border-amber-100" title="On Process">
                          {tech.on_process_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                        {tech.service_calls_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-sm font-black text-gray-900">₹{Math.round(tech.total_revenue).toLocaleString()}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">Total Generated</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-amber-500 font-black">
                        <Star className="h-3.5 w-3.5 fill-amber-500" />
                        {(tech.avg_rating || 0).toFixed(1)}
                        <span className="text-[9px] text-gray-400 ml-1">({tech.feedback_count})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1.5 min-w-[100px]">
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              tech.completion_rate >= 80 ? "bg-emerald-500" :
                              tech.completion_rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                            )}
                            style={{ width: `${tech.completion_rate}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-gray-600">{(tech.completion_rate || 0).toFixed(0)}% Rate</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-blue-600">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TechnicianReports;
