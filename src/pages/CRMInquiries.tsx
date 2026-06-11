import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Zap,
  Bell,
  CheckCircle,
  CheckCheck,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useInquiryFocusFromSearch, inquiryRowAnchorId } from '../hooks/useInquiryFocusFromSearch';
import { Button, Pagination, Badge } from '../components/ui';
import { CrmTableShell, crmThClass, crmTdClass } from '../components/crm/CrmDataTable';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { CRMInquiry, CRMInquiryStatus, InquiryStatusCounts } from '../types';
import CreateCRMInquiryModal from '../components/crm/CreateCRMInquiryModal';
import ReminderModal from '../components/crm/ReminderModal';
import InquiryDateFilterBar from '../components/crm/InquiryDateFilterBar';
import {
  dateFilterToApiParams,
  EMPTY_DATE_FILTER,
  loadStoredDateFilter,
  saveStoredDateFilter,
  type InquiryDateFilterState,
} from '../utils/inquiryDateFilters';
import RemarkListCell from '../components/crm/RemarkListCell';
import { LocationCell, buildLocationTooltip } from '../components/crm/LocationCell';
import ServiceRateDisplay from '../components/crm/ServiceRateDisplay';
import CopyablePhone from '../components/crm/CopyablePhone';
import { openWhatsApp, whatsAppTemplates } from '../utils/whatsapp';
import { useDashboardCounts } from '../hooks/useDashboardCounts';

const CRM_DATE_FILTER_KEY = 'crm-inquiries-date-filter';

