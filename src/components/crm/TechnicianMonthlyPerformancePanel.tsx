import { useEffect, useState } from 'react';
import { CalendarDays, ClipboardList, IndianRupee, Loader2 } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import type { TechnicianMonthlyPerformance } from '../../types';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

interface Props {
  technicianId: number;
}

export default function TechnicianMonthlyPerformancePanel({ technicianId }: Props) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<TechnicianMonthlyPerformance | null>(null);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    enhancedApiService
      .getTechnicianPerformanceDetail(technicianId, { year, month })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        console.error(err);
        if (!cancelled) {
          setData(null);
          setError('Could not load monthly performance');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [technicianId, year, month]);

  const earnings = Number(data?.monthly_earnings || 0);
  const bookings = data?.monthly_bookings ?? 0;

  return (
    <section className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-5 shadow-sm md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <CalendarDays className="h-5 w-5 text-blue-700" />
            Monthly Performance
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Partner share earned and completed bookings for the selected month
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            aria-label="Select month"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            aria-label="Select year"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      ) : error ? (
        <p className="py-4 text-sm font-medium text-red-600">{error}</p>
      ) : (
        <>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-700">
            {data?.month_label || `${MONTHS[month - 1]?.label} ${year}`}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-emerald-700">
                <IndianRupee className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Monthly Earnings</span>
              </div>
              <p className="text-2xl font-black text-gray-900">
                ₹{earnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-gray-500">{data?.earnings_note}</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-blue-700">
                <ClipboardList className="h-4 w-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Monthly Bookings</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{bookings}</p>
              <p className="mt-1 text-xs text-gray-500">Completed bookings in this month</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
