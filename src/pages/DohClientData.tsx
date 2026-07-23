import React, { useCallback, useEffect, useState } from 'react';
import { Database, Search } from 'lucide-react';
import { format } from 'date-fns';
import { PageLoading, Pagination } from '../components/ui';
import { CrmTableShell, crmThClass, crmTdClass } from '../components/crm/CrmDataTable';
import RemarkListCell from '../components/crm/RemarkListCell';
import CopyablePhone from '../components/crm/CopyablePhone';
import { enhancedApiService } from '../services/api.enhanced';
import type { BookingReportClient } from '../types';
import { showAlert } from '../utils/notify';
import { cn } from '../utils/cn';
import { openWhatsApp, whatsAppTemplates } from '../utils/whatsapp';

const DohClientData: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<BookingReportClient[]>([]);
  const [pagination, setPagination] = useState({
    count: 0,
    current: 1,
    pageSize: 10,
  });
  const [nameInput, setNameInput] = useState('');
  const [numberInput, setNumberInput] = useState('');
  const [filters, setFilters] = useState({ name: '', number: '' });

  const loadRows = useCallback(
    async (page = 1, nextFilters = filters) => {
      try {
        setLoading(true);
        const response = await enhancedApiService.getBookingReportClients({
          page,
          page_size: pagination.pageSize,
          name: nextFilters.name || undefined,
          number: nextFilters.number || undefined,
          ordering: 'name',
        });
        setRows(response.results);
        setPagination((prev) => ({
          ...prev,
          count: response.count,
          current: page,
        }));
      } catch (error) {
        console.error(error);
        showAlert(error instanceof Error ? error.message : 'Failed to load DOH client data');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.pageSize],
  );

  useEffect(() => {
    loadRows(1, filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = {
        name: nameInput.trim(),
        number: numberInput.trim(),
      };
      setFilters(next);
      loadRows(1, next);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [nameInput, numberInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchRow = (id: number, patch: Record<string, unknown>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const totalPages = Math.max(1, Math.ceil(pagination.count / pagination.pageSize) || 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
            <Database className="h-6 w-6 text-emerald-700" />
            DOH Client Data
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Last 6 months booking clients — filter by name or number, add remarks per row.
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">
          {pagination.count.toLocaleString()} clients
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Filter by name
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Search name…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-emerald-500/30 focus:bg-white focus:ring-2"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Filter by number
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="tel"
              inputMode="numeric"
              value={numberInput}
              onChange={(e) => setNumberInput(e.target.value)}
              placeholder="Search mobile…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-emerald-500/30 focus:bg-white focus:ring-2"
            />
          </div>
        </label>
      </div>

      {loading ? (
        <PageLoading text="Loading DOH client data…" />
      ) : (
        <CrmTableShell compact>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className={crmThClass}>#</th>
                <th className={crmThClass}>Name</th>
                <th className={crmThClass}>Mobile</th>
                <th className={cn(crmThClass, 'min-w-[220px]')}>Remark</th>
                <th className={crmThClass}>Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-slate-500">
                    No DOH clients found.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className={crmTdClass}>
                      {(pagination.current - 1) * pagination.pageSize + index + 1}
                    </td>
                    <td className={crmTdClass}>
                      <span className="font-semibold text-slate-900">{row.name}</span>
                    </td>
                    <td className={crmTdClass}>
                      <CopyablePhone
                        phone={row.mobile}
                        onWhatsApp={() =>
                          openWhatsApp(row.mobile, whatsAppTemplates.customerInquiry(row.name))
                        }
                      />
                    </td>
                    <td className={crmTdClass}>
                      <RemarkListCell sourceType="booking_report" row={row} onUpdate={patchRow} />
                    </td>
                    <td className={crmTdClass}>
                      <span className="text-xs text-slate-500">
                        {row.updated_at ? format(new Date(row.updated_at), 'd MMM yyyy') : '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CrmTableShell>
      )}

      <Pagination
        currentPage={pagination.current}
        totalPages={totalPages}
        totalItems={pagination.count}
        itemsPerPage={pagination.pageSize}
        onPageChange={(page) => loadRows(page, filters)}
        showPageSizeSelector={false}
        showGoToPage={true}
      />
    </div>
  );
};

export default DohClientData;
