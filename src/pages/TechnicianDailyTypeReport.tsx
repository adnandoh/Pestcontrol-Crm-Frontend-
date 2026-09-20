import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  IndianRupee,
  MapPin,
  UserX,
  Users,
} from 'lucide-react';
import CopyablePhone from '../components/crm/CopyablePhone';
import { Button } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import type {
  TechnicianDailyTypeReport,
  TechnicianDailyTypeRow,
  TechnicianType,
} from '../types';
import { cn } from '../utils/cn';
import { technicianTypeLabel } from '../utils/technicianType';

/**
 * Priority = partner (broadcast pool). Secondary / Salaried keep API values.
 * Performing = completed ≥1 Done job on the selected day.
 */
const TYPE_TABS: { value: TechnicianType | 'priority'; label: string; api: string }[] = [
  { value: 'priority', label: 'Priority', api: 'priority' },
  { value: 'secondary', label: 'Secondary', api: 'secondary' },
  { value: 'salaried', label: 'Salaried', api: 'salaried' },
];

const money = (v: string | number | undefined) => {
  const n = Number(v ?? 0);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const TechnicianDailyTypeReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [typeTab, setTypeTab] = useState<(typeof TYPE_TABS)[number]['api']>('priority');
  const [view, setView] = useState<'performing' | 'non_performing' | 'city'>('performing');
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<TechnicianDailyTypeReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await enhancedApiService.getTechnicianDailyTypeReport({
          date,
          technician_type: typeTab,
        });
        if (!cancelled) setReport(data);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.error || 'Failed to load daily report');
          setReport(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, typeTab]);

  const rows: TechnicianDailyTypeRow[] =
    view === 'performing'
      ? report?.performing || []
      : view === 'non_performing'
        ? report?.non_performing || []
        : [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-emerald-600" />
            Daily Technician Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Separate Priority / Secondary / Salaried views. Performing = completed ≥1 job that day.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              // Empty value would 400/confuse the report; keep last valid day.
              if (e.target.value) setDate(e.target.value);
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium"
          />
          <Button variant="outline" onClick={() => navigate('/technician-reports')}>
            Overall performance
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.api}
            type="button"
            onClick={() => setTypeTab(tab.api)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              typeTab === tab.api
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {report && (
        <p className="text-xs text-gray-500">
          {report.technician_type_label} · {report.performing_rule}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-600" />}
          label="Active techs"
          value={String(report?.summary.total_technicians ?? '—')}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          label="Performing"
          value={String(report?.summary.performing_count ?? '—')}
        />
        <StatCard
          icon={<UserX className="h-5 w-5 text-amber-600" />}
          label="Non-performing"
          value={String(report?.summary.non_performing_count ?? '—')}
        />
        <StatCard
          icon={<IndianRupee className="h-5 w-5 text-violet-600" />}
          label="Day earnings"
          value={money(report?.summary.total_earnings)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['performing', 'Performing'],
            ['non_performing', 'Non-performing'],
            ['city', 'City-wise earnings'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-semibold',
              view === key
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 ring-1 ring-gray-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center text-gray-500">
          Loading report…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-red-700">{error}</div>
      ) : view === 'city' ? (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Technicians</th>
                <th className="px-4 py-3">Jobs</th>
                <th className="px-4 py-3">Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(report?.city_earnings || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    No city earnings for this day
                  </td>
                </tr>
              ) : (
                report?.city_earnings.map((c) => (
                  <tr key={c.city} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {c.city}
                      </span>
                    </td>
                    <td className="px-4 py-3">{c.technician_count}</td>
                    <td className="px-4 py-3">{c.completed_jobs}</td>
                    <td className="px-4 py-3 font-semibold">{money(c.earnings)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Technician</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Jobs</th>
                <th className="px-4 py-3">Services</th>
                <th className="px-4 py-3">Earnings</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No technicians in this list
                  </td>
                </tr>
              ) : (
                rows.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{t.name}</div>
                      <CopyablePhone phone={t.mobile} className="text-xs text-gray-500" />
                    </td>
                    <td className="px-4 py-3">{t.city || '—'}</td>
                    <td className="px-4 py-3 font-semibold">{t.completed_count}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-gray-700">{t.services_summary || '—'}</div>
                      {t.city_earnings?.length > 0 && (
                        <div className="mt-1 text-xs text-gray-400">
                          {t.city_earnings
                            .map((c) => `${c.city}: ${money(c.earnings)}`)
                            .join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">{money(t.earnings)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-sm font-semibold text-emerald-700 hover:underline"
                        onClick={() => navigate(`/technician-ledger?technician=${t.id}`)}
                      >
                        Ledger
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {report && (
        <p className="text-xs text-gray-400">
          Type filter: {technicianTypeLabel(report.technician_type)} · Date {report.date}
        </p>
      )}
    </div>
  );
};

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-gray-900">{value}</div>
    </div>
  );
}

export default TechnicianDailyTypeReportPage;
