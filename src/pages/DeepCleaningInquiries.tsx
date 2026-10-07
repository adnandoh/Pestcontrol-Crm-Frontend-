import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, CheckCheck, Search } from 'lucide-react';
import { PageLoading, Pagination, Badge } from '../components/ui';
import { CrmTableShell, crmThCompactClass, crmTdCompactClass } from '../components/crm/CrmDataTable';
import RemarkPanel from '../components/crm/RemarkPanel';
import CopyablePhone from '../components/crm/CopyablePhone';
import InquiryDateFilterBar from '../components/crm/InquiryDateFilterBar';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import { openWhatsApp, whatsAppTemplates } from '../utils/whatsapp';
import { showAlert } from '../utils/notify';
import {
  dateFilterToApiParams,
  EMPTY_DATE_FILTER,
  loadStoredDateFilter,
  saveStoredDateFilter,
  type InquiryDateFilterState,
} from '../utils/inquiryDateFilters';
import type { DeepCleaningInquiry, InquiryStatusCounts, PaginatedResponse } from '../types';

const DATE_FILTER_KEY = 'deepcleaning-inquiries-date-filter';

const TAB_STATUS_MAP: Record<string, keyof InquiryStatusCounts | 'all'> = {
  All: 'all',
  New: 'New',
  Contacted: 'Contacted',
  Converted: 'Converted',
  Closed: 'Closed',
};

function formatMoney(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `₹${n.toLocaleString('en-IN')}`;
}

