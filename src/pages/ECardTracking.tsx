import React, { useCallback, useEffect, useState } from 'react';
import { Search, Smartphone, Monitor, Tablet, Users, CalendarDays, IdCard } from 'lucide-react';
import dayjs from 'dayjs';
import { Pagination } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';

type ECardVisitRow = {
  city: string;
  device_type: string;
  traffic_source: string;
  visited_at: string;
};

const TRAFFIC_SOURCES = [
  '',
  'Google Search',
  'Facebook',
  'Instagram',
  'WhatsApp',
  'YouTube',
  'LinkedIn',
  'Email',
  'Direct Link',
  'Another Website (Referral)',
];

const DEVICE_TYPES = ['', 'Mobile', 'Desktop', 'Tablet'];

function DeviceIcon({ type }: { type: string }) {
  const t = (type || '').toLowerCase();
  if (t === 'mobile') return <Smartphone className="h-3.5 w-3.5" />;
  if (t === 'tablet') return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

const ECardTracking: React.FC = () => {
  const [rows, setRows] = useState<ECardVisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalVisitors, setTotalVisitors] = useState(0);
  const [todayVisitors, setTodayVisitors] = useState(0);
  const [pagination, setPagination] = useState({
    count: 0,
    current: 1,
    pageSize: 20,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({
    city: '',
    device_type: '',
    traffic_source: '',
    date_from: '',
    date_to: '',
  });

  const loadData = useCallback(
    async (page = 1, current = filters) => {
      try {
        setLoading(true);
        const res = await enhancedApiService.getECardTracking({
          page,
          page_size: pagination.pageSize,
          city: current.city.trim() || undefined,
          device_type: current.device_type || undefined,
          traffic_source: current.traffic_source || undefined,
          date_from: current.date_from || undefined,
          date_to: current.date_to || undefined,
        });
        setRows(res.results || []);
        setTotalVisitors(res.total_visitors ?? 0);
        setTodayVisitors(res.today_visitors ?? 0);
        setPagination((prev) => ({
          ...prev,
          count: res.count ?? 0,
          current: page,
          totalPages: Math.max(1, Math.ceil((res.count ?? 0) / prev.pageSize)),
        }));
      } catch (error) {
        console.error('Failed to load e-card tracking:', error);
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.pageSize],
  );

  useEffect(() => {
    loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApply = () => loadData(1, filters);
  const handleReset = () => {
    const empty = {
      city: '',
      device_type: '',
      traffic_source: '',
      date_from: '',
      date_to: '',
    };
    setFilters(empty);
    loadData(1, empty);
  };

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full animate-fade-up">
      <div className="bg-white p-4 border border-gray-200 shadow-xs rounded-sm space-y-1">
        <div className="flex items-center gap-2">
          <IdCard className="h-5 w-5 text-blue-700" />
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight uppercase italic">
            E-Card Tracking
          </h1>
        </div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          Visitors for pestcontrol99.com/e-card/
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Visitors</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{totalVisitors}</p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Today&apos;s Visitors</p>
            <p className="text-3xl font-black text-emerald-700 mt-1">{todayVisitors}</p>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="bg-white p-3 border border-gray-200 shadow-xs rounded-sm flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="text-[10px] font-bold uppercase text-gray-400">City</label>
          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              className="w-full h-9 pl-8 pr-3 text-sm border border-gray-200 rounded-lg"
              placeholder="Search city…"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            />
          </div>
        </div>
        <div className="min-w-[150px]">
          <label className="text-[10px] font-bold uppercase text-gray-400">Device</label>
          <select
            className="w-full h-9 mt-1 px-2 text-sm border border-gray-200 rounded-lg bg-white"
            value={filters.device_type}
            onChange={(e) => setFilters({ ...filters, device_type: e.target.value })}
          >
            <option value="">All devices</option>
            {DEVICE_TYPES.filter(Boolean).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="text-[10px] font-bold uppercase text-gray-400">Traffic Source</label>
          <select
            className="w-full h-9 mt-1 px-2 text-sm border border-gray-200 rounded-lg bg-white"
            value={filters.traffic_source}
            onChange={(e) => setFilters({ ...filters, traffic_source: e.target.value })}
          >
            <option value="">All sources</option>
            {TRAFFIC_SOURCES.filter(Boolean).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="text-[10px] font-bold uppercase text-gray-400">From</label>
          <input
            type="date"
            className="w-full h-9 mt-1 px-2 text-sm border border-gray-200 rounded-lg"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
          />
        </div>
        <div className="min-w-[140px]">
          <label className="text-[10px] font-bold uppercase text-gray-400">To</label>
          <input
            type="date"
            className="w-full h-9 mt-1 px-2 text-sm border border-gray-200 rounded-lg"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
          />
        </div>
        <button
          type="button"
          onClick={handleApply}
          className="h-9 px-4 text-xs font-bold uppercase bg-blue-700 text-white rounded-lg hover:bg-blue-800"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="h-9 px-3 text-xs font-bold uppercase bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
        >
          Reset
        </button>
      </div>

      <div className="bg-white border border-gray-200 shadow-xs rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <th className="text-left px-4 py-3">Date &amp; Time</th>
                <th className="text-left px-4 py-3">City</th>
                <th className="text-left px-4 py-3">Device</th>
                <th className="text-left px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-xs font-bold text-gray-400 uppercase">
                    Loading visitors…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-xs font-bold text-gray-400 uppercase">
                    No visitors yet
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row, idx) => (
                  <tr key={`${row.visited_at}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {dayjs(row.visited_at).isValid()
                        ? dayjs(row.visited_at).format('DD MMM YYYY hh:mm A')
                        : row.visited_at}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.city || 'Unknown'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-gray-700 font-semibold">
                        <DeviceIcon type={row.device_type} />
                        {row.device_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {row.traffic_source}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-gray-100">
            <Pagination
              currentPage={pagination.current}
              totalPages={pagination.totalPages}
              totalItems={pagination.count}
              itemsPerPage={pagination.pageSize}
              onPageChange={(page) => loadData(page)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ECardTracking;
