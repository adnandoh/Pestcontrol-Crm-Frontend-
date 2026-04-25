import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Search,
  Layout,
  Zap
} from 'lucide-react';
import {
  Button,
  Pagination
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import CreateCRMInquiryModal from '../components/crm/CreateCRMInquiryModal';
import type { JobCard, PaginatedResponse } from '../types';

const JobCards: React.FC = () => {
  const navigate = useNavigate();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
    current: 1,
    pageSize: 10,
    totalPages: 0
  });

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    service_category: '',
    assigned_to: '',
    date_preset: '', // today, tomorrow, custom
    from: '',
    to: ''
  });
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState('done');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showInquiryModal, setShowInquiryModal] = useState(false);

  // Status options for dropdown
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Confirmed', label: 'Confirmed' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'Hold', label: 'Hold' },
    { value: 'Inactive', label: 'Inactive' }
  ];

  const serviceCategoryOptions = [
    { value: '', label: 'All Service Types' },
    { value: 'One-Time Service', label: 'One-Time Service' },
    { value: 'AMC', label: 'AMC (Annual Maintenance Contract)' }
  ];



  // Load job cards
  const loadJobCards = async (page = 1, currentFilters = filters) => {
    try {
      setLoading(true);


      const params: any = {
        page,
        page_size: 10,
        ordering: '-created_at',
        booking_type: activeTab
      };

      // Add search filter if provided
      if (currentFilters.search.trim()) {
        params.search = currentFilters.search.trim();
      }

      // Add status filter if provided
      if (currentFilters.status) {
        params.status = currentFilters.status;
      }

      // Add service category filter
      if (currentFilters.service_category) {
        params.service_category = currentFilters.service_category;
      }

      // Add technician filter
      if (currentFilters.assigned_to) {
        params.assigned_to = currentFilters.assigned_to;
      }

      // Add date filters
      if (currentFilters.date_preset === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.from = today;
        params.to = today;
      } else if (currentFilters.date_preset === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        params.from = tomorrowStr;
        params.to = tomorrowStr;
      } else if (currentFilters.date_preset === 'custom' && currentFilters.from && currentFilters.to) {
        params.from = currentFilters.from;
        params.to = currentFilters.to;
      }

      const response: PaginatedResponse<JobCard> = await enhancedApiService.getJobCards(params);

      console.log('📊 Job Cards API Response:', response);
      console.log('📊 Job Cards Data:', response.results);
      
      setJobCards(response.results);
      setPagination(prev => ({
        ...prev,
        count: response.count,
        next: response.next,
        previous: response.previous,
        current: page,
        totalPages: Math.max(1, Math.ceil(response.count / prev.pageSize))
      }));
    } catch (err: any) {
      console.error('Error loading job cards:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadJobCards(1);
  }, [activeTab]);

  // Refetch data when page becomes visible (after returning from edit page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page visible - refreshing job cards data');
        loadJobCards(pagination.current, filters);
      }
    };

    const handleFocus = () => {
      console.log('🔄 Window focused - refreshing job cards data');
      loadJobCards(pagination.current, filters);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [pagination.current, filters]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Handle search input change with debouncing
  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const newTimeout = setTimeout(() => {
      const newFilters = { ...filters, search: value };
      setFilters(newFilters);
      setPagination(prev => ({ ...prev, current: 1 }));
      loadJobCards(1, newFilters);
    }, 500); // 500ms delay
    
    setSearchTimeout(newTimeout);
  };

  // Handle search submit (Enter key or search button)
  const handleSearchSubmit = () => {
    const newFilters = { ...filters, search: searchInput };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadJobCards(1, newFilters);
  };

  // Handle Enter key in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  // Handle filter changes
  const handleFilterChange = (field: string, value: string) => {
    const newFilters = { ...filters, [field]: value };
    
    // Reset range if preset is not custom
    if (field === 'date_preset' && value !== 'custom') {
      newFilters.from = '';
      newFilters.to = '';
    }

    setFilters(newFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadJobCards(1, newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const newFilters = { 
      search: '', 
      status: '', 
      service_category: '', 
      assigned_to: '',
      date_preset: '',
      from: '',
      to: ''
    };
    setFilters(newFilters);
    setSearchInput('');
    setPagination(prev => ({ ...prev, current: 1 }));
    loadJobCards(1, newFilters);
  };



  // Handle pagination
  const handlePageChange = (page: number) => {
    loadJobCards(page, filters);
  };










  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10">
      {/* 1. View Booking Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">View Bookings</h1>
            <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
              Total {pagination.count} Records
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowInquiryModal(true)} className="bg-amber-500 hover:bg-amber-600 h-8 font-bold shadow-sm flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 fill-amber-100" /> Create Inquiry
            </Button>
            <Button size="sm" onClick={() => navigate('/jobcards/create')} className="bg-blue-700 hover:bg-blue-800 h-8 font-bold shadow-sm">
              <Plus className="h-4 w-4 mr-1" /> Create Booking
            </Button>
          </div>
        </div>

        {/* Tab Selection Row (Reference Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none border-b border-gray-100">
          {[
            { id: 'done', label: 'Done' },
            { id: 'pending', label: 'Pending' },
            { id: 'on_process', label: 'On Process' },
            { id: 'all', label: 'All Bookings' },
            { id: 'upcoming_services', label: 'Upcoming Services' },
            { id: 'upcoming_renewals', label: 'Renewals' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-1 text-[11px] font-bold rounded shadow-sm transition-all duration-200 border ${
                  isActive 
                    ? 'bg-red-500 text-white border-red-600' 
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Filter Bar - High Density (Reference Style) */}
      <div className="bg-white p-3 border border-gray-200 shadow-xs flex flex-wrap lg:flex-nowrap items-end gap-3 rounded">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Search By Mobile / Name</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search ID, Name, Mobile..."
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={handleSearchKeyPress}
              className="w-full pl-8 pr-8 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition-all h-8 font-semibold"
            />
          </div>
        </div>

        <div className="w-32">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700"
          >
            {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label === 'All Statuses' ? 'Status' : opt.label}</option>)}
          </select>
        </div>

        <div className="w-40">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Service Type</label>
          <select
            value={filters.service_category}
            onChange={(e) => handleFilterChange('service_category', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700"
          >
            {serviceCategoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label === 'All Service Types' ? 'Booking For' : opt.label}</option>)}
          </select>
        </div>

        <div className="w-36 text-gray-400">
           <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Select Date</label>
           <input
             type="date"
             value={filters.from}
             onChange={(e) => handleFilterChange('from', e.target.value)}
             className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white text-gray-800"
           />
        </div>

        <div className="flex gap-1 h-8">
           <button onClick={clearFilters} className="px-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded transition-colors">CLEAR</button>
           <button onClick={handleSearchSubmit} className="px-3 bg-blue-800 hover:bg-blue-900 text-white text-[11px] font-bold rounded transition-colors">SEARCH</button>
        </div>
      </div>

      {/* 3. Table Results - Full Width Compact */}
      <div className="bg-white border-x border-t border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full table-auto border-collapse text-[11px]">
            <thead className="bg-[#f8f9fa] sticky top-0 z-10 border-b border-gray-200 text-gray-600 uppercase">
              <tr className="divide-x divide-gray-200">
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Booking Id</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Client Name</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Mobile Info</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Service Area</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Service</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Technician</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Schedule Date</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Status</th>
                <th className="px-3 py-2 text-center font-extrabold tracking-tight italic">Action</th>
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
              ) : jobCards.length === 0 ? (
                 <tr>
                    <td colSpan={9} className="py-20 text-center text-gray-400 font-bold uppercase italic">
                       No Bookings Found In This Category
                    </td>
                 </tr>
              ) : jobCards.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50/80 transition-colors divide-x divide-gray-100">
                  <td className="px-3 py-2.5 font-bold text-blue-600">{job.code}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-800 uppercase">{job.client_name || '---'}</td>
                  <td className="px-3 py-2.5 text-gray-600 font-bold">{job.client_mobile || '---'}</td>
                  <td className="px-3 py-2.5">
                    <div className="max-w-[220px] truncate leading-tight font-medium" title={job.client_address}>{job.client_address || '---'}</div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase">{job.city}, {job.state}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-col group relative">
                      <div className="font-bold text-gray-800 leading-tight max-w-[150px] truncate" title={job.service_type}>
                        {job.service_type?.split(',')[0]}
                        {(job.service_type?.split(',').length ?? 0) > 1 && (
                          <span className="ml-1 text-[9px] text-blue-600 font-black cursor-help">
                            +{job.service_type!.split(',').length - 1} more
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-blue-500 font-black uppercase">{job.service_category}</div>
                      
                      {/* Hover Tooltip - Positioned below to avoid being cut off by header */}
                      {(job.service_type?.split(',').length ?? 0) > 1 && (
                        <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-blue-900 text-white text-[10px] p-2.5 rounded shadow-2xl w-56 border border-blue-800 pointer-events-none whitespace-normal leading-normal">
                          <div className="font-extrabold border-b border-blue-800/50 pb-1.5 mb-1.5 text-blue-200 flex items-center gap-1.5 uppercase tracking-tighter">
                            <Layout className="h-3 w-3" />
                            All Selected Pests:
                          </div>
                          <div className="text-blue-50 font-medium">
                            {job.service_type?.split(',').map((s, i) => (
                              <div key={i} className="flex items-start gap-1 mb-0.5">
                                <span className="text-blue-300">•</span>
                                {s.trim()}
                              </div>
                            ))}
                          </div>
                          <div className="absolute -top-1 left-4 w-2 h-2 bg-blue-900 rotate-45 border-l border-t border-blue-800"></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-indigo-600 uppercase italic tracking-tighter">
                    {job.technician_name || job.assigned_to || '---'}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-gray-600">
                    {job.schedule_date ? (
                      <div className="flex flex-col">
                        <span>{new Date(job.schedule_date).toLocaleDateString('en-GB')}</span>
                        <span className="text-[9px] text-gray-400">---</span>
                      </div>
                    ) : '---'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 ring-inset ${
                      job.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                      job.status === 'Pending' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                      job.status === 'Cancelled' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                      'bg-blue-50 text-blue-700 ring-blue-600/20'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button onClick={() => navigate(`/jobcards/edit/${job.id}`)} className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded transition-all group">
                      <Edit className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Compact Pagination Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#f8f9fa] border border-gray-200">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
           Viewing {jobCards.length} of {pagination.count} Total Bookings
        </span>
        <div className="flex items-center gap-1">
           <Pagination
             currentPage={pagination.current}
             totalPages={Math.max(1, pagination.totalPages)}
             totalItems={pagination.count}
             itemsPerPage={pagination.pageSize}
             onPageChange={handlePageChange}
             showPageSizeSelector={false}
           />
        </div>
      </div>
      <CreateCRMInquiryModal 
        isOpen={showInquiryModal}
        onClose={() => setShowInquiryModal(false)}
        onSuccess={() => {
           // Maybe navigate to inquiry page if needed, but for now just show success
           console.log('Inquiry created successfully');
        }}
      />
    </div>
  );
};

export default JobCards;