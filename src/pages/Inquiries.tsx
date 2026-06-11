import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle,
  ArrowRight,
  Search,
  Bell,
  CheckCheck,
} from 'lucide-react';
import {
  LocationCell,
  buildLocationTooltip,
  propertyAddressFromMessage,
} from '../components/crm/LocationCell';
import { useSearchParams } from 'react-router-dom';
import { useInquiryFocusFromSearch, inquiryRowAnchorId } from '../hooks/useInquiryFocusFromSearch';
import { PageLoading, Pagination, Badge } from '../components/ui';
import { CrmTableShell, crmThClass, crmTdClass } from '../components/crm/CrmDataTable';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { Inquiry, PaginatedResponse } from '../types';
import { useDashboardCounts } from '../hooks/useDashboardCounts';
import ReminderModal from '../components/crm/ReminderModal';
import RemarkListCell from '../components/crm/RemarkListCell';
import ServiceRateDisplay from '../components/crm/ServiceRateDisplay';
import CopyablePhone from '../components/crm/CopyablePhone';
import { openWhatsApp, whatsAppTemplates } from '../utils/whatsapp';

const Inquiries: React.FC = () => {
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('focus');
  const [focusPreview, setFocusPreview] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const { refreshCounts, counts } = useDashboardCounts();
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
    current: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  const [activeTab, setActiveTab] = useState('All');
  const [searchInput, setSearchInput] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<{id: number, type: 'crm' | 'website', name: string, mobile: string} | null>(null);

  const tabs = ['All', 'New', 'Contacted', 'Converted', 'Closed'];

  // Load inquiries
  const loadInquiries = async (page = 1, opts?: { focus?: string }) => {
    try {
      setLoading(true);

      const params: Record<string, string | number | undefined> = {
        page,
        page_size: pagination.pageSize,
        ordering: '-created_at',
        status: filters.status || undefined,
        search: filters.search || undefined,
      };
      if (opts?.focus) {
        params.focus = opts.focus;
      }

      const response: PaginatedResponse<Inquiry> = await enhancedApiService.getInquiries(params);
      
      setInquiries(response.results);
      setPagination(prev => ({
        ...prev,
        count: response.count,
        next: response.next,
        previous: response.previous,
        current: page,
        totalPages: Math.max(1, Math.ceil(response.count / prev.pageSize))
      }));
    } catch (err: any) {
      console.error('Error loading inquiries:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleFocusFromSearch = useCallback(async (id: string) => {
    setFocusPreview(id);
    await loadInquiries(1, { focus: id });
  }, [filters, pagination.pageSize, activeTab]);

  useInquiryFocusFromSearch(handleFocusFromSearch);

  const patchLeadRow = (id: number, patch: Partial<Inquiry>) => {
    setInquiries((prev) => prev.map((inq) => (inq.id === id ? { ...inq, ...patch } : inq)));
  };

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
  }, [filters.status, filters.search, activeTab]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setFilters(prev => ({ ...prev, status: tab === 'All' ? '' : tab }));
  };



  // Handle pagination
  const handlePageChange = (page: number) => {
    loadInquiries(page);
  };

  // Handle page size change
  const handlePageSizeChange = (pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize }));
    loadInquiries(1);
  };

  // Handle mark as read
  const handleMarkAsRead = async (id: number) => {
    try {
      await enhancedApiService.markInquiryAsRead(id);
      setInquiries((prev) =>
        prev.map((inq) => (inq.id === id ? { ...inq, is_read: true } : inq)),
      );
      refreshCounts();
    } catch (err: any) {
      alert('Failed to mark inquiry as read: ' + err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!counts.website_leads_unread) return;
    if (!window.confirm(`Mark all ${counts.website_leads_unread} unread website leads as read?`)) return;
    try {
      setMarkingAllRead(true);
      await enhancedApiService.markInquiriesAsRead();
      setInquiries((prev) => prev.map((inq) => ({ ...inq, is_read: true })));
      refreshCounts();
    } catch (err: any) {
      alert('Failed to mark all as read: ' + (err.message || 'Unknown error'));
    } finally {
      setMarkingAllRead(false);
    }
  };



  // Handle convert to job card
  const handleConvertToJobCard = async (inquiry: Inquiry) => {
    if (!confirm('Convert this inquiry to a job card?')) return;

    try {
      // Prepare job card data from inquiry
      const jobCardData = {
        client_name: inquiry.name,
        client_mobile: inquiry.mobile,
        client_email: inquiry.email || '',
        city: inquiry.city || '',
        state: inquiry.state || '',
        client_address: inquiry.message || '', 
        flat_number: inquiry.flat_number || '',
        building_name: inquiry.building_name || '',
        landmark: inquiry.landmark || '',
        area: inquiry.area || '',
        job_type: 'Customer' as const,
        service_type: inquiry.service_interest,
        schedule_datetime: new Date().toISOString(),
        status: 'Pending',
        payment_status: 'Unpaid',
        price: inquiry.estimated_price?.toString() || '',
        commercial_type: (inquiry.premise_type === 'commercial' ? 'office' : 'home') as 'office' | 'home',
        bhk_size: inquiry.premise_size || '',
        service_category: inquiry.service_frequency === 'amc' ? 'AMC' : 'One-Time Service',
        next_service_date: '',
        extra_notes: inquiry.remark || ''
      };

      const jobCard = await enhancedApiService.convertInquiry(inquiry.id, jobCardData);
      alert(`Successfully converted to Job Card #${jobCard.code}`);
      loadInquiries(pagination.current);
      refreshCounts();
    } catch (err: any) {
      console.error('Conversion error:', err);
      alert(err.message || 'Failed to convert inquiry to booking.');
    }
  };

  if (loading && inquiries.length === 0) {
    return <PageLoading text="Loading inquiries..." />;
  }

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full">
      {/* 1. Header Area */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">View Website Leads</h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            Total {pagination.count} Inquiries
          </span>
          {counts.website_leads_unread > 0 && (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
              {counts.website_leads_unread} unread
            </span>
          )}
        </div>
        {counts.website_leads_unread > 0 && (
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

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={cn(
              "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2",
              activeTab === tab 
                ? "border-blue-600 text-blue-600 bg-blue-50/50" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 2. Filter Bar - High Density */}
      <div className="bg-white p-3 border border-gray-200 shadow-xs flex flex-wrap lg:flex-nowrap items-end gap-3 rounded">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Search Leads</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Name, Phone, Email, Location..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setFilters(prev => ({ ...prev, search: searchInput }))}
              className="w-full pl-8 pr-4 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition-all h-8 font-semibold"
            />
          </div>
        </div>

        <div className="w-32">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700 uppercase"
          >
             <option value="">Status</option>
             <option value="New">New</option>
             <option value="Contacted">Contacted</option>
             <option value="Converted">Converted</option>
             <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="flex gap-1 h-8">
           <button onClick={() => { setSearchInput(''); setFilters({ status: '', search: '' }); }} className="px-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded transition-colors uppercase">Clear</button>
           <button onClick={() => setFilters(prev => ({ ...prev, search: searchInput }))} className="px-3 bg-blue-800 hover:bg-blue-900 text-white text-[11px] font-bold rounded transition-colors uppercase">Search</button>
        </div>
      </div>

      {focusPreview && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-800">
          <span>Showing website lead #{focusPreview} from search</span>
          <button
            type="button"
            onClick={() => {
              setFocusPreview(null);
              loadInquiries(1);
            }}
            className="text-purple-700 underline hover:text-purple-900"
          >
            Show all leads
          </button>
        </div>
      )}

      <p className="text-[10px] text-slate-400 lg:hidden">Swipe horizontally to see all columns →</p>

      <CrmTableShell>
        <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 border-b border-slate-200 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
              <tr>
                <th className={cn(crmThClass, 'w-12')}>ID</th>
                <th className={cn(crmThClass, 'min-w-[130px]')}>Lead</th>
                <th className={cn(crmThClass, 'min-w-[160px]')}>Location</th>
                <th className={cn(crmThClass, 'w-28')}>Property</th>
                <th className={cn(crmThClass, 'w-24')}>Plan / Rate</th>
                <th className={cn(crmThClass, 'min-w-[120px]')}>Interest</th>
                <th className={cn(crmThClass, 'w-24')}>Received</th>
                <th className={cn(crmThClass, 'min-w-[200px]')}>Remark</th>
                <th className={cn(crmThClass, 'w-24')}>Status</th>
                <th className={cn(crmThClass, 'min-w-[130px] text-center')}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                   <td colSpan={10} className="py-20 text-center">
                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                     <span className="text-[10px] font-bold text-gray-400 uppercase">Loading Results...</span>
                   </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                   <td colSpan={10} className="py-20 text-center text-gray-400 font-bold uppercase italic text-sm tracking-tight opacity-70">No Lead Records Found</td>
                </tr>
              ) : inquiries.map((inquiry) => (
                <tr
                  key={inquiry.id}
                  id={inquiryRowAnchorId(inquiry.id)}
                  className={cn(
                    'transition-colors hover:bg-slate-50/80',
                    !inquiry.is_read && 'bg-blue-50/50 border-l-2 border-l-blue-500',
                  )}
                >
                  <td className={cn(crmTdClass, 'text-xs font-semibold text-slate-400 tabular-nums')}>
                    {inquiry.id}
                  </td>
                  <td className={crmTdClass}>
                    <div className="flex items-start gap-2 min-w-0">
                      {!inquiry.is_read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{inquiry.name}</p>
                        <div className="mt-0.5">
                          <CopyablePhone
                            phone={inquiry.mobile}
                            className="text-xs"
                            onWhatsApp={() =>
                              openWhatsApp(
                                inquiry.mobile,
                                whatsAppTemplates.customerInquiry(inquiry.name),
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className={crmTdClass}>
                    <LocationCell
                      primary={inquiry.city?.trim() || inquiry.state?.trim() || ''}
                      secondary={
                        inquiry.city?.trim() && inquiry.state?.trim()
                          ? inquiry.state.trim()
                          : undefined
                      }
                      tooltip={buildLocationTooltip(
                        propertyAddressFromMessage(inquiry.message),
                        inquiry.city,
                        inquiry.state,
                        inquiry.message,
                      )}
                    />
                  </td>
                  <td className={crmTdClass}>
                    <p className="text-xs font-medium text-slate-700">{inquiry.premise_type || 'Residential'}</p>
                    <p className="text-[10px] text-slate-500">{inquiry.premise_size || '—'}</p>
                  </td>
                  <td className={crmTdClass}>
                    {inquiry.is_inspection_required && !inquiry.service_rate_info?.display_total ? (
                      <Badge variant="warning" size="sm">Inspection</Badge>
                    ) : (
                      <ServiceRateDisplay
                        info={inquiry.service_rate_info}
                        fallbackPrice={inquiry.estimated_price}
                        fallbackFrequency={inquiry.service_frequency}
                      />
                    )}
                  </td>
                  <td className={crmTdClass}>
                    <p className="text-xs font-semibold text-indigo-700 truncate">{inquiry.service_interest}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{inquiry.pest_problems || inquiry.message}</p>
                  </td>
                  <td className={cn(crmTdClass, 'text-xs text-slate-500 tabular-nums')}>
                    {new Date(inquiry.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className={crmTdClass} onClick={(e) => e.stopPropagation()}>
                    <RemarkListCell sourceType="website" row={inquiry} onUpdate={patchLeadRow} />
                  </td>
                  <td className={crmTdClass}>
                    <Badge
                      variant={
                        inquiry.status === 'Converted'
                          ? 'success'
                          : inquiry.status === 'New'
                            ? 'default'
                            : inquiry.status === 'Contacted'
                              ? 'warning'
                              : 'secondary'
                      }
                      size="sm"
                    >
                      {inquiry.status}
                    </Badge>
                  </td>
                  <td className={crmTdClass} onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInquiry({
                            id: inquiry.id,
                            type: 'website',
                            name: inquiry.name,
                            mobile: inquiry.mobile,
                          });
                          setShowReminderModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-amber-600"
                      >
                        <Bell className="h-3 w-3" />
                        Reminder
                      </button>
                      {inquiry.status === 'New' && (
                        <button
                          type="button"
                          onClick={() => handleConvertToJobCard(inquiry)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700"
                        >
                          <ArrowRight className="h-3 w-3" />
                          Convert
                        </button>
                      )}
                      {!inquiry.is_read ? (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(inquiry.id)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700"
                          title="Mark as read"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Read
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CrmTableShell>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.current}
        totalPages={Math.max(1, pagination.totalPages)}
        totalItems={pagination.count}
        itemsPerPage={pagination.pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        showPageSizeSelector={false}
        showGoToPage={true}
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

export default Inquiries;