const DeepCleaningInquiries: React.FC = () => {
  const [rows, setRows] = useState<DeepCleaningInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [statusCounts, setStatusCounts] = useState<InquiryStatusCounts | null>(null);
  const [readCounts, setReadCounts] = useState<{ all: number; unread: number; read: number } | null>(null);
  const [pagination, setPagination] = useState({
    count: 0,
    current: 1,
    pageSize: 15,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    read: '' as '' | 'unread' | 'read',
  });
  const [dateDraft, setDateDraft] = useState<InquiryDateFilterState>(() =>
    loadStoredDateFilter(DATE_FILTER_KEY),
  );
  const [appliedDateFilter, setAppliedDateFilter] = useState<InquiryDateFilterState>(() =>
    loadStoredDateFilter(DATE_FILTER_KEY),
  );
  const [activeTab, setActiveTab] = useState('All');
  const [searchInput, setSearchInput] = useState('');

  const tabs = ['All', 'New', 'Contacted', 'Converted', 'Closed'];

  const loadRows = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const dateParams = dateFilterToApiParams(appliedDateFilter);
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        page_size: pagination.pageSize,
        status: filters.status || undefined,
        search: filters.search || undefined,
        from: dateParams.from,
        to: dateParams.to,
      };
      if (filters.read === 'unread') params.is_read = false;
      if (filters.read === 'read') params.is_read = true;

      const response: PaginatedResponse<DeepCleaningInquiry> =
        await enhancedApiService.getDeepCleaningInquiries(params);

      setRows(response.results);
      setStatusCounts(response.status_counts ?? null);
      setReadCounts(response.read_counts ?? null);
      const total = response.status_counts?.all ?? response.count;
      setPagination((prev) => ({
        ...prev,
        count: total,
        current: page,
        totalPages: Math.max(1, Math.ceil(total / prev.pageSize)),
      }));
    } catch (err) {
      console.error(err);
      showAlert('Failed to load DeepCleaning99 inquiries.');
    } finally {
      setLoading(false);
    }
  }, [appliedDateFilter, filters, pagination.pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.length > 0 && searchInput.length < 2) return;
      setFilters((prev) => ({ ...prev, search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadRows(1);
  }, [filters.status, filters.search, filters.read, appliedDateFilter, loadRows]);

  const patchRow = (id: number, patch: Partial<DeepCleaningInquiry>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await enhancedApiService.markDeepCleaningInquiryAsRead(id);
      await loadRows(pagination.current);
    } catch (err: any) {
      showAlert(err?.message || 'Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    const unread = readCounts?.unread || 0;
    if (!unread) return;
    if (!window.confirm(`Mark all ${unread} unread DeepCleaning99 inquiries as read?`)) return;
    try {
      setMarkingAllRead(true);
      await enhancedApiService.markAllDeepCleaningInquiriesAsRead();
      await loadRows(pagination.current);
    } catch (err: any) {
      showAlert(err?.message || 'Failed to mark all as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleStatusChange = async (id: number, statusValue: string) => {
    try {
      const updated = await enhancedApiService.updateDeepCleaningInquiry(id, {
        status: statusValue as DeepCleaningInquiry['status'],
      });
      patchRow(id, { status: updated.status });
      await loadRows(pagination.current);
    } catch (err: any) {
      showAlert(err?.message || 'Failed to update status');
    }
  };

  const getTabCount = (tab: string): number | null => {
    if (!statusCounts) return null;
    const key = TAB_STATUS_MAP[tab];
    if (!key) return null;
    return statusCounts[key];
  };

  if (loading && rows.length === 0) {
    return <PageLoading text="Loading DeepCleaning99 inquiries..." />;
  }

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">
            DeepCleaning99 Inquiries
          </h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            Total {statusCounts?.all ?? pagination.count}
          </span>
          {(readCounts?.unread || 0) > 0 && (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
              {readCounts?.unread} unread
            </span>
          )}
        </div>
        {(readCounts?.unread || 0) > 0 && (
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={markingAllRead}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setFilters((prev) => ({ ...prev, status: tab === 'All' ? '' : tab }));
              }}
              className={cn(
                'px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2',
                activeTab === tab
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50',
              )}
            >
              {tab}
              {getTabCount(tab) !== null && (
                <span className="ml-1 text-[10px] opacity-70">({getTabCount(tab)})</span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 pb-1">
          {([
            { key: '', label: 'All', count: readCounts?.all },
            { key: 'unread', label: 'Unread', count: readCounts?.unread },
            { key: 'read', label: 'Read', count: readCounts?.read },
          ] as const).map((item) => (
            <button
              key={item.key || 'all-messages'}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, read: item.key }))}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition-colors',
                filters.read === item.key
                  ? item.key === 'unread'
                    ? 'border-red-600 bg-red-600 text-white'
                    : item.key === 'read'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-800 bg-slate-800 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
              )}
            >
              {item.label}
              {typeof item.count === 'number' && (
                <span className="ml-1 opacity-80">({item.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-3 border border-gray-200 shadow-xs flex flex-wrap lg:flex-nowrap items-end gap-3 rounded">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Name, phone, service, area..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-4 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 outline-none h-8 font-semibold"
            />
          </div>
        </div>
        <InquiryDateFilterBar
          value={dateDraft}
          onChange={setDateDraft}
          onApply={() => {
            setAppliedDateFilter(dateDraft);
            saveStoredDateFilter(DATE_FILTER_KEY, dateDraft);
          }}
          onClear={() => {
            setSearchInput('');
            setActiveTab('All');
            setFilters({ status: '', search: '', read: '' });
            setDateDraft({ ...EMPTY_DATE_FILTER });
            setAppliedDateFilter({ ...EMPTY_DATE_FILTER });
            saveStoredDateFilter(DATE_FILTER_KEY, EMPTY_DATE_FILTER);
          }}
          loading={loading}
        />
      </div>

      <CrmTableShell compact>
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[14%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-white">
              <tr>
                <th className={crmThCompactClass}>ID</th>
                <th className={crmThCompactClass}>Customer</th>
                <th className={crmThCompactClass}>Service / Package</th>
                <th className={crmThCompactClass}>Location</th>
                <th className={crmThCompactClass}>Preferred</th>
                <th className={crmThCompactClass}>Estimate</th>
                <th className={crmThCompactClass}>Received</th>
                <th className={crmThCompactClass}>Remark</th>
                <th className={crmThCompactClass}>Status</th>
                <th className={cn(crmThCompactClass, 'text-center')}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-xs text-gray-400 font-bold uppercase">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-gray-400 font-bold uppercase text-sm">
                    No DeepCleaning99 inquiries yet
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const needsComment =
                    row.comment_status === 'required' ||
                    (row.comment_status !== 'added' && Boolean(row.needs_comment_update));
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'transition-colors hover:bg-slate-50/80',
                        needsComment
                          ? 'bg-red-50/40 border-l-2 border-l-red-500'
                          : !row.is_read && 'bg-blue-50/50 border-l-2 border-l-blue-500',
                      )}
                    >
                      <td className={cn(crmTdCompactClass, 'font-semibold text-slate-400 tabular-nums')}>
                        {row.id}
                      </td>
                      <td className={crmTdCompactClass}>
                        <p className="font-semibold text-slate-900 truncate text-xs">{row.name}</p>
                        <CopyablePhone
                          phone={row.mobile}
                          className="text-[11px]"
                          onWhatsApp={() =>
                            openWhatsApp(row.mobile, whatsAppTemplates.customerInquiry(row.name))
                          }
                        />
                      </td>
                      <td className={crmTdCompactClass}>
                        <p className="text-[11px] font-semibold text-teal-700 truncate">{row.service}</p>
                        <p className="text-[10px] text-slate-500 truncate">{row.package_name || '—'}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {row.plan === 'amc' ? 'AMC' : 'One-time'}
                          {row.quantity ? ` · ${row.quantity} ${row.unit || ''}`.trim() : ''}
                        </p>
                      </td>
                      <td className={crmTdCompactClass}>
                        <p className="text-[11px] font-medium text-slate-700 truncate">{row.city}</p>
                        <p className="text-[10px] text-slate-500 truncate">{row.area || '—'}</p>
                        <p className="text-[10px] text-slate-400 truncate" title={row.address}>
                          {row.address || '—'}
                        </p>
                      </td>
                      <td className={crmTdCompactClass}>
                        <p className="text-[11px] font-medium text-slate-700">
                          {row.preferred_date_display ||
                            (row.preferred_date
                              ? new Date(row.preferred_date).toLocaleDateString('en-GB')
                              : '—')}
                        </p>
                        <p className="text-[10px] text-slate-500">{row.preferred_time || '—'}</p>
                      </td>
                      <td className={crmTdCompactClass}>
                        <p className="text-[11px] font-bold text-slate-800">
                          {formatMoney(row.estimated_price)}
                        </p>
                        {row.regular_price ? (
                          <p className="text-[10px] text-slate-400 line-through">
                            {formatMoney(row.regular_price)}
                          </p>
                        ) : null}
                      </td>
                      <td className={cn(crmTdCompactClass, 'text-slate-500 tabular-nums whitespace-nowrap')}>
                        <p className="text-[11px] font-medium text-slate-700">
                          {new Date(row.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {new Date(row.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </p>
                      </td>
                      <td className={crmTdCompactClass} onClick={(e) => e.stopPropagation()}>
                        <div className={cn(needsComment && 'rounded-md ring-1 ring-red-200 bg-red-50/70 p-0.5')}>
                          <RemarkPanel
                            sourceType="deepcleaning"
                            entityId={row.id}
                            latestRemark={row.latest_remark}
                            remarkCount={row.remark_count || 0}
                            variant="table"
                            compact
                            onRemarkAdded={(entry, newCount) => {
                              patchRow(row.id, {
                                remark_count: newCount,
                                remark: entry.remark,
                                latest_remark: {
                                  id: entry.id,
                                  remark: entry.remark,
                                  remark_type: entry.remark_type,
                                  created_by_name: entry.created_by_name,
                                  created_at: entry.created_at,
                                },
                                needs_comment_update: false,
                                comment_status: 'added',
                              });
                              void loadRows(pagination.current);
                            }}
                          />
                        </div>
                      </td>
                      <td className={crmTdCompactClass}>
                        <select
                          value={row.status}
                          onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          className="w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-[10px] font-bold uppercase text-slate-700"
                        >
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Converted">Converted</option>
                          <option value="Closed">Closed</option>
                        </select>
                        <div className="mt-1">
                          <Badge
                            variant={
                              row.status === 'Converted'
                                ? 'success'
                                : row.status === 'New'
                                  ? 'default'
                                  : row.status === 'Contacted'
                                    ? 'warning'
                                    : 'secondary'
                            }
                            size="sm"
                          >
                            {row.status}
                          </Badge>
                        </div>
                      </td>
                      <td className={crmTdCompactClass} onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                          {!row.is_read ? (
                            <button
                              type="button"
                              title="Mark as read"
                              onClick={() => handleMarkAsRead(row.id)}
                              className="inline-flex items-center justify-center rounded-md bg-blue-600 p-1.5 text-white hover:bg-blue-700"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">Read</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CrmTableShell>

      <Pagination
        currentPage={pagination.current}
        totalPages={Math.max(1, pagination.totalPages)}
        totalItems={pagination.count}
        itemsPerPage={pagination.pageSize}
        onPageChange={(page) => loadRows(page)}
        onPageSizeChange={(pageSize) => {
          setPagination((prev) => ({ ...prev, pageSize }));
          loadRows(1);
        }}
        showPageSizeSelector={false}
        showGoToPage
      />
    </div>
  );
};

export default DeepCleaningInquiries;
