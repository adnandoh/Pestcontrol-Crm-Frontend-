import React, { useEffect, useState, useCallback } from 'react';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  RefreshCw, 
  Search,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Bell
} from 'lucide-react';
import { Card, CardContent, PageLoading } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { StaffPerformance } from '../types';

const StaffPerformancePage: React.FC = () => {
  const [performance, setPerformance] = useState<StaffPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<string>('today');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPerformance = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await enhancedApiService.getStaffPerformance(period);
      setPerformance(data);
    } catch (error) {
      console.error('Error fetching staff performance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const filteredPerformance = performance.filter(staff => 
    staff.staff_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const periods = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Staff Performance
          </h1>
          <p className="text-sm text-gray-500 font-bold italic">Daily staff work tracking & conversion reports</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg border transition-all shadow-sm",
                period === p.id
                  ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-100"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              )}
            >
              {p.label}
            </button>
          ))}
          <button 
            onClick={fetchPerformance}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Search & Summary Stats */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search staff name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-fade-up">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic">Staff Name</th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">Inquiries Created</th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">Website Converted</th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">CRM Converted</th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">Bookings Created</th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">On Process</th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">Done</th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">Complaints</th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">Reminders</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-right">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                      <span className="text-sm font-black text-gray-400 uppercase tracking-tighter italic">Fetching Performance Data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPerformance.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-10 w-10 text-gray-200" />
                      <span className="text-sm font-black text-gray-400 uppercase tracking-tighter italic">No Staff Records Found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPerformance.map((staff) => (
                  <tr key={staff.staff_id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm uppercase shadow-sm border border-blue-200">
                          {staff.staff_name.charAt(0)}
                        </div>
                        <span className="font-black text-gray-900 text-sm uppercase tracking-tight group-hover:text-blue-700 transition-colors">
                          {staff.staff_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-gray-800">{staff.total_inquiries_created}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Total</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-blue-600">{staff.website_inquiries_converted}</span>
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">Web</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-indigo-600">{staff.crm_inquiries_converted}</span>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">CRM</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-emerald-600">{staff.total_bookings_created}</span>
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Bookings</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-orange-600">{staff.total_on_process_updates}</span>
                        <span className="text-[9px] font-bold text-orange-400 uppercase tracking-tighter">WIP</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-green-600">{staff.total_done_updates}</span>
                        <span className="text-[9px] font-bold text-green-400 uppercase tracking-tighter">Done</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-red-600">{staff.total_complaint_calls_created}</span>
                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter italic">Calls</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-yellow-600">{staff.total_reminders_created}</span>
                        <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-tighter">Renewals</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 shadow-sm">
                        <TrendingUp className="h-3 w-3 text-blue-600 mr-1.5" />
                        <span className="text-sm font-black text-blue-700">{staff.conversion_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-up delay-300">
        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Top Performer</p>
                <h3 className="text-2xl font-black tracking-tight">
                  {filteredPerformance.length > 0 
                    ? [...filteredPerformance].sort((a, b) => b.conversion_rate - a.conversion_rate)[0].staff_name 
                    : '---'}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
            <Users className="absolute -bottom-4 -right-4 h-24 w-24 text-white/10" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden relative border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">System Average</p>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  {filteredPerformance.length > 0
                    ? Math.round(filteredPerformance.reduce((acc, curr) => acc + curr.conversion_rate, 0) / filteredPerformance.length)
                    : 0}%
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <Clock className="absolute -bottom-4 -right-4 h-24 w-24 text-gray-50" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white overflow-hidden relative border border-gray-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Work Actions</p>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  {filteredPerformance.reduce((acc, curr) => 
                    acc + curr.total_inquiries_created + curr.total_bookings_created + curr.total_on_process_updates + curr.total_done_updates, 0
                  )}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                <FileText className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <Bell className="absolute -bottom-4 -right-4 h-24 w-24 text-gray-50" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffPerformancePage;
