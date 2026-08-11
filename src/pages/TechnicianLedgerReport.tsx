import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  Download,
  Info,
  ReceiptText,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import dayjs from 'dayjs';

import { Button, PageLoading } from '../components/ui';
import { Pagination } from '../components/ui/Pagination';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type {
  Technician,
  TechnicianLedgerPayment,
  TechnicianLedgerResponse,
  TechnicianLedgerRow,
} from '../types';

const PAGE_SIZE = 20;

type SettlementTab = '' | 'unsettled' | 'settled' | 'history' | 'legacy';

type Filters = {
  technician: string;
  from: string;
  to: string;
  city: string;
  service_type: string;
  status: string;
  booking_type: string;
  settlement_status: SettlementTab;
  page: number;
};

const defaultFilters = (technician: string): Filters => ({
  technician,
  from: dayjs().startOf('month').format('YYYY-MM-DD'),
  to: dayjs().endOf('month').format('YYYY-MM-DD'),
  city: '',
  service_type: '',
  status: '',
  booking_type: '',
  settlement_status: 'unsettled',
  page: 1,
});

const money = (value?: string | number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const prettyDate = (value: string) => dayjs(value).format('DD MMM YYYY');

const TechnicianLedgerReport: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const technicianFromUrl = searchParams.get('technician') || '';

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [techniciansLoaded, setTechniciansLoaded] = useState(false);
  const [data, setData] = useState<TechnicianLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters(technicianFromUrl));
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  const [settling, setSettling] = useState(false);
  const [settleMessage, setSettleMessage] = useState<string | null>(null);

  useEffect(() => {
    enhancedApiService.getActiveTechnicians()
      .then((rows) => {
        setTechnicians(rows);
        setFilters((current) => ({
          ...current,
          technician: current.technician || (rows[0] ? String(rows[0].id) : ''),
        }));
      })
      .catch(() => setError('Could not load the technician list. Please refresh the page.'))
      .finally(() => setTechniciansLoaded(true));
  }, []);

  useEffect(() => {
    if (!filters.technician || filters.technician === technicianFromUrl) return;
    const next = new URLSearchParams(searchParams);
    next.set('technician', filters.technician);
    setSearchParams(next, { replace: true });
  }, [filters.technician, technicianFromUrl, searchParams, setSearchParams]);

  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);

  const load = useCallback(async () => {
    if (!filters.technician || invalidRange) return;
    setLoading(true);
    try {
      const report = await enhancedApiService.getTechnicianLedger(
        Number(filters.technician),
        {
          from: filters.from || undefined,
          to: filters.to || undefined,
          city: filters.city || undefined,
          service_type: filters.service_type || undefined,
          booking_type: filters.booking_type || undefined,
          status: filters.status || undefined,
          settlement_status: filters.settlement_status || undefined,
          page: filters.page,
          page_size: PAGE_SIZE,
        },
      );
      setData(report);
      setSelectedJobIds([]);
      setError(null);
      if (report.payment_history.length > 0) setShowPayments(true);
    } catch (err) {
      console.error('Failed to load technician ledger', err);
      setError('We could not load this report. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [filters, invalidRange]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const updateFilter = (key: keyof Filters, value: string | number) => {
    setFilters((current) => {
      const next = { ...current, [key]: value, page: key === 'page' ? Number(value) : 1 };
      if (key === 'from' && next.to && String(value) > next.to) next.to = String(value);
      if (key === 'to' && next.from && String(value) < next.from) next.from = String(value);
      return next;
    });
  };

  const resetFilters = () => setFilters(defaultFilters(filters.technician));

  const activeFilterCount = useMemo(
    () => [filters.city, filters.service_type, filters.booking_type, filters.status]
      .filter(Boolean).length,
    [filters.city, filters.service_type, filters.booking_type, filters.status],
  );

  const unsettledRows = useMemo(
    () => (data?.results || []).filter((row) => row.settlement_status === 'unsettled'),
    [data],
  );

  const selectedPayable = useMemo(
    () => unsettledRows
      .filter((row) => selectedJobIds.includes(row.job_id))
      .reduce((sum, row) => sum + Number(row.pending_amount || 0), 0),
    [unsettledRows, selectedJobIds],
  );

  const allUnsettledSelected = unsettledRows.length > 0
    && unsettledRows.every((row) => selectedJobIds.includes(row.job_id));

  const toggleJob = (jobId: number, checked: boolean) => {
    setSelectedJobIds((current) => (
      checked
        ? Array.from(new Set([...current, jobId]))
        : current.filter((id) => id !== jobId)
    ));
  };

  const toggleAllUnsettled = (checked: boolean) => {
    setSelectedJobIds(checked ? unsettledRows.map((row) => row.job_id) : []);
  };

  const settleSelected = async () => {
    if (!filters.technician || selectedJobIds.length === 0) return;
    setSettling(true);
    setSettleMessage(null);
    try {
      const result = await enhancedApiService.settleTechnicianLedgerJobs(
        Number(filters.technician),
        { job_ids: selectedJobIds },
      );
      setSettleMessage(
        `Settled ${result.job_count} service(s) · ${money(result.net_amount)}. Rows stay on the ledger as Settled.`,
      );
      setSelectedJobIds([]);
      await load();
    } catch (err) {
      console.error('Failed to settle ledger jobs', err);
      setSettleMessage('Could not settle selected services. Please try again.');
    } finally {
      setSettling(false);
    }
  };

  const downloadCsv = () => {
    if (!data?.results.length) return;
    const headings = [
      'Booking Date', 'Booking ID', 'Customer', 'Property Type', 'Service', 'City',
      'Booking Type', 'Service Number', 'Assigned Technicians', 'Visit Status',
      'Payment Status', 'Settlement Date', 'Booking Amount', 'Service Value',
      'Tech Share %', 'Technician Payable', 'Company Share', 'Bonus', 'Penalty',
      'Already Paid', 'Still To Pay', 'Rating',
    ];
    const rows = data.results.map((row) => [
      row.booking_date, row.booking_id, row.customer_name, row.property_type || '',
      row.service_type, row.city, row.booking_type_label, row.service_number || '',
      row.assigned_technicians || '', row.status,
      row.settlement_status_label || row.payout_status_label || row.payout_status || '',
      row.settlement_date || '', row.booking_amount, row.visit_revenue,
      row.technician_share_percent || '40', row.technician_share,
      row.company_share, row.bonus, row.penalty, row.paid_amount, row.pending_amount,
      row.customer_rating ?? '',
    ]);
    const csv = [headings, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `technician-ledger-${data.technician.name}-${filters.from}-to-${filters.to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!techniciansLoaded) return <PageLoading />;

  return (
    <div className="space-y-3 pb-8">
      {/* Compact header */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-lg font-black tracking-tight text-gray-900">
            <ReceiptText className="h-5 w-5 shrink-0 text-emerald-700" />
            Technician Ledger
          </h1>
          <p className="text-[11px] font-medium text-gray-500">
            Per completed service · Settled / Unsettled · multi-select settle
          </p>
        </div>
        <Button
          onClick={downloadCsv}
          disabled={!data?.results.length}
          size="sm"
          className="h-8 gap-1.5 bg-gray-900 px-3 text-[11px] hover:bg-black"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </header>

      {/* Filters — one compact panel */}
      <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-7">
          <FilterSelect
            label="Technician"
            value={filters.technician}
            includeAllOption={false}
            onChange={(value) => updateFilter('technician', value)}
            options={technicians.map((row) => ({ value: String(row.id), label: row.name }))}
            placeholder="Choose"
            className="col-span-2 sm:col-span-1 xl:col-span-1"
          />
          <FilterInput
            label="From"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(value) => updateFilter('from', value)}
          />
          <FilterInput
            label="To"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(value) => updateFilter('to', value)}
          />
          <FilterSelect
            label="City"
            value={filters.city}
            onChange={(value) => updateFilter('city', value)}
            options={(data?.options.cities || []).map((value) => ({ value, label: value }))}
            allLabel="All cities"
            className="hidden xl:block"
          />
          <FilterSelect
            label="Service"
            value={filters.service_type}
            onChange={(value) => updateFilter('service_type', value)}
            options={(data?.options.service_types || []).map((value) => ({ value, label: value }))}
            allLabel="All services"
            className="hidden xl:block"
          />
          <FilterSelect
            label="Type"
            value={filters.booking_type}
            onChange={(value) => updateFilter('booking_type', value)}
            options={data?.options.booking_types || []}
            allLabel="All types"
            className="hidden xl:block"
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(value) => updateFilter('status', value)}
            options={data?.options.statuses || []}
            allLabel="Any status"
            className="hidden xl:block"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 xl:hidden">
          <button
            type="button"
            onClick={() => setShowMoreFilters((open) => !open)}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-100"
          >
            More filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-emerald-600 px-1.5 text-[9px] text-white">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showMoreFilters && 'rotate-180')} />
          </button>

          {(activeFilterCount > 0 || invalidRange) && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>

        {(activeFilterCount > 0 || invalidRange) && (
          <div className="mt-1.5 hidden xl:flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
            >
              <RotateCcw className="h-3 w-3" /> Reset filters
            </button>
          </div>
        )}

        {showMoreFilters && (
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-gray-100 pt-2 xl:hidden">
            <FilterSelect
              label="City"
              value={filters.city}
              onChange={(value) => updateFilter('city', value)}
              options={(data?.options.cities || []).map((value) => ({ value, label: value }))}
              allLabel="All cities"
            />
            <FilterSelect
              label="Service"
              value={filters.service_type}
              onChange={(value) => updateFilter('service_type', value)}
              options={(data?.options.service_types || []).map((value) => ({ value, label: value }))}
              allLabel="All services"
            />
            <FilterSelect
              label="Type"
              value={filters.booking_type}
              onChange={(value) => updateFilter('booking_type', value)}
              options={data?.options.booking_types || []}
              allLabel="All types"
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(value) => updateFilter('status', value)}
              options={data?.options.statuses || []}
              allLabel="Any status"
            />
          </div>
        )}
      </section>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-800">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={load} className="h-7 bg-white text-[11px]">
            Retry
          </Button>
        </div>
      )}

      {!technicians.length ? (
        <EmptyState
          title="No active technicians yet"
          message="Add a technician first, then come back to view their ledger."
        />
      ) : !filters.technician ? (
        <EmptyState
          title="Choose a technician"
          message="Pick a technician above to see their bookings, earnings and payments."
        />
      ) : loading && !data ? (
        <PageLoading />
      ) : data ? (
        <>
          {/* Name + key totals in one strip */}
          <section className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black text-gray-900">{data.technician.name}</h2>
                <p className="text-[10px] font-medium text-gray-500">
                  {data.technician.technician_type === 'salaried' ? 'Salaried' : 'Partner'}
                  {data.technician.mobile ? ` · ${data.technician.mobile}` : ''}
                  {' · '}
                  {prettyDate(filters.from)} – {prettyDate(filters.to)}
                  {loading && <span className="ml-2 text-blue-600">Updating…</span>}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-gray-600">
                <Chip>{data.summary.total_jobs} bookings</Chip>
                <Chip>{data.summary.one_time_jobs} one-time</Chip>
                <Chip>{data.summary.amc_jobs} AMC</Chip>
                <Chip>{data.summary.contract_jobs} contract</Chip>
                <Chip>★ {Number(data.summary.average_rating).toFixed(1)}</Chip>
              </div>
            </div>

            {/* Money strip — dense, 4 primary + expandable secondary */}
            <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-8">
              <MiniStat label="Revenue" value={money(data.summary.total_revenue_generated)} />
              <MiniStat label="Tech earned (40%)" value={money(data.summary.technician_share)} tone="emerald" highlight />
              <MiniStat label="Company (60%)" value={money(data.summary.company_share)} tone="purple" />
              <MiniStat
                label="Unsettled payable"
                value={money(data.unsettled_payable ?? data.summary.pending_amount)}
                tone="rose"
                highlight
              />
              <MiniStat label="Already settled" value={money(data.summary.paid_amount)} tone="blue" />
              <MiniStat label="Bonus" value={money(data.summary.bonus)} />
              <MiniStat label="Penalty" value={money(data.summary.penalty)} tone="rose" />
              <MiniStat label="Total payable" value={money(data.summary.net_payable)} tone="amber" highlight />
            </div>

            {/* Daily / monthly / lifetime — one thin row */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px]">
              <span className="font-black uppercase tracking-wide text-emerald-800">Earnings</span>
              <span className="font-semibold text-emerald-900">
                Today <strong>{money(data.earnings.daily)}</strong>
              </span>
              <span className="font-semibold text-emerald-900">
                Month <strong>{money(data.earnings.monthly)}</strong>
              </span>
              <span className="font-semibold text-emerald-900">
                Lifetime <strong>{money(data.earnings.lifetime)}</strong>
              </span>
              <span className="ml-auto text-[10px] font-medium text-emerald-700/80">
                Completed visits only · not filtered by dates above
              </span>
            </div>
          </section>

          {/* Payment Settlement */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
              <h2 className="text-sm font-black text-gray-900">
                Payment Settlement
                <span className="ml-2 text-[11px] font-semibold text-gray-500">
                  {data.count === 0 ? 'none' : `${data.count} found`}
                </span>
              </h2>
              <div className="flex flex-wrap gap-1">
                {([
                  ['unsettled', 'Unsettled'],
                  ['settled', 'Settlement History'],
                  ['history', 'Old Service Calls'],
                  ['', 'All'],
                ] as Array<[SettlementTab, string]>).map(([value, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => updateFilter('settlement_status', value)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[10px] font-black',
                      filters.settlement_status === value
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {settleMessage && (
              <div className="border-b border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
                {settleMessage}
              </div>
            )}

            {selectedJobIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-3 py-2">
                <p className="text-[11px] font-bold text-amber-900">
                  Selected {selectedJobIds.length} service
                  {selectedJobIds.length > 1 ? 's' : ''} → Total Technician Payable{' '}
                  <strong>{money(selectedPayable)}</strong>
                </p>
                <Button
                  size="sm"
                  onClick={settleSelected}
                  disabled={settling}
                  className="h-7 bg-emerald-700 px-3 text-[11px] hover:bg-emerald-800"
                >
                  {settling ? 'Settling…' : 'Settle Payment'}
                </Button>
              </div>
            )}

            {data.results.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-xs font-bold text-gray-500">No bookings found</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Widen the date range or clear filters.</p>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-gray-100 lg:hidden">
                  {data.results.map((row) => (
                    <li key={row.job_id}>
                      <BookingCard
                        row={row}
                        selected={selectedJobIds.includes(row.job_id)}
                        onToggle={(checked) => toggleJob(row.job_id, checked)}
                      />
                    </li>
                  ))}
                </ul>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[1280px] text-left text-[11px]">
                    <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-2 py-2 font-black">
                          <input
                            type="checkbox"
                            checked={allUnsettledSelected}
                            disabled={unsettledRows.length === 0}
                            onChange={(event) => toggleAllUnsettled(event.target.checked)}
                            aria-label="Select all unsettled"
                          />
                        </th>
                        <th className="px-3 py-2 font-black">Booking</th>
                        <th className="px-3 py-2 font-black">Customer</th>
                        <th className="px-3 py-2 font-black">Property</th>
                        <th className="px-3 py-2 font-black">Service</th>
                        <th className="px-3 py-2 font-black">Type / #</th>
                        <th className="px-3 py-2 font-black">Technicians</th>
                        <th className="px-3 py-2 font-black">Visit / Pay</th>
                        <th className="px-3 py-2 text-right font-black">Booking</th>
                        <th className="px-3 py-2 text-right font-black">Service ₹</th>
                        <th className="px-3 py-2 text-right font-black">Share %</th>
                        <th className="px-3 py-2 text-right font-black">Tech pay</th>
                        <th className="px-3 py-2 text-right font-black">Settled on</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.results.map((row) => (
                        <BookingRow
                          key={row.job_id}
                          row={row}
                          selected={selectedJobIds.includes(row.job_id)}
                          onToggle={(checked) => toggleJob(row.job_id, checked)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {data.total_pages > 1 && (
                  <div className="border-t border-gray-100 px-2">
                    <Pagination
                      currentPage={data.page}
                      totalPages={data.total_pages}
                      totalItems={data.count}
                      itemsPerPage={data.page_size}
                      onPageChange={(page) => updateFilter('page', page)}
                    />
                  </div>
                )}
              </>
            )}
          </section>

          {/* Payments — collapsed when empty */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setShowPayments((open) => !open)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-emerald-700" />
                <h2 className="text-sm font-black text-gray-900">Payments</h2>
                <span className="text-[11px] font-semibold text-gray-500">
                  {data.payment_history.length === 0
                    ? 'none in this period'
                    : `${data.payment_history.length} settlement${data.payment_history.length > 1 ? 's' : ''}`}
                </span>
              </div>
              <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', showPayments && 'rotate-180')} />
            </button>

            {showPayments && (
              data.payment_history.length === 0 ? (
                <p className="border-t border-gray-100 px-3 py-4 text-center text-[11px] font-medium text-gray-400">
                  Payments appear after a settlement is created for this technician.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-gray-100 border-t border-gray-100 lg:hidden">
                    {data.payment_history.map((payment) => (
                      <li key={payment.id}>
                        <PaymentCard payment={payment} />
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto border-t border-gray-100 lg:block">
                    <table className="w-full min-w-[700px] text-left text-[11px]">
                      <thead className="bg-gray-50 text-[9px] uppercase tracking-wider text-gray-500">
                        <tr>
                          <th className="px-3 py-2 font-black">#</th>
                          <th className="px-3 py-2 font-black">Period</th>
                          <th className="px-3 py-2 text-right font-black">Earnings</th>
                          <th className="px-3 py-2 text-right font-black">Bonus</th>
                          <th className="px-3 py-2 text-right font-black">Penalty</th>
                          <th className="px-3 py-2 text-right font-black">Net</th>
                          <th className="px-3 py-2 font-black">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.payment_history.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-bold text-gray-900">#{payment.id}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {prettyDate(payment.period_start)} – {prettyDate(payment.period_end)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">{money(payment.gross_amount)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-emerald-700">{money(payment.bonus)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-rose-700">{money(payment.penalty)}</td>
                            <td className="px-3 py-2 text-right font-black">{money(payment.net_amount)}</td>
                            <td className="px-3 py-2">
                              <StatusPill status={payment.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )
            )}
          </section>

          <p className="flex items-start gap-1.5 px-1 text-[10px] font-medium text-gray-400">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              <strong className="text-gray-500">Visit</strong> = service completed or not.
              {' '}<strong className="text-gray-500">Pay</strong> = Settled / Unsettled (not Visit Done).
              One-Time = full 40%. AMC / Bed Bugs = per completed service (Bed Bugs = package ÷ 2 × 40%).
              Multi-tech = same 40% split equally. Settled rows stay on the ledger with a settlement date.
            </span>
          </p>
        </>
      ) : null}
    </div>
  );
};

const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
    {children}
  </span>
);

const MiniStat = ({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  tone?: 'emerald' | 'purple' | 'rose' | 'blue' | 'amber';
  highlight?: boolean;
}) => {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700',
    purple: 'text-purple-700',
    rose: 'text-rose-700',
    blue: 'text-blue-700',
    amber: 'text-amber-800',
  };
  return (
    <div
      className={cn(
        'rounded-lg border px-2 py-1.5',
        highlight ? 'border-emerald-200 bg-emerald-50/60' : 'border-gray-100 bg-gray-50/80',
      )}
    >
      <p className="truncate text-[9px] font-black uppercase tracking-wide text-gray-500">{label}</p>
      <p className={cn('mt-0.5 truncate text-sm font-black text-gray-900', tone && tones[tone])}>
        {value}
      </p>
    </div>
  );
};

const FilterSelect = ({
  label,
  value,
  options,
  onChange,
  allLabel = 'All',
  placeholder,
  includeAllOption = true,
  className,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  allLabel?: string;
  placeholder?: string;
  includeAllOption?: boolean;
  className?: string;
}) => (
  <label className={cn('block min-w-0', className)}>
    <span className="mb-0.5 block text-[9px] font-black uppercase tracking-wide text-gray-500">
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 w-full rounded-lg border border-gray-200 bg-white px-2 text-[11px] font-bold text-gray-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
    >
      {includeAllOption
        ? <option value="">{allLabel}</option>
        : !value && <option value="">{placeholder || 'Select'}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </label>
);

const FilterInput = ({ label, value, min, max, onChange, className }: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
  className?: string;
}) => (
  <label className={cn('block min-w-0', className)}>
    <span className="mb-0.5 block text-[9px] font-black uppercase tracking-wide text-gray-500">
      {label}
    </span>
    <div className="relative">
      <Calendar className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-7 pr-1.5 text-[11px] font-bold text-gray-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
      />
    </div>
  </label>
);

const StatusPill = ({ status, done }: { status: string; done?: boolean }) => (
  <span
    className={cn(
      'inline-block rounded px-1.5 py-0.5 text-[9px] font-black capitalize',
      done === undefined
        ? 'bg-gray-100 text-gray-700'
        : done
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-amber-50 text-amber-700',
    )}
  >
    {status.replaceAll('_', ' ')}
  </span>
);

const TypePill = ({ label }: { label: string }) => (
  <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-black text-blue-700">
    {label}
  </span>
);

const visitLabel = (row: TechnicianLedgerRow) => {
  if (row.booking_type === 'one_time') return null;
  if (!row.planned_visits && !row.service_cycle) return null;
  return `V${row.service_cycle || '—'}/${row.planned_visits || '—'}`;
};

const SettlementPill = ({ row }: { row: TechnicianLedgerRow }) => {
  const status = row.settlement_status || '';
  const text = row.settlement_status_label
    || (status === 'settled' ? 'Settled'
      : status === 'unsettled' ? 'Unsettled'
        : status === 'legacy' ? 'Old record'
          : status === 'n_a' ? 'N/A'
            : row.payout_status_label || '—');
  const tone =
    status === 'settled'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'unsettled'
        ? 'bg-amber-50 text-amber-700'
        : status === 'legacy'
          ? 'bg-gray-100 text-gray-600'
          : 'bg-slate-50 text-slate-600';
  return (
    <span className={cn('inline-block rounded px-1.5 py-0.5 text-[9px] font-black', tone)}>
      {text}
    </span>
  );
};

/** Two clear rows so staff don't confuse Visit Done with Pay Settled. */
const VisitPayStatus = ({ row }: { row: TechnicianLedgerRow }) => (
  <div className="flex min-w-[118px] flex-col gap-1">
    <div className="flex items-center gap-1.5">
      <span className="w-7 shrink-0 text-[8px] font-black uppercase tracking-wide text-gray-400">
        Visit
      </span>
      <StatusPill status={row.status} done={row.is_completed_visit} />
    </div>
    <div className="flex items-center gap-1.5">
      <span className="w-7 shrink-0 text-[8px] font-black uppercase tracking-wide text-gray-400">
        Pay
      </span>
      <SettlementPill row={row} />
    </div>
  </div>
);

const BookingRow = ({
  row,
  selected,
  onToggle,
}: {
  row: TechnicianLedgerRow;
  selected: boolean;
  onToggle: (checked: boolean) => void;
}) => {
  const canSettle = row.settlement_status === 'unsettled';
  return (
    <tr className="hover:bg-gray-50/80">
      <td className="px-2 py-1.5">
        <input
          type="checkbox"
          checked={selected}
          disabled={!canSettle}
          onChange={(event) => onToggle(event.target.checked)}
          aria-label={`Select booking ${row.booking_id}`}
        />
      </td>
      <td className="px-3 py-1.5">
        <p className="font-bold text-gray-900">{prettyDate(row.booking_date)}</p>
        <p className="text-[10px] font-bold text-blue-600">#{row.booking_id}</p>
      </td>
      <td className="max-w-[120px] truncate px-3 py-1.5 font-semibold text-gray-800">
        {row.customer_name || '—'}
      </td>
      <td className="max-w-[90px] truncate px-3 py-1.5 text-gray-600">
        {row.property_type || '—'}
      </td>
      <td className="px-3 py-1.5">
        <p className="truncate font-semibold text-gray-800">{row.service_type || '—'}</p>
        <p className="text-[10px] text-gray-500">{row.city || '—'}</p>
      </td>
      <td className="px-3 py-1.5">
        <TypePill label={row.booking_type_label} />
        <p className="mt-0.5 text-[9px] text-gray-500">
          {row.service_number || visitLabel(row) || '—'}
        </p>
      </td>
      <td className="max-w-[120px] truncate px-3 py-1.5 text-gray-600">
        {row.assigned_technicians || '—'}
      </td>
      <td className="px-3 py-1.5">
        <VisitPayStatus row={row} />
      </td>
      <td className="px-3 py-1.5 text-right font-semibold text-gray-800">{money(row.booking_amount)}</td>
      <td className="px-3 py-1.5 text-right font-semibold text-gray-700">{money(row.visit_revenue)}</td>
      <td className="px-3 py-1.5 text-right font-semibold text-gray-600">
        {row.technician_share_percent || '40'}%
      </td>
      <td className="px-3 py-1.5 text-right font-black text-emerald-700">{money(row.technician_share)}</td>
      <td className="px-3 py-1.5 text-right text-gray-600">
        {row.settlement_date ? prettyDate(row.settlement_date) : '—'}
      </td>
    </tr>
  );
};

const BookingCard = ({
  row,
  selected,
  onToggle,
}: {
  row: TechnicianLedgerRow;
  selected: boolean;
  onToggle: (checked: boolean) => void;
}) => {
  const canSettle = row.settlement_status === 'unsettled';
  return (
    <article className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={selected}
            disabled={!canSettle}
            onChange={(event) => onToggle(event.target.checked)}
            aria-label={`Select booking ${row.booking_id}`}
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-gray-900">{row.customer_name || 'Customer'}</p>
            <p className="text-[10px] font-bold text-blue-600">
              #{row.booking_id} · {prettyDate(row.booking_date)}
            </p>
          </div>
        </div>
        <VisitPayStatus row={row} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-gray-500">
        <TypePill label={row.booking_type_label} />
        <span>{row.service_type || '—'}</span>
        {row.property_type && <span>· {row.property_type}</span>}
        {row.service_number && <span>· {row.service_number}</span>}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-lg bg-gray-50 p-2 text-center">
        <div>
          <p className="text-[9px] font-bold uppercase text-gray-400">Booking</p>
          <p className="text-xs font-black">{money(row.booking_amount)}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase text-gray-400">Tech pay</p>
          <p className="text-xs font-black text-emerald-700">{money(row.technician_share)}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase text-gray-400">
            {row.settlement_status === 'settled' ? 'Settled' : 'Unsettled'}
          </p>
          <p className="text-xs font-black text-rose-700">
            {row.settlement_date ? prettyDate(row.settlement_date) : money(row.pending_amount)}
          </p>
        </div>
      </div>
    </article>
  );
};

const PaymentCard = ({ payment }: { payment: TechnicianLedgerPayment }) => (
  <article className="px-3 py-2.5">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-xs font-black text-gray-900">#{payment.id}</p>
        <p className="text-[10px] text-gray-500">
          {prettyDate(payment.period_start)} – {prettyDate(payment.period_end)}
        </p>
      </div>
      <StatusPill status={payment.status} />
    </div>
    <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[10px]">
      <div>
        <p className="font-bold text-gray-400">Earn</p>
        <p className="font-black">{money(payment.gross_amount)}</p>
      </div>
      <div>
        <p className="font-bold text-gray-400">Bonus</p>
        <p className="font-black text-emerald-700">{money(payment.bonus)}</p>
      </div>
      <div>
        <p className="font-bold text-gray-400">Penalty</p>
        <p className="font-black text-rose-700">{money(payment.penalty)}</p>
      </div>
      <div>
        <p className="font-bold text-gray-400">Net</p>
        <p className="font-black">{money(payment.net_amount)}</p>
      </div>
    </div>
  </article>
);

const EmptyState = ({ title, message }: { title: string; message: string }) => (
  <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center">
    <p className="text-sm font-bold text-gray-600">{title}</p>
    <p className="mt-0.5 text-xs text-gray-400">{message}</p>
  </div>
);

export default TechnicianLedgerReport;
