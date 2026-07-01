import React, { useEffect, useState } from 'react';
import { Search, Calendar, UserPlus } from 'lucide-react';
import { enhancedApiService } from '../services/api.enhanced';
import { CrmTableShell, crmThClass, crmTdClass } from '../components/crm/CrmDataTable';
import { Pagination } from '../components/ui';
import CopyablePhone from '../components/crm/CopyablePhone';
import { cn } from '../utils/cn';
import type { CRMInquiryStatus, PartnerReferral } from '../types';
import { showAlert } from '../utils/notify';

const statusColors: Record<CRMInquiryStatus, string> = {
  New: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  Contacted: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Converted: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Closed: 'bg-gray-100 text-gray-700 ring-gray-600/20',
};

const partnerStatusBadge: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  successful: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-700',
};

function formatReferredAt(row: PartnerReferral): string {
  const date = row.inquiry_date || row.referred_at?.slice(0, 10);
  const time = row.inquiry_time?.slice(0, 5);
  if (!date) return '—';
  try {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return time ? `${dateStr} ${time}` : dateStr;
  } catch {
    return date;
  }
}

const PartnerReferrals: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [pagination, setPagination] = useState({ count: 0, current: 1, pageSize: 15 });

  const loadReferrals = async (page = 1) => {
    try {
      setLoading(true);
      const response = await enhancedApiService.getPartnerReferrals({
        page,
        page_size: pagination.pageSize,
        search: filters.search || undefined,
        status: (filters.status as CRMInquiryStatus) || undefined,
        ordering: '-created_at',
      });
      setReferrals(response.results);
      setPagination((prev) => ({ ...prev, count: response.count, current: page }));
    } catch (err) {
      console.error('Failed to load partner referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.length > 0 && searchInput.length < 2) return;
      setFilters((prev) => ({ ...prev, search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadReferrals(1);
  }, [filters]);

  const handleStatusChange = async (id: number, newStatus: CRMInquiryStatus) => {
    try {
      setSubmitting(id);
      const updated = await enhancedApiService.updatePartnerReferralStatus(id, newStatus);
      setReferrals((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      showAlert(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-emerald-600" />
            Partner Referrals
          </h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            Total {pagination.count}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
        <form
          className="flex-1 min-w-[200px] relative"
          onSubmit={(e) => {
            e.preventDefault();
            loadReferrals(1);
          }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search client, mobile, partner…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
          />
        </form>
        <select
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2"
        >
          <option value="">All statuses</option>
          <option value="New">New / Pending</option>
          <option value="Contacted">Contacted</option>
          <option value="Converted">Converted</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <CrmTableShell>
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 border-b border-slate-200 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
              <tr>
                <th className={cn(crmThClass, 'w-12')}>ID</th>
                <th className={cn(crmThClass, 'min-w-[140px]')}>Client</th>
                <th className={cn(crmThClass, 'min-w-[120px]')}>Area</th>
                <th className={cn(crmThClass, 'min-w-[160px]')}>Partner (Technician)</th>
                <th className={cn(crmThClass, 'w-36')}>Referred at</th>
                <th className={cn(crmThClass, 'w-28')}>App status</th>
                <th className={cn(crmThClass, 'w-32')}>CRM status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent mx-auto" />
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                    No partner referrals yet.
                  </td>
                </tr>
              ) : (
                referrals.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className={cn(crmTdClass, 'text-xs font-semibold text-slate-400 tabular-nums')}>
                      {row.id}
                    </td>
                    <td className={crmTdClass}>
                      <p className="font-semibold text-slate-900">{row.client_name}</p>
                      <CopyablePhone phone={row.mobile} className="text-xs mt-0.5" />
                    </td>
                    <td className={crmTdClass}>
                      <p className="text-xs text-slate-700 truncate max-w-[160px]" title={row.area}>
                        {row.area || '—'}
                      </p>
                    </td>
                    <td className={crmTdClass}>
                      <p className="font-semibold text-slate-900 text-sm">{row.partner_name}</p>
                      <p className="text-[10px] text-slate-500">{row.partner_mobile}</p>
                      <p className="text-[10px] text-indigo-600 capitalize">{row.partner_role?.replace('_', ' ')}</p>
                    </td>
                    <td className={crmTdClass}>
                      <p className="text-xs text-slate-700 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatReferredAt(row)}
                      </p>
                      {row.crm_inquiry_id && (
                        <p className="text-[10px] text-slate-400 mt-0.5">CRM #{row.crm_inquiry_id}</p>
                      )}
                    </td>
                    <td className={crmTdClass}>
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                          partnerStatusBadge[row.partner_status] || partnerStatusBadge.pending,
                        )}
                      >
                        {row.partner_status_label}
                      </span>
                    </td>
                    <td className={crmTdClass}>
                      <select
                        value={row.crm_status}
                        onChange={(e) => handleStatusChange(row.id, e.target.value as CRMInquiryStatus)}
                        disabled={submitting === row.id}
                        className={cn(
                          'w-full max-w-[130px] rounded-lg border-0 py-1.5 pl-2 pr-6 text-[10px] font-bold uppercase cursor-pointer ring-1 ring-inset',
                          statusColors[row.crm_status],
                        )}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Converted">Converted</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CrmTableShell>

      {pagination.count > pagination.pageSize && (
        <Pagination
          currentPage={pagination.current}
          totalPages={Math.ceil(pagination.count / pagination.pageSize)}
          totalItems={pagination.count}
          itemsPerPage={pagination.pageSize}
          onPageChange={(page) => loadReferrals(page)}
          showPageSizeSelector={false}
        />
      )}
    </div>
  );
};

export default PartnerReferrals;
