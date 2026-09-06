import React, { useMemo, useState } from 'react';
import { CalendarDays, Building2, Users, IndianRupee, CheckCircle2 } from 'lucide-react';
import type { DashboardStatisticsResponse, RevenueSharingBreakdown } from '../../types';
import { cn } from '../../utils/cn';

function formatINR(value: number | undefined | null): string {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

type ViewMode = 'daily' | 'monthly';

interface Props {
  stats: DashboardStatisticsResponse | null;
  loading?: boolean;
}

const StatPill: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone: 'slate' | 'blue' | 'emerald' | 'amber';
  icon: React.ReactNode;
}> = ({ label, value, hint, tone, icon }) => {
  const tones = {
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
  };
  const iconTone = {
    slate: 'bg-slate-200/80 text-slate-700',
    blue: 'bg-blue-200/70 text-blue-800',
    emerald: 'bg-emerald-200/70 text-emerald-800',
    amber: 'bg-amber-200/70 text-amber-800',
  };
  return (
    <div className={cn('rounded-2xl border p-4 shadow-sm', tones[tone])}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
        <span className={cn('rounded-lg p-1.5', iconTone[tone])}>{icon}</span>
      </div>
      <p className="text-2xl font-black tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-[11px] font-semibold opacity-70">{hint}</p> : null}
    </div>
  );
};

export const RevenueSharingPanel: React.FC<Props> = ({ stats, loading }) => {
  const [view, setView] = useState<ViewMode>('daily');
  const sharing: RevenueSharingBreakdown | undefined = stats?.sharing_breakdown;
  const summary = sharing?.summary;
  const techPct = sharing?.technician_percent ?? 40;
  const companyPct = sharing?.company_percent ?? 60;

  const rows = useMemo(() => {
    if (!sharing) return [];
    return view === 'daily' ? sharing.daily || [] : sharing.monthly || [];
  }, [sharing, view]);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm animate-fade-up">
      <div className="flex flex-col gap-4 border-b border-gray-100 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-blue-100">
              60 / 40 Model
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
              Completed calls
            </span>
          </div>
          <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
            Technician / Company Sharing
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            Company keeps <strong className="text-white">{companyPct}%</strong>, technician pool gets{' '}
            <strong className="text-white">{techPct}%</strong> of completed booking revenue.
            {sharing?.from && sharing?.to ? (
              <>
                {' '}
                Showing <span className="text-white">{sharing.from}</span> →{' '}
                <span className="text-white">{sharing.to}</span>.
              </>
            ) : null}
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-white/15 bg-white/10 p-1 backdrop-blur">
          {([
            { id: 'daily' as const, label: 'Day-wise', icon: CalendarDays },
            { id: 'monthly' as const, label: 'Month-wise', icon: Building2 },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide transition-all',
                view === tab.id
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white',
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 sm:p-5">
        <StatPill
          label="Completed bookings"
          value={loading ? '…' : String(summary?.bookings ?? 0)}
          hint="Done jobs in range"
          tone="slate"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatPill
          label="Total revenue"
          value={loading ? '…' : formatINR(summary?.revenue)}
          hint="Visit / booking amount"
          tone="amber"
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatPill
          label={`Technician ${techPct}%`}
          value={loading ? '…' : formatINR(summary?.technician_share)}
          hint="Partner / tech pool"
          tone="blue"
          icon={<Users className="h-4 w-4" />}
        />
        <StatPill
          label={`Company ${companyPct}%`}
          value={loading ? '…' : formatINR(summary?.company_share)}
          hint="Company share"
          tone="emerald"
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      {!loading && (summary?.revenue ?? 0) > 0 ? (
        <div className="px-4 pb-2 sm:px-5">
          <div className="overflow-hidden rounded-full bg-slate-100 h-3 flex">
            <div
              className="bg-blue-500 transition-all"
              style={{ width: `${techPct}%` }}
              title={`Technician ${techPct}%`}
            />
            <div
              className="bg-emerald-500 transition-all"
              style={{ width: `${companyPct}%` }}
              title={`Company ${companyPct}%`}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span className="text-blue-700">Tech {techPct}%</span>
            <span className="text-emerald-700">Company {companyPct}%</span>
          </div>
        </div>
      ) : null}

      <div className="border-t border-gray-100 px-4 pb-5 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">
            {view === 'daily' ? 'Daily breakdown' : 'Monthly summary'}
          </h3>
          <p className="text-[10px] font-semibold text-gray-400">
            Auto-updates from completed Done bookings
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm font-medium text-gray-400">
            Loading sharing report…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm font-medium text-gray-400">
            No completed bookings with revenue in this date range.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="max-h-[360px] overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">{view === 'daily' ? 'Date' : 'Month'}</th>
                    <th className="px-4 py-3 text-right">Bookings</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right text-blue-700">Tech {techPct}%</th>
                    <th className="px-4 py-3 text-right text-emerald-700">Company {companyPct}%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {rows.map((row) => {
                    const isDaily = 'date' in row;
                    const key = isDaily ? row.date : `${row.year}-${row.month}`;
                    const label = isDaily ? formatShortDate(row.date) : row.month_label;
                    return (
                      <tr key={key} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-bold text-gray-900">{label}</td>
                        <td className="px-4 py-3 text-right font-black tabular-nums text-gray-800">
                          {row.bookings}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-amber-800">
                          {formatINR(row.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-blue-700">
                          {formatINR(row.technician_share)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700">
                          {formatINR(row.company_share)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 sm:grid-cols-3">
          <p>
            <span className="font-black text-slate-800">Bookings:</span> completed Done jobs in
            the selected dates (complaints & salaried excluded).
          </p>
          <p>
            <span className="font-black text-blue-800">Technician {techPct}%:</span> payout pool
            shared with partner technicians.
          </p>
          <p>
            <span className="font-black text-emerald-800">Company {companyPct}%:</span> company
            retained share of the same completed revenue.
          </p>
        </div>
      </div>
    </section>
  );
};

export default RevenueSharingPanel;
