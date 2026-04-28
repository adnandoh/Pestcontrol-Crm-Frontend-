import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Search,
  Layout,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  Button,
  Pagination,
  ConfirmationModal
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import AssignTechnicianModal from '../components/crm/AssignTechnicianModal';
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
    to: '',
    commercial_type: ''
  });
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [doneId, setDoneId] = useState<number | null>(null);

  // Status options for dropdown
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'On Process', label: 'On Process' },
    { value: 'Done', label: 'Done' }
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
      
      // Add commercial type filter
      if (currentFilters.commercial_type) {
        params.commercial_type = currentFilters.commercial_type;
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
      to: '',
      commercial_type: ''
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

  // Handle assignment
  const handleOpenAssign = (job: JobCard) => {
    setSelectedJobCard(job);
    setShowAssignModal(true);
  };

  // Handle Mark as Done
  const handleMarkAsDone = async () => {
    if (!doneId) return;
    try {
      setLoading(true);
      await enhancedApiService.updateJobCard(doneId, { status: 'Done' });
      setDoneId(null);
      loadJobCards(pagination.current, filters);
    } catch (error) {
      console.error('Failed to mark as done:', error);
    } finally {
      setLoading(false);
    }
  };










  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10">
      {/* 1. View Booking Header */}
      <div className="flex flex-col gap-3 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">View Bookings</h1>
            <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
              Total {pagination.count} Records
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => navigate('/jobcards/create')} className="bg-blue-700 hover:bg-blue-800 h-8 font-bold shadow-sm">
              <Plus className="h-4 w-4 mr-1" /> Create Booking
            </Button>
          </div>
        </div>

        {/* Tab Selection Row (Reference Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none border-b border-gray-100">
          {[
            { id: 'pending', label: 'Pending' },
            { id: 'on_process', label: 'On Process' },
            { id: 'done', label: 'Done' },
            { id: 'upcoming_renewals', label: 'Upcoming Renewals' },
            { id: 'upcoming_services', label: 'Upcoming Services' },
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
      <div className="bg-white p-3 border border-gray-200 shadow-xs flex flex-wrap lg:flex-nowrap items-end gap-3 rounded animate-fade-up delay-100">
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

        <div className="w-36">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Category</label>
          <select
            value={filters.commercial_type}
            onChange={(e) => handleFilterChange('commercial_type', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700"
          >
            <option value="">All Categories</option>
            <option value="home">Home</option>
            <option value="hotel">Hotel</option>
            <option value="society">Society</option>
            <option value="villa">Villa</option>
            <option value="office">Office</option>
            <option value="other">Other</option>
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

        <div className="flex gap-2 h-8">
           <button onClick={clearFilters} className="px-4 border border-gray-300 hover:bg-gray-50 text-gray-500 text-[11px] font-bold rounded transition-colors uppercase">Clear</button>
           <button onClick={handleSearchSubmit} className="px-5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded shadow-sm transition-colors uppercase flex items-center gap-1.5">
             <Search className="h-3 w-3" /> Search
           </button>
        </div>
      </div>

      {/* 3. Table Results - Full Width Compact */}
      <div className="bg-white border-x border-t border-gray-200 shadow-xs overflow-hidden animate-fade-up delay-200">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full table-auto border-collapse text-[11px]">
            <thead className="bg-[#f8f9fa] sticky top-0 z-10 border-b border-gray-200 text-gray-500 uppercase">
              <tr className="divide-x divide-gray-100">
                <th className="px-4 py-3 text-left font-extrabold tracking-tighter">ID</th>
                <th className="px-4 py-3 text-left font-extrabold tracking-tighter">Client Info</th>
                <th className="px-4 py-3 text-left font-extrabold tracking-tighter">Service Area</th>
                <th className="px-4 py-3 text-left font-extrabold tracking-tighter">Service Details</th>
                <th className="px-4 py-3 text-left font-extrabold tracking-tighter">Technician</th>
                <th className="px-4 py-3 text-left font-extrabold tracking-tighter">Schedule</th>
                {activeTab === 'upcoming_services' && (
                  <th className="px-4 py-3 text-left font-extrabold tracking-tighter text-blue-700">Next Service</th>
                )}
                <th className="px-4 py-3 text-left font-extrabold tracking-tighter">Status</th>
                <th className="px-4 py-3 text-center font-extrabold tracking-tighter">Action</th>
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
              ) : jobCards.map((job) => {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];

                const isToday = job.schedule_date === todayStr;
                const isTomorrow = job.schedule_date === tomorrowStr;
                
                const rowBg = isToday ? 'bg-emerald-100/60' : isTomorrow ? 'bg-yellow-100/60' : '';
                
                return (
                  <tr key={job.id} className={`${rowBg} hover:bg-blue-50/50 transition-colors divide-x divide-gray-50 group`}>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        <button 
                          onClick={() => handleOpenAssign(job)}
                          className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-100 w-fit transition-colors shadow-xs"
                        >
                          {job.id}
                        </button>
                        {job.commercial_type && job.commercial_type !== 'home' && (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded w-fit tracking-tighter ${
                            job.commercial_type === 'hotel' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            job.commercial_type === 'society' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                            job.commercial_type === 'villa' ? 'bg-green-100 text-green-700 border border-green-200' :
                            job.commercial_type === 'office' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                            'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          }`}>
                            {job.commercial_type.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-black text-gray-900 uppercase leading-none mb-1">{job.client_name || '---'}</span>
                        <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                          {job.client_mobile || '---'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col group/address relative">
                        <div className="max-w-[150px] leading-tight font-medium text-gray-600">
                          {job.client_address ? (
                            job.client_address.split(' ').length > 10 
                              ? job.client_address.split(' ').slice(0, 10).join(' ') + '...'
                              : job.client_address
                          ) : '---'}
                        </div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">{job.city}, {job.state}</div>
                        
                        {/* Address Tooltip */}
                        {job.client_address && (
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover/address:block z-50 bg-white text-gray-800 text-[11px] px-3 py-2 rounded shadow-xl border border-gray-200 pointer-events-none whitespace-nowrap leading-none ring-1 ring-black/5">
                            <span className="font-bold">{job.client_address}</span>
                            <div className="absolute -bottom-1.5 left-4 w-2.5 h-2.5 bg-white rotate-45 border-r border-b border-gray-200"></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col group/service relative">
                        <div className="font-extrabold text-gray-800 leading-tight max-w-[140px] truncate flex items-center gap-1" title={job.service_type}>
                          {job.service_type?.split(',')[0]}
                          {(job.service_type?.split(',').length ?? 0) > 1 && (
                            <span className="text-[9px] bg-blue-50 text-blue-600 px-1 rounded font-black">
                              +{job.service_type!.split(',').length - 1}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-blue-600 font-black uppercase mt-0.5 tracking-tighter opacity-80">{job.service_category}</div>
                        
                        {/* Service Tooltip */}
                        {(job.service_type?.split(',').length ?? 0) > 1 && (
                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover/service:block z-50 bg-white text-gray-800 text-[11px] px-3 py-2 rounded shadow-xl border border-gray-200 pointer-events-none whitespace-nowrap leading-none ring-1 ring-black/5">
                            <span className="font-bold text-blue-600">All Pests: </span>
                            <span className="font-bold">{job.service_type}</span>
                            <div className="absolute -bottom-1.5 left-4 w-2.5 h-2.5 bg-white rotate-45 border-r border-b border-gray-200"></div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {job.technician_name || job.assigned_to ? (
                        <button 
                          onClick={() => handleOpenAssign(job)}
                          className="font-bold text-indigo-700 hover:text-blue-600 uppercase italic tracking-tighter text-[11px] text-left hover:underline transition-all"
                        >
                          {job.technician_name || job.assigned_to}
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleOpenAssign(job)}
                          className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 hover:bg-red-500 hover:text-white transition-all uppercase"
                        >
                          Not Assigned
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700 text-[11px]">
                          {job.schedule_date ? new Date(job.schedule_date).toLocaleDateString('en-GB') : '---'}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter">Today</span>
                        )}
                        {isTomorrow && (
                          <span className="text-[9px] font-black text-yellow-700 uppercase tracking-tighter">Tomorrow</span>
                        )}
                      </div>
                    </td>
                    {activeTab === 'upcoming_services' && (
                      <td className="px-4 py-4 bg-blue-50/30">
                        <div className="flex flex-col">
                          <span className="font-black text-blue-700 text-[11px]">
                            {job.next_service_date ? new Date(job.next_service_date).toLocaleDateString('en-GB') : '---'}
                          </span>
                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-tighter italic">Follow-up due</span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase shadow-xs border ${
                        job.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        job.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {activeTab === 'on_process' && (
                          <button 
                            onClick={() => setDoneId(job.id)} 
                            className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded shadow-xs border border-emerald-100 transition-all group/done"
                            title="Mark as Done"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => navigate(`/jobcards/edit/${job.id}`)} 
                          className="p-2 bg-gray-50 hover:bg-blue-600 text-gray-400 hover:text-white rounded shadow-xs border border-gray-100 transition-all group/edit"
                          title="Edit Booking"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Compact Pagination Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#f8f9fa] border border-gray-200 animate-fade-up delay-300">
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

      <AssignTechnicianModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        jobCard={selectedJobCard}
        onSuccess={() => {
           loadJobCards(pagination.current, filters);
        }}
      />
      <ConfirmationModal
        isOpen={!!doneId}
        onClose={() => setDoneId(null)}
        onConfirm={handleMarkAsDone}
        title="Complete Booking"
        message="Are you sure you want to mark this booking as DONE? It will be moved to the Done tab."
        confirmText="Yes, Done"
        type="success"
      />
    </div>
  );
};

export default JobCards;