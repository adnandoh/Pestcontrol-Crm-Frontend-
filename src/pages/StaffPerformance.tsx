import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Bell,
  PhoneCall,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { RemarkCallActivityReport, StaffPerformance } from '../types';

function istYmd(d: Date): string {
  // Format YYYY-MM-DD in Asia/Kolkata
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function formatDisplayDate(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

const StaffPerformancePage: React.FC = () => {
  const [performance, setPerformance] = useState<StaffPerformance[]>([]);
  const [remarkReport, setRemarkReport] = useState<RemarkCallActivityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<string>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [staffFilter, setStaffFilter] = useState<string>('');
  /** Draft date inputs (Apply commits these). */
  const [dateDraft, setDateDraft] = useState({ from: '', to: '' });
  /** Applied custom range sent to the API / used by the call board. */
  const [appliedDates, setAppliedDates] = useState({ from: '', to: '' });

  const hasCustomRange = Boolean(appliedDates.from || appliedDates.to);

  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true);
      const staffId = staffFilter ? Number(staffFilter) : undefined;
      const performancePeriod = period === 'custom' ? 'today' : period;
      const [perf, remarks] = await Promise.all([
        enhancedApiService.getStaffPerformance(performancePeriod),
        enhancedApiService.getRemarkCallActivities({
          staff_id: staffId,
          from: appliedDates.from || undefined,
          to: appliedDates.to || undefined,
        }),
      ]);
      setPerformance(perf);
      setRemarkReport(remarks);
    } catch (error) {
      console.error('Error fetching staff performance:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period, staffFilter, appliedDates.from, appliedDates.to]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const staffOptions = useMemo(() => {
    const rows = remarkReport?.staff?.length
      ? remarkReport.staff
      : performance.map((s) => ({ staff_id: s.staff_id, staff_name: s.staff_name }));
    return rows;
  }, [remarkReport, performance]);

  const filteredPerformance = performance.filter((staff) => {
    if (staffFilter && String(staff.staff_id) !== staffFilter) return false;
    return staff.staff_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredRemarkStaff = (remarkReport?.staff || []).filter((staff) => {
    if (staffFilter && String(staff.staff_id) !== staffFilter) return false;
    return staff.staff_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  /** Main call board respects applied custom dates (API `selected`), else Today. */
  const callBoard = useMemo(() => {
    const source =
      hasCustomRange && remarkReport?.selected?.length
        ? remarkReport.selected
        : hasCustomRange && remarkReport?.staff?.length
          ? remarkReport.staff.map((s) => ({
              staff_id: s.staff_id,
              staff_name: s.staff_name,
              count: s.custom ?? 0,
              crm_count: s.custom_crm ?? 0,
              website_count: s.custom_website ?? 0,
            }))
          : period === 'yesterday' && remarkReport?.staff
            ? remarkReport.staff.map((s) => ({
                staff_id: s.staff_id,
                staff_name: s.staff_name,
                count: s.yesterday,
                crm_count: 0,
                website_count: 0,
              }))
            : period === 'this_week' && remarkReport?.staff
              ? remarkReport.staff.map((s) => ({
                  staff_id: s.staff_id,
                  staff_name: s.staff_name,
                  count: s.last_7_days,
                  crm_count: 0,
                  website_count: 0,
                }))
              : period === 'this_month' && remarkReport?.staff
                ? remarkReport.staff.map((s) => ({
                    staff_id: s.staff_id,
                    staff_name: s.staff_name,
                    count: s.this_month,
                    crm_count: 0,
                    website_count: 0,
                  }))
                : remarkReport?.today || [];

    return [...source]
      .filter((row) => {
        if (staffFilter && String(row.staff_id) !== staffFilter) return false;
        return row.staff_name.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => b.count - a.count || a.staff_name.localeCompare(b.staff_name));
  }, [remarkReport, hasCustomRange, period, staffFilter, searchTerm]);

  const callBoardTitle = useMemo(() => {
    if (hasCustomRange) {
      const from = appliedDates.from || appliedDates.to;
      const to = appliedDates.to || appliedDates.from;
      if (from && to && from === to) {
        return `Staff Call Performance (${formatDisplayDate(from)})`;
      }
      return `Staff Call Performance (${formatDisplayDate(from)} – ${formatDisplayDate(to)})`;
    }
    if (period === 'yesterday') return "Yesterday's Staff Call Performance";
    if (period === 'this_week') return 'Last 7 Days Staff Call Performance';
    if (period === 'this_month') return "This Month's Staff Call Performance";
    return "Today's Staff Call Performance";
  }, [hasCustomRange, appliedDates, period]);

  const callCountHeader = hasCustomRange
    ? 'Call Count'
    : period === 'today'
      ? "Today's Call Count"
      : 'Call Count';

  const periods = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
  ];

  const handlePeriodChange = (id: string) => {
    setPeriod(id);
    const today = istYmd(new Date());
    if (id === 'today') {
      setDateDraft({ from: '', to: '' });
      setAppliedDates({ from: '', to: '' });
      return;
    }
    if (id === 'yesterday') {
      const y = addDaysYmd(today, -1);
      setDateDraft({ from: y, to: y });
      setAppliedDates({ from: y, to: y });
      return;
    }
    if (id === 'this_week') {
      const from = addDaysYmd(today, -6);
      setDateDraft({ from, to: today });
      setAppliedDates({ from, to: today });
      return;
    }
    if (id === 'this_month') {
      const from = `${today.slice(0, 8)}01`;
      setDateDraft({ from, to: today });
      setAppliedDates({ from, to: today });
    }
  };

  const handleApplyDates = () => {
    const next = {
      from: dateDraft.from,
      to: dateDraft.to || dateDraft.from,
    };
    if (next.from && next.to && next.from > next.to) {
      // swap if user inverted range
      setDateDraft({ from: next.to, to: next.from });
      setAppliedDates({ from: next.to, to: next.from });
    } else {
      setAppliedDates(next);
    }
    // Custom range overrides period chip highlight
    if (next.from || next.to) {
      setPeriod('custom');
    }
  };

  const clearRemarkFilters = () => {
    setStaffFilter('');
    setSearchTerm('');
    setDateDraft({ from: '', to: '' });
    setAppliedDates({ from: '', to: '' });
    setPeriod('today');
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Staff Performance
          </h1>
          <p className="text-sm text-gray-500 font-bold italic">
            Remark-Based Call Activities + conversion reports (IST)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePeriodChange(p.id)}
              className={cn(
                'px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg border transition-all shadow-sm',
                period === p.id
                  ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-100'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
              )}
            >
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <span className="px-3 py-2 text-xs font-black uppercase tracking-wider rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800">
              Custom Range
            </span>
          )}
          <button
            type="button"
            onClick={fetchAll}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-400 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-wrap items-end gap-3 shadow-sm">
        <div className="relative flex-1 min-w-[180px]">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">
            Search Staff
          </label>
          <Search className="absolute left-3 top-[30px] h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Staff name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none"
          />
        </div>
        <div className="w-44">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">
            Staff Filter
          </label>
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg font-semibold bg-white"
          >
            <option value="">All Staff</option>
            {staffOptions.map((s) => (
              <option key={s.staff_id} value={s.staff_id}>
                {s.staff_name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">
            From Date
          </label>
          <input
            type="date"
            value={dateDraft.from}
            onChange={(e) => setDateDraft((prev) => ({ ...prev, from: e.target.value }))}
            className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg font-semibold"
          />
        </div>
        <div className="w-40">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">
            To Date
          </label>
          <input
            type="date"
            value={dateDraft.to}
            min={dateDraft.from || undefined}
            onChange={(e) => setDateDraft((prev) => ({ ...prev, to: e.target.value }))}
            className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg font-semibold"
          />
        </div>
        <button
          type="button"
          onClick={clearRemarkFilters}
          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg uppercase"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleApplyDates}
          className="px-3 py-2 bg-blue-800 hover:bg-blue-900 text-white text-[11px] font-bold rounded-lg uppercase"
        >
          Apply
        </button>
      </div>

      {/* Remark-Based Call Performance (respects date filter) */}
      <div className="bg-white border border-emerald-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50/60 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-emerald-900 tracking-tight flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-emerald-700" />
              {callBoardTitle}
            </h2>
            <p className="text-[11px] font-bold text-emerald-700/80 uppercase tracking-wide mt-0.5">
              Remark-Based Call Activities · CRM Inquiries + Website Leads remarks
              {remarkReport?.selected_label && remarkReport.selected_label !== 'today'
                ? ` · ${remarkReport.selected_label}`
                : ''}
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2 py-1 rounded">
            Live from remark creates · edits do not re-count
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="px-6 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  Staff Name
                </th>
                <th className="px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                  {callCountHeader}
                </th>
                <th className="px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                  CRM Remarks
                </th>
                <th className="px-4 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                  Website Remarks
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm font-bold text-gray-400">
                    Loading call activities…
                  </td>
                </tr>
              ) : callBoard.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm font-bold text-gray-400">
                    No staff remark activity for this date range
                  </td>
                </tr>
              ) : (
                callBoard.map((row) => (
                  <tr key={row.staff_id} className="hover:bg-emerald-50/40">
                    <td className="px-6 py-4">
                      <span className="font-black text-gray-900 text-sm uppercase tracking-tight">
                        {row.staff_name}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex min-w-[2.5rem] justify-center rounded-full bg-emerald-600 px-3 py-1 text-sm font-black text-white">
                        {row.count}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-bold text-indigo-700">
                      {row.crm_count}
                    </td>
                    <td className="px-4 py-4 text-center text-sm font-bold text-blue-700">
                      {row.website_count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Period metrics report */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900 tracking-tight">
            Remark-Based Call Activity Report
          </h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">
            Today · Yesterday · Last 7 Days · This Month · Total
            {hasCustomRange && ' · Custom range'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <th className="px-6 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  Staff Name
                </th>
                <th className="px-3 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                  Today
                </th>
                <th className="px-3 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                  Yesterday
                </th>
                <th className="px-3 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                  Last 7 Days
                </th>
                <th className="px-3 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                  This Month
                </th>
                <th className="px-3 py-3 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">
                  Total
                </th>
                {hasCustomRange && (
                  <th className="px-3 py-3 text-[11px] font-black text-emerald-600 uppercase tracking-widest text-center">
                    Custom
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm font-bold text-gray-400">
                    Loading report…
                  </td>
                </tr>
              ) : filteredRemarkStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm font-bold text-gray-400">
                    No staff records
                  </td>
                </tr>
              ) : (
                filteredRemarkStaff.map((row) => (
                  <tr key={row.staff_id} className="hover:bg-blue-50/30">
                    <td className="px-6 py-4 font-black text-gray-900 text-sm uppercase tracking-tight">
                      {row.staff_name}
                    </td>
                    <td className="px-3 py-4 text-center text-sm font-black text-emerald-700">
                      {row.today}
                    </td>
                    <td className="px-3 py-4 text-center text-sm font-bold text-gray-700">
                      {row.yesterday}
                    </td>
                    <td className="px-3 py-4 text-center text-sm font-bold text-gray-700">
                      {row.last_7_days}
                    </td>
                    <td className="px-3 py-4 text-center text-sm font-bold text-gray-700">
                      {row.this_month}
                    </td>
                    <td className="px-3 py-4 text-center text-sm font-black text-slate-900">
                      {row.total}
                    </td>
                    {hasCustomRange && (
                      <td className="px-3 py-4 text-center text-sm font-black text-emerald-700">
                        {row.custom ?? 0}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Existing conversion performance table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-fade-up">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-black text-gray-900 tracking-tight">
            Conversion & Booking Performance
          </h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">
            Period: {period.replace('_', ' ')} · includes Remark-Based Call Activities column
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic">
                  Staff Name
                </th>
                <th className="px-4 py-4 text-[11px] font-black text-emerald-600 uppercase tracking-widest italic text-center">
                  Remark Calls
                </th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">
                  Inquiries Created
                </th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">
                  Website Converted
                </th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">
                  CRM Converted
                </th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">
                  Bookings Created
                </th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">
                  On Process
                </th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">
                  Done
                </th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">
                  Complaints
                </th>
                <th className="px-4 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-center">
                  Reminders
                </th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest italic text-right">
                  Conv. Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                      <span className="text-sm font-black text-gray-400 uppercase tracking-tighter italic">
                        Fetching Performance Data...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredPerformance.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-10 w-10 text-gray-200" />
                      <span className="text-sm font-black text-gray-400 uppercase tracking-tighter italic">
                        No Staff Records Found
                      </span>
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
                      <span className="text-sm font-black text-emerald-700">
                        {staff.remark_call_activities ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-gray-800">
                          {staff.total_inquiries_created}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                          Total
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-blue-600">
                          {staff.website_inquiries_converted}
                        </span>
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter">
                          Web
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-indigo-600">
                          {staff.crm_inquiries_converted}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">
                          CRM
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-emerald-600">
                          {staff.total_bookings_created}
                        </span>
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">
                          Bookings
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-orange-600">
                          {staff.total_on_process_updates}
                        </span>
                        <span className="text-[9px] font-bold text-orange-400 uppercase tracking-tighter">
                          WIP
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-green-600">
                          {staff.total_done_updates}
                        </span>
                        <span className="text-[9px] font-bold text-green-400 uppercase tracking-tighter">
                          Done
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-red-600">
                          {staff.total_complaint_calls_created}
                        </span>
                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter italic">
                          Calls
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-yellow-600">
                          {staff.total_reminders_created}
                        </span>
                        <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-tighter">
                          Renewals
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 shadow-sm">
                        <TrendingUp className="h-3 w-3 text-blue-600 mr-1.5" />
                        <span className="text-sm font-black text-blue-700">
                          {staff.conversion_rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-up delay-300">
        <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-700 text-white overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
                  Top Remark Calls (Selected Range)
                </p>
                <h3 className="text-2xl font-black tracking-tight">
                  {callBoard.length > 0
                    ? callBoard[0].staff_name
                    : '---'}
                </h3>
                <p className="text-sm font-bold mt-1 opacity-90">
                  {callBoard.length > 0
                    ? `${callBoard[0].count} activities`
                    : '0 activities'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <PhoneCall className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
                  Top Conversion
                </p>
                <h3 className="text-2xl font-black tracking-tight">
                  {filteredPerformance.length > 0
                    ? [...filteredPerformance].sort((a, b) => b.conversion_rate - a.conversion_rate)[0]
                        .staff_name
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
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Selected Range Calls (All)
                </p>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                  {callBoard.reduce((acc, row) => acc + row.count, 0)}
                </h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                <FileText className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <Clock className="absolute -bottom-4 -right-4 h-24 w-24 text-gray-50" />
            <Bell className="hidden" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffPerformancePage;
