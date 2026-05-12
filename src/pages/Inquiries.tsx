import React, { useState, useEffect } from 'react';
import { 
  CheckCircle,
  ArrowRight,
  Search,
  Edit,
  Check,
  X,
  Bell,
} from 'lucide-react';
import { 
  PageLoading,
  Pagination,
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { Inquiry, PaginatedResponse } from '../types';
import { useDashboardCounts } from '../hooks/useDashboardCounts';
import ReminderModal from '../components/crm/ReminderModal';

const Inquiries: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const { refreshCounts } = useDashboardCounts();
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
  const [editingRemarkId, setEditingRemarkId] = useState<number | null>(null);
  const [tempRemark, setTempRemark] = useState('');
  const [updatingRemark, setUpdatingRemark] = useState<number | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<{id: number, type: 'crm' | 'website', name: string, mobile: string} | null>(null);

  const tabs = ['All', 'New', 'Contacted', 'Converted', 'Closed'];

  // Load inquiries
  const loadInquiries = async (page = 1) => {
    try {
      setLoading(true);


      const params = {
        page,
        page_size: pagination.pageSize,
        ordering: '-created_at',
        status: filters.status || undefined,
        search: filters.search || undefined
      };

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
    } finally {
      setLoading(false);
    }
  };

  const handleRemarkUpdate = async (id: number) => {
    try {
      setUpdatingRemark(id);
      await enhancedApiService.updateInquiry(id, { remark: tempRemark });
      setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, remark: tempRemark } : inq));
      setEditingRemarkId(null);
    } catch (err: any) {
      alert('Failed to update remark: ' + err.message);
    } finally {
      setUpdatingRemark(null);
    }
  };

  // Initial load and filter changes
  useEffect(() => {
    loadInquiries(1);
  }, [filters, activeTab]);

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
      loadInquiries(pagination.current);
      refreshCounts();
    } catch (err: any) {
      alert('Failed to mark inquiry as read: ' + err.message);
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
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">View Website Leads</h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            Total {pagination.count} Inquiries
          </span>
        </div>
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
              placeholder="Search Name, Phone, Email..."
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

      {/* 3. Table Results */}
      <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full table-auto border-collapse text-[11px]">
            <thead className="bg-[#f8f9fa] sticky top-0 z-10 border-b border-gray-200 text-gray-600 uppercase">
              <tr className="divide-x divide-gray-200">
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-12">ID</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-44">Lead Profile</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-32">Prop Details</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-32">Price/Plan</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-40">Interest</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-24">Received</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-40">Remark</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-20">Status</th>
                <th className="px-3 py-2 text-center font-extrabold tracking-tight italic w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                   <td colSpan={9} className="py-20 text-center">
                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                     <span className="text-[10px] font-bold text-gray-400 uppercase">Loading Results...</span>
                   </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                   <td colSpan={9} className="py-20 text-center text-gray-400 font-bold uppercase italic text-sm tracking-tight opacity-70">No Lead Records Found</td>
                </tr>
              ) : inquiries.map((inquiry) => (
                <tr 
                  key={inquiry.id} 
                  onClick={() => !inquiry.is_read && handleMarkAsRead(inquiry.id)}
                  className={cn(
                    "hover:bg-gray-50/80 transition-colors divide-x divide-gray-100 cursor-pointer",
                    !inquiry.is_read && "bg-blue-50/40 border-l-2 border-l-blue-600"
                  )}
                >
                  <td className="px-3 py-2.5 font-bold text-gray-400 italic">{inquiry.id}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {!inquiry.is_read && <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />}
                      <div className="font-bold text-gray-800 uppercase leading-tight truncate">{inquiry.name}</div>
                    </div>
                    <div className="text-[9px] font-bold text-blue-600">{inquiry.mobile}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-gray-700 uppercase italic truncate">{inquiry.premise_type || 'Residential'}</div>
                    <div className="text-[9px] font-bold text-indigo-600 uppercase italic tracking-tighter">{inquiry.premise_size || 'N/A'}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-green-700 uppercase leading-tight">
                       {inquiry.estimated_price ? `₹${inquiry.estimated_price}` : inquiry.is_inspection_required ? 'Inspection' : '---'}
                    </div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase italic tracking-widest">{inquiry.service_frequency || 'One-time'}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-indigo-700 uppercase tracking-tighter truncate">{inquiry.service_interest}</div>
                    <div className="text-[9px] font-bold text-gray-400 line-clamp-1 italic">{inquiry.pest_problems || inquiry.message}</div>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-gray-500 uppercase italic tabular-nums">
                    {new Date(inquiry.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-3 py-2.5 group/remark" onClick={(e) => e.stopPropagation()}>
                    {editingRemarkId === inquiry.id ? (
                      <div className="flex items-center gap-1">
                        <textarea
                          value={tempRemark}
                          onChange={(e) => setTempRemark(e.target.value)}
                          className="w-full p-1 text-[10px] border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 outline-none min-h-[40px] font-semibold"
                          placeholder="Add remark..."
                          autoFocus
                        />
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={() => handleRemarkUpdate(inquiry.id)}
                            disabled={updatingRemark === inquiry.id}
                            className="p-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={() => setEditingRemarkId(null)}
                            className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative pr-6">
                        <p className="text-[10px] font-bold text-gray-600 italic line-clamp-2 leading-tight">
                          {inquiry.remark || <span className="text-gray-300">No remark...</span>}
                        </p>
                        <button 
                          onClick={() => {
                            setEditingRemarkId(inquiry.id);
                            setTempRemark(inquiry.remark || '');
                          }}
                          className="absolute right-0 top-0 p-1 text-blue-600 hover:bg-blue-50 rounded transition-all"
                          title="Edit Remark"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ring-1 ring-inset ${
                      inquiry.status === 'Converted' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                      inquiry.status === 'New' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 
                      inquiry.status === 'Contacted' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                      'bg-gray-50 text-gray-700 ring-gray-600/20'
                    }`}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                       <button 
                         onClick={() => {
                           setSelectedInquiry({
                             id: inquiry.id,
                             type: 'website',
                             name: inquiry.name,
                             mobile: inquiry.mobile
                           });
                           setShowReminderModal(true);
                         }}
                         className="p-1.5 bg-gray-100 hover:bg-orange-100 rounded transition-all group" 
                         title="Add Reminder"
                       >
                         <Bell className="h-3 w-3 text-gray-400 group-hover:text-orange-600" />
                       </button>
                       {!inquiry.is_read && (
                         <button onClick={() => handleMarkAsRead(inquiry.id)} className="p-1.5 bg-gray-100 hover:bg-green-100 rounded transition-all group" title="Mark Read">
                           <CheckCircle className="h-3 w-3 text-gray-400 group-hover:text-green-600" />
                         </button>
                       )}
                       {inquiry.status === 'New' && (
                         <button onClick={() => handleConvertToJobCard(inquiry)} className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded transition-all group" title="Convert">
                           <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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