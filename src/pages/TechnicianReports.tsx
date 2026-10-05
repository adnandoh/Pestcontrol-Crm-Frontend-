import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  MapPin,
  UserX,
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

const CITY_FILTERS = [
  'Mumbai',
  'Navi Mumbai',
  'Thane',
  'Pune',
  'Lonavala',
] as const;

type PerformanceTab = 'performed' | 'not_performed';

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
  const today = todayInKolkata();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [city, setCity] = useState('');
  const [typeTab, setTypeTab] = useState<(typeof TYPE_TABS)[number]['api']>('priority');
  const [performanceTab, setPerformanceTab] = useState<PerformanceTab>('performed');
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
          from: dateFrom,
          to: dateTo,
          city: city || undefined,
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
  }, [dateFrom, dateTo, city, typeTab]);

  const performed = report?.performed || report?.performing || [];
  const notPerformed = report?.not_performed || report?.non_performing || [];
  const performedCount = report?.summary.performed_count ?? report?.summary.performing_count ?? performed.length;
  const notPerformedCount =
    report?.summary.not_performed_count ?? report?.summary.non_performing_count ?? notPerformed.length;
  const activeRows = performanceTab === 'performed' ? performed : notPerformed;
  const rangeLabel =
    report?.from && report?.to
      ? report.from === report.to
        ? report.from
        : `${report.from} → ${report.to}`
      : `${dateFrom} → ${dateTo}`;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-emerald-600" />
            Technician Reports
          </h1>
          <p className="text-sm font-bold text-gray-500 mt-1">
            Tap Performed or Not Performed to see On Process bookings for the selected India date range and city.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end flex-wrap gap-3">
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-500">
              From (India)
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  if (!e.target.value) return;
                  setDateFrom(e.target.value);
                  if (e.target.value > dateTo) setDateTo(e.target.value);
                }}
                className="h-10 pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-500">
              To (India)
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(e) => {
                  if (e.target.value) setDateTo(e.target.value);
                }}
                className="h-10 pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="min-w-[200px]">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-500">
              City
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCity('')}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors',
                  !city
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300',
                )}
              >
                All
              </button>
              {CITY_FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCity(item)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors',
                    city === item
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300',
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
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
          {report.technician_type_label} · {rangeLabel}
          {city ? ` · ${city}` : ' · All cities'}
          {' · '}
          On Process only
        </p>
      )}

      {/* Performed / Not Performed tap buttons — one list at a time */}
      <div className="grid grid-cols-2 gap-3 max-w-xl">
        <button
          type="button"
          onClick={() => setPerformanceTab('performed')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3.5 text-sm font-black uppercase tracking-wide transition-all',
            performanceTab === 'performed'
              ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
              : 'border-emerald-200 bg-white text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50',
          )}
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Performed</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-black tabular-nums',
              performanceTab === 'performed' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800',
            )}
          >
            {loading ? '…' : performedCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPerformanceTab('not_performed')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3.5 text-sm font-black uppercase tracking-wide transition-all',
            performanceTab === 'not_performed'
              ? 'border-amber-600 bg-amber-600 text-white shadow-md'
              : 'border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50',
          )}
        >
          <UserX className="h-5 w-5 shrink-0" />
          <span>Not Performed</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-black tabular-nums',
              performanceTab === 'not_performed' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800',
            )}
          >
            {loading ? '…' : notPerformedCount}
          </span>
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : (
        <>
          <TechnicianGroup
            title={performanceTab === 'performed' ? 'Performed' : 'Not Performed'}
            hint={
              performanceTab === 'performed'
                ? 'Technicians with at least one On Process booking in the selected filters.'
                : 'Active technicians with zero On Process bookings in the selected filters.'
            }
            tone={performanceTab === 'performed' ? 'emerald' : 'amber'}
            rows={activeRows}
            loading={loading}
            showServices={performanceTab === 'performed'}
            onOpenLedger={(id) => navigate(`/technician-ledger?technician=${id}`)}
          />
          {performanceTab === 'performed' && (
            <CityEarnings cities={report?.city_earnings || []} loading={loading} />
          )}
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
                Process jobs
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                Status
              </th>
              {showServices && (
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200">
                  Services
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
                  <td colSpan={showServices ? 7 : 6} className="px-4 py-6">
                    <div className="h-4 bg-gray-100 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={showServices ? 7 : 6} className="px-4 py-10 text-center text-sm font-bold text-gray-400">
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
                  <td className="px-4 py-3 font-black text-gray-900">
                    {tech.process_count ?? tech.completed_count}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ring-inset',
                        (tech.performance_status || title) === 'Performed'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                          : 'bg-amber-50 text-amber-700 ring-amber-200',
                      )}
                    >
                      {tech.performance_status || title}
                    </span>
                  </td>
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

export default TechnicianReports;
