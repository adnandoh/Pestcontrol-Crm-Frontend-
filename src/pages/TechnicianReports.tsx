import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  IndianRupee,
  MapPin,
  UserX,
  Users,
} from 'lucide-react';
import CopyablePhone from '../components/crm/CopyablePhone';
import { enhancedApiService } from '../services/api.enhanced';
import type {
  TechnicianDailyCityEarning,
  TechnicianDailyTypeReport,
  TechnicianDailyTypeRow,
} from '../types';
import { cn } from '../utils/cn';

/**
 * Priority is the partner broadcast pool. Dates are Asia/Kolkata so a visit
 * finished after midnight in India is not attributed to the previous UTC day.
 */
const TYPE_TABS = [
  { api: 'priority', label: 'Priority' },
  { api: 'secondary', label: 'Secondary' },
  { api: 'salaried', label: 'Salaried' },
] as const;

function todayInKolkata(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function money(value: string | number | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '₹0';
  const whole = Math.abs(amount - Math.round(amount)) < 0.001;
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

const TechnicianReports: React.FC = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayInKolkata);
  const [typeTab, setTypeTab] = useState<(typeof TYPE_TABS)[number]['api']>('priority');
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
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error
            || 'Failed to load technician report';
          setError(message);
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

  const performing = report?.performing || [];
  const nonPerforming = report?.non_performing || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-emerald-600" />
            Technician Reports
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-1">
            Priority, Secondary, and Salaried are separate. Performing means at least one completed service that day.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-500">
            Date (India)
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
              className="h-10 pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          </div>
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
          {report.technician_type_label} · {report.date} · {report.performing_rule}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="h-5 w-5 text-blue-600" />}
          label="Active technicians"
          value={loading ? '…' : String(report?.summary.total_technicians ?? 0)}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          label="Performing"
          value={loading ? '…' : String(report?.summary.performing_count ?? 0)}
        />
        <StatCard
          icon={<UserX className="h-5 w-5 text-amber-600" />}
          label="Non-performing"
          value={loading ? '…' : String(report?.summary.non_performing_count ?? 0)}
        />
        <StatCard
          icon={<IndianRupee className="h-5 w-5 text-violet-600" />}
          label="Day share"
          value={loading ? '…' : money(report?.summary.total_earnings)}
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : (
        <>
          <TechnicianGroup
            title="Performing"
            hint="Completed at least one service on this date. Counts are finished visits, not cancelled jobs."
            tone="emerald"
            rows={performing}
            loading={loading}
            showServices
            onOpenLedger={(id) => navigate(`/technician-ledger?technician=${id}`)}
          />
          <TechnicianGroup
            title="Non-performing"
            hint="Active technicians of this type with zero completed services on this date."
            tone="amber"
            rows={nonPerforming}
            loading={loading}
            showServices={false}
            onOpenLedger={(id) => navigate(`/technician-ledger?technician=${id}`)}
          />
          <CityEarnings cities={report?.city_earnings || []} loading={loading} />
        </>
      )}
    </div>
  );
};

function TechnicianGroup({
  title,
  hint,
  tone,
  rows,
  loading,
  showServices,
  onOpenLedger,
}: {
  title: string;
  hint: string;
  tone: 'emerald' | 'amber';
  rows: TechnicianDailyTypeRow[];
  loading: boolean;
  showServices: boolean;
  onOpenLedger: (id: number) => void;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                tone === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500',
              )}
            />
            {title}
            <span className="text-gray-400">{loading ? '' : rows.length}</span>
          </h2>
          <p className="text-[11px] font-medium text-gray-500 mt-1">{hint}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                Technician
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                Jobs
              </th>
              {showServices && (
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                  Services completed
                </th>
              )}
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                Earnings by city
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                Share
              </th>
              <th className="px-4 py-3 border-b border-gray-200" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td colSpan={showServices ? 6 : 5} className="px-4 py-6">
                    <div className="h-4 bg-gray-100 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={showServices ? 6 : 5} className="px-4 py-10 text-center text-sm font-bold text-gray-400">
                  No technicians in this group
                </td>
              </tr>
            ) : (
              rows.map((tech) => (
                <tr key={tech.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-black text-gray-900 uppercase">{tech.name}</p>
                    <CopyablePhone phone={tech.mobile} className="text-[10px] font-bold text-gray-500" />
                    <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{tech.city || '—'}</p>
                  </td>
                  <td className="px-4 py-3 font-black text-gray-900">{tech.completed_count}</td>
                  {showServices && (
                    <td className="px-4 py-3">
                      <ServiceChips tech={tech} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <CityShareList cities={tech.city_earnings} />
                  </td>
                  <td className="px-4 py-3 text-right font-black text-emerald-700">
                    {money(tech.earnings)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onOpenLedger(tech.id)}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-blue-600"
                      title="Open technician ledger"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ServiceChips({ tech }: { tech: TechnicianDailyTypeRow }) {
  if (!tech.services?.length) {
    return <span className="text-xs font-semibold text-gray-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5 max-w-md">
      {tech.services.map((service) => (
        <span
          key={service.service_type}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800"
        >
          {service.service_type}
          <span className="font-black">{service.count}</span>
        </span>
      ))}
    </div>
  );
}

function CityShareList({ cities }: { cities: TechnicianDailyCityEarning[] | undefined }) {
  if (!cities?.length) {
    return <span className="text-xs font-semibold text-gray-400">—</span>;
  }
  return (
    <div className="space-y-1">
      {cities.map((city) => (
        <div key={city.city} className="flex items-center gap-1.5 text-xs text-gray-700">
          <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="font-semibold">{city.city}</span>
          <span className="text-gray-400">{city.completed_jobs} jobs</span>
          <span className="font-black text-gray-900">{money(city.earnings)}</span>
        </div>
      ))}
    </div>
  );
}

function CityEarnings({
  cities,
  loading,
}: {
  cities: TechnicianDailyCityEarning[];
  loading: boolean;
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
          <MapPin className="h-4 w-4 text-blue-500" />
          Earnings by city
        </h2>
        <p className="text-[11px] font-medium text-gray-500 mt-1">
          Technician share of the stored service base, grouped by the booking city. Salaried staff show ₹0.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">City</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Technicians</th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Jobs</th>
              <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">Loading city earnings…</td>
              </tr>
            ) : cities.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm font-bold text-gray-400">
                  No city earnings for this day
                </td>
              </tr>
            ) : (
              cities.map((city) => (
                <tr key={city.city} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-black text-gray-900">{city.city}</td>
                  <td className="px-4 py-3">{city.technician_count ?? '—'}</td>
                  <td className="px-4 py-3">{city.completed_jobs}</td>
                  <td className="px-4 py-3 text-right font-black text-emerald-700">{money(city.earnings)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-gray-900 tracking-tight">{value}</div>
    </div>
  );
}

export default TechnicianReports;