const CRMInquiries: React.FC = () => {
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('focus');
  const [focusPreview, setFocusPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [inquiries, setInquiries] = useState<CRMInquiry[]>([]);
  const [statusCounts, setStatusCounts] = useState<InquiryStatusCounts | null>(null);
  const { refreshCounts, counts } = useDashboardCounts();
  
  const pestTypesList = [
    'Cockroach', 'Ants', 'Mosquito', 'Spiders', 'Flies', 'Silverfish', 
    'Moths', 'Beetles', 'Centipedes', 'Millipedes', 'Earwigs', 'Crickets',
    'Bed Bug', 'Rodent', 'Fleas', 'Ticks', 'Mites', 'Termite', 
    'Wood Borer', 'Aphids', 'Thrips', 'Scale Insects', 'Whiteflies', 
    'Caterpillars', 'Slugs', 'Snails', 'Other'
  ];

  const [pagination, setPagination] = useState({
    count: 0,
    current: 1,
    pageSize: 10
  });

  const [filters, setFilters] = useState<{ pest_type: string; search: string; status: string }>({
    pest_type: '',
    search: '',
    status: '',
  });
  const [dateDraft, setDateDraft] = useState<InquiryDateFilterState>(() => loadStoredDateFilter(CRM_DATE_FILTER_KEY));
  const [appliedDateFilter, setAppliedDateFilter] = useState<InquiryDateFilterState>(() =>
    loadStoredDateFilter(CRM_DATE_FILTER_KEY),
  );
  const [searchInput, setSearchInput] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<{id: number, type: 'crm' | 'website', name: string, mobile: string} | null>(null);

  const loadInquiries = useCallback(async (page = 1, opts?: { focus?: string; dateFilter?: InquiryDateFilterState }) => {
    try {
      setLoading(true);
      const activeDate = opts?.dateFilter ?? appliedDateFilter;
      const dateParams = dateFilterToApiParams(activeDate);
      const params: Record<string, string | number | undefined> = {
        page,
        page_size: pagination.pageSize,
        search: filters.search || undefined,
        status: filters.status || undefined,
        pest_type: filters.pest_type || undefined,
        from: dateParams.from,
        to: dateParams.to,
        ordering: '-created_at',
      };
      if (opts?.focus) {
        params.focus = opts.focus;
      }

      const response = await enhancedApiService.getCRMInquiries(params);
      setInquiries(response.results);
      setStatusCounts(response.status_counts ?? null);
      setPagination(prev => ({ ...prev, count: response.status_counts?.all ?? response.count, current: page }));
    } catch (err) {
      console.error('Failed to load inquiries:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [appliedDateFilter, filters, pagination.pageSize]);

  const handleFocusFromSearch = useCallback(async (id: string) => {
    setFocusPreview(id);
    await loadInquiries(1, { focus: id });
  }, [loadInquiries]);

  useInquiryFocusFromSearch(handleFocusFromSearch);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Only trigger if 2+ characters or empty (reset)
      if (searchInput.length > 0 && searchInput.length < 2) return;
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (focusId) return;
    setFocusPreview(null);
    loadInquiries(1);
  }, [filters, appliedDateFilter, focusId, loadInquiries]);

  const handleApplyDateFilter = () => {
    setAppliedDateFilter(dateDraft);
    saveStoredDateFilter(CRM_DATE_FILTER_KEY, dateDraft);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setFilters({ search: '', status: '', pest_type: '' });
    setDateDraft({ ...EMPTY_DATE_FILTER });
    setAppliedDateFilter({ ...EMPTY_DATE_FILTER });
    saveStoredDateFilter(CRM_DATE_FILTER_KEY, EMPTY_DATE_FILTER);
  };

  const totalCount = statusCounts?.all ?? pagination.count;



  const handleStatusChange = async (id: number, newStatus: CRMInquiryStatus) => {
    try {
      setSubmitting(id);
      await enhancedApiService.updateCRMInquiry(id, { status: newStatus });
      setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq));
      refreshCounts();
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setSubmitting(null);
    }
  };

  const patchInquiryRow = (id: number, patch: Partial<CRMInquiry>) => {
    setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, ...patch } : inq)));
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await enhancedApiService.markCRMInquiryAsRead(id);
      setInquiries((prev) =>
        prev.map((inq) => (inq.id === id ? { ...inq, is_read: true } : inq)),
      );
      refreshCounts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!counts.crm_inquiries_unread) return;
    if (!window.confirm(`Mark all ${counts.crm_inquiries_unread} unread CRM inquiries as read?`)) return;
    try {
      setMarkingAllRead(true);
      await enhancedApiService.markCRMInquiriesAsRead();
      setInquiries((prev) => prev.map((inq) => ({ ...inq, is_read: true })));
      refreshCounts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark all as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleConvert = async (id: number) => {
    if (!window.confirm('Are you sure you want to convert this inquiry into a booking?')) return;
    
    try {
      setSubmitting(id);
      const result = await enhancedApiService.convertInquiryToBooking(id);
      alert(`Successfully converted! Code: ${result.job_card_code}`);
      loadInquiries(pagination.current);
      refreshCounts();
    } catch (err: any) {
      alert(err.message || 'Conversion failed');
    } finally {
      setSubmitting(null);
    }
  };

  const statusColors: Record<CRMInquiryStatus, string> = {
    'New': 'bg-blue-50 text-blue-700 ring-blue-600/20',
    'Contacted': 'bg-amber-50 text-amber-700 ring-amber-600/20',
    'Converted': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    'Closed': 'bg-gray-100 text-gray-700 ring-gray-600/20'
  };

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full">
      {/* 1. Header Area */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">View Inquiries</h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            Total {totalCount} Manual Leads
          </span>
          {counts.crm_inquiries_unread > 0 && (
            <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
              {counts.crm_inquiries_unread} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {counts.crm_inquiries_unread > 0 && (
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
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-700 hover:bg-blue-800 h-8 text-[11px] font-extrabold shadow-lg px-6 uppercase tracking-wider"
          >
            <Plus className="h-4 w-4 mr-1" /> Create Inquiry
          </Button>
        </div>
      </div>

      {/* 2. Filter Bar - High Density */}
      <div className="bg-white p-3 border border-gray-200 shadow-xs flex flex-wrap lg:flex-nowrap items-end gap-3 rounded">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Search Inquiry</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Name, Phone, Location..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-4 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition-all h-8 font-semibold"
            />
          </div>
        </div>

        <div className="w-32">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700 uppercase"
          >
            <option value="">Status</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Converted">Converted</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="w-40">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Pest Type</label>
          <select
            value={filters.pest_type}
            onChange={(e) => setFilters({ ...filters, pest_type: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700"
          >
            <option value="">All Pests</option>
            {pestTypesList.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <InquiryDateFilterBar
          value={dateDraft}
          onChange={setDateDraft}
          onApply={handleApplyDateFilter}
          onClear={handleClearFilters}
          loading={loading}
        />
      </div>

      {focusPreview && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
          <span>Showing CRM inquiry #{focusPreview} from search</span>
          <button
            type="button"
            onClick={() => {
              setFocusPreview(null);
              loadInquiries(1);
            }}
            className="text-blue-700 underline hover:text-blue-900"
          >
            Show all inquiries
          </button>
        </div>
      )}

      <p className="text-[10px] text-slate-400 lg:hidden">Swipe horizontally to see all columns →</p>

      {/* 3. Table Results */}
      <CrmTableShell>
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 border-b border-slate-200 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
              <tr>
                <th className={cn(crmThClass, 'w-12')}>ID</th>
                <th className={cn(crmThClass, 'min-w-[140px]')}>Customer</th>
                <th className={cn(crmThClass, 'min-w-[160px]')}>Location</th>
                <th className={cn(crmThClass, 'w-24')}>Plan / Rate</th>
                <th className={cn(crmThClass, 'w-28')}>Pest</th>
                <th className={cn(crmThClass, 'min-w-[200px]')}>Remark</th>
                <th className={cn(crmThClass, 'w-28')}>Status</th>
                <th className={cn(crmThClass, 'min-w-[120px] text-center')}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent mx-auto" />
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-sm text-slate-400">
                    No inquiries found. Create your first lead.
                  </td>
                </tr>
              ) : inquiries.map((inq) => (
                <tr
                  key={inq.id}
                  id={inquiryRowAnchorId(inq.id)}
                  className={cn(
                    'hover:bg-slate-50/80 transition-colors',
                    !inq.is_read && 'bg-orange-50/40 border-l-2 border-l-orange-400',
                  )}
                >
                  <td className={cn(crmTdClass, 'text-xs font-semibold text-slate-400 tabular-nums')}>
                    {inq.id}
                  </td>
                  <td className={crmTdClass}>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{inq.name}</p>
                      <div className="mt-0.5">
                        <CopyablePhone
                          phone={inq.mobile}
                          className="text-xs"
                          onWhatsApp={() =>
                            openWhatsApp(inq.mobile, whatsAppTemplates.customerInquiry(inq.name))
                          }
                        />
                      </div>
                    </div>
                  </td>
                  <td className={crmTdClass}>
                    <LocationCell
                      primary={inq.location?.trim() || ''}
                      secondary={
                        [inq.master_city_name, inq.master_state_name].filter(Boolean).join(', ') ||
                        undefined
                      }
                      tooltip={buildLocationTooltip(
                        inq.location,
                        inq.master_location_name,
                        inq.master_city_name,
                        inq.master_state_name,
                      )}
                      className="max-w-[200px]"
                    />
                  </td>
                  <td className={crmTdClass}>
                    <ServiceRateDisplay
                      info={inq.service_rate_info}
                      fallbackFrequency={inq.service_frequency}
                    />
                  </td>
                  <td className={crmTdClass}>
                    <p className="text-xs font-semibold text-indigo-700">{inq.pest_type}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(inq.inquiry_date).toLocaleDateString('en-GB')}
                    </p>
                  </td>
                  <td className={crmTdClass}>
                    <RemarkListCell sourceType="crm" row={inq} onUpdate={patchInquiryRow} />
                  </td>
                  <td className={crmTdClass}>
                    <select
                      value={inq.status}
                      onChange={(e) => handleStatusChange(inq.id, e.target.value as CRMInquiryStatus)}
                      disabled={submitting === inq.id}
                      className={cn(
                        'w-full max-w-[120px] rounded-lg border-0 py-1.5 pl-2 pr-6 text-[10px] font-bold uppercase cursor-pointer ring-1 ring-inset',
                        statusColors[inq.status],
                      )}
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Converted">Converted</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                  <td className={crmTdClass}>
                    <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:flex-wrap sm:justify-center">
                      {!inq.is_read && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(inq.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-orange-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-orange-700"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInquiry({
                            id: inq.id,
                            type: 'crm',
                            name: inq.name,
                            mobile: inq.mobile,
                          });
                          setShowReminderModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-amber-600"
                      >
                        <Bell className="h-3 w-3" />
                        Reminder
                      </button>
                      {inq.status !== 'Converted' ? (
                        <button
                          type="button"
                          onClick={() => handleConvert(inq.id)}
                          disabled={submitting === inq.id}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Zap className="h-3 w-3" />
                          Convert
                        </button>
                      ) : (
                        <Badge variant="success" size="sm" className="justify-center">
                          Converted
                        </Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/80 border-t border-slate-100">
          <Pagination
            currentPage={pagination.current}
            totalPages={Math.ceil(pagination.count / pagination.pageSize)}
            totalItems={pagination.count}
            itemsPerPage={pagination.pageSize}
            onPageChange={loadInquiries}
          />
        </div>
      </CrmTableShell>

      <CreateCRMInquiryModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => loadInquiries(1)}
      />

      <ReminderModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        onSuccess={() => loadInquiries(pagination.current)}
        inquiryData={selectedInquiry}
      />


    </div>
  );
};

export default CRMInquiries;
