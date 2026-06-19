import React, { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import { cn } from '../../utils/cn';
import type { StaffTrackingAttendance } from '../../types';

const AttendancePage: React.FC = () => {
  const [today, setToday] = useState<StaffTrackingAttendance[]>([]);
  const [report, setReport] = useState<StaffTrackingAttendance[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchToday = useCallback(async () => {
    const data = await enhancedApiService.getStaffTrackingAttendanceToday();
    setToday(data);
  }, []);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await enhancedApiService.getStaffTrackingAttendanceReport({
        from: fromDate || undefined,
        to: toDate || undefined,
        page_size: 100,
      });
      setReport(data);
    } catch (error) {
      console.error('Attendance report error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchToday();
    fetchReport();
  }, [fetchToday, fetchReport]);

  const rows = report.length > 0 ? report : today;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-indigo-600" />
            Staff Attendance
          </h1>
          <p className="text-sm text-gray-500 font-bold italic">GPS check-in / check-out records</p>
        </div>
        <button onClick={() => { fetchToday(); fetchReport(); }} className="p-2 bg-white border rounded-lg">
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="text-xs font-bold text-gray-600">
          From
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="block mt-1 border rounded-lg px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-bold text-gray-600">
          To
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="block mt-1 border rounded-lg px-3 py-2 text-sm" />
        </label>
        <button onClick={fetchReport} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg">
          Apply
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-black uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Check in</th>
              <th className="px-4 py-3">Check out</th>
              <th className="px-4 py-3">Distance</th>
              <th className="px-4 py-3">Late</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-bold">{row.staff_name}</td>
                <td className="px-4 py-3">{row.date}</td>
                <td className="px-4 py-3">{new Date(row.check_in_at).toLocaleTimeString()}</td>
                <td className="px-4 py-3">
                  {row.check_out_at ? new Date(row.check_out_at).toLocaleTimeString() : '—'}
                </td>
                <td className="px-4 py-3">{Number(row.total_distance_km || 0).toFixed(1)} km</td>
                <td className="px-4 py-3">
                  <span className={cn('font-bold', row.is_late ? 'text-red-600' : 'text-green-600')}>
                    {row.is_late ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-semibold">
                  No attendance records for selected period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendancePage;
