import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Building2,
  Search
} from 'lucide-react';
import {
  Button,
  Pagination,
  PageLoading
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { JobCard, PaginatedResponse } from '../types';

const SocietyJobCards: React.FC = () => {
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
    date_preset: '',
    from: '',
    to: ''
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

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



  // Load society job cards
  const loadSocietyJobCards = async (page = 1, currentFilters = filters) => {
    try {
      setLoading(true);


      const params: any = {
        page,
        page_size: pagination.pageSize,
        ordering: '-created_at',
        job_type: 'Society' // Filter for Society job cards only
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
      console.error('Error loading society job cards:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadSocietyJobCards();
  }, []);

  // Refetch data when page becomes visible (after returning from edit page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page visible - refreshing society bookings data');
        loadSocietyJobCards(pagination.current, filters);
      }
    };

    const handleFocus = () => {
      console.log('🔄 Window focused - refreshing society bookings data');
      loadSocietyJobCards(pagination.current, filters);
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
      loadSocietyJobCards(1, newFilters);
    }, 500); // 500ms delay
    
    setSearchTimeout(newTimeout);
  };

  // Handle search submit (Enter key or search button)
  const handleSearchSubmit = () => {
    const newFilters = { ...filters, search: searchInput };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadSocietyJobCards(1, newFilters);
  };



  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    const newFilters = { ...filters, status };
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, current: 1 }));
    loadSocietyJobCards(1, newFilters);
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
    loadSocietyJobCards(1, newFilters);
  };



  // Handle pagination
  const handlePageChange = (page: number) => {
    loadSocietyJobCards(page, filters);
  };

  // Handle page size change
  const handlePageSizeChange = (pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize }));
    loadSocietyJobCards(1, filters);
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Enquiry': return 'default';
      case 'WIP': return 'warning';
      case 'Done': return 'success';
      case 'Hold': return 'secondary';
      case 'Cancel': return 'destructive';
      case 'Inactive': return 'secondary';
      default: return 'default';
    }
  };

  // Get first service type and remaining for tooltip
  const getServiceTypeDisplay = (serviceType: string) => {
    if (!serviceType) return { first: '', remaining: '' };
    
    // Split by comma and trim whitespace
    const services = serviceType.split(',').map(s => s.trim()).filter(s => s);
    
    if (services.length === 0) return { first: '', remaining: '' };
    if (services.length === 1) return { first: services[0], remaining: '' };
    
    return {
      first: services[0],
      remaining: services.slice(1).join(', ')
    };
  };



  // Extract only the number from job card code (e.g., "JC-0018" -> "0018")
  const extractIdNumber = (code: string) => {
    if (!code) return '';
    // Remove any prefix like "JC-", "#", etc. and return only the number part
    const match = code.match(/(\d+)$/);
    return match ? match[1] : code;
  };

  if (loading && jobCards.length === 0) {
    return <PageLoading text="Loading society bookings..." />;
  }

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10">
      {/* 1. Header Area */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">View Society Bookings</h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            Total {pagination.count} Records
          </span>
        </div>
        <Button 
          onClick={() => navigate('/jobcards/create')}
          className="bg-blue-700 hover:bg-blue-800 h-8 text-[11px] font-extrabold shadow-lg px-6 uppercase tracking-wider"
        >
          <Plus className="h-4 w-4 mr-1" /> Create Society Booking
        </Button>
      </div>

      {/* 2. Filter Bar - High Density */}
      <div className="bg-white p-3 border border-gray-200 shadow-xs flex flex-wrap lg:flex-nowrap items-end gap-3 rounded">
        <div className="flex-1 min-w-[240px]">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Search Bookings</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search ID, Society, Mobile..."
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className="w-full pl-8 pr-4 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition-all h-8 font-semibold"
            />
          </div>
        </div>

        <div className="w-32">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700 uppercase"
          >
            {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label || 'All'}</option>)}
          </select>
        </div>

        <div className="w-36">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Service Type</label>
           <select
            value={filters.service_category}
            onChange={(e) => {
              const newFilters = { ...filters, service_category: e.target.value };
              setFilters(newFilters);
              setPagination(prev => ({ ...prev, current: 1 }));
              loadSocietyJobCards(1, newFilters);
            }}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700"
          >
            {serviceCategoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div className="flex gap-1 h-8">
           <button onClick={clearFilters} className="px-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded transition-colors uppercase">Clear</button>
           <button onClick={handleSearchSubmit} className="px-3 bg-blue-800 hover:bg-blue-900 text-white text-[11px] font-bold rounded transition-colors uppercase">Search</button>
        </div>
      </div>

      {/* 3. Table Results */}
      <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full table-auto border-collapse text-[11px]">
            <thead className="bg-[#f8f9fa] sticky top-0 z-10 border-b border-gray-200 text-gray-600 uppercase">
              <tr className="divide-x divide-gray-200">
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-12">ID</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-44">Society Name</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-28">Mobile</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-48">Address Details</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-40">Service Types</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-32">Schedule</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-24">Status</th>
                <th className="px-3 py-2 text-center font-extrabold tracking-tight italic w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                   <td colSpan={8} className="py-20 text-center">
                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                     <span className="text-[10px] font-bold text-gray-400 uppercase">Loading Society Records...</span>
                   </td>
                </tr>
              ) : jobCards.length === 0 ? (
                <tr>
                   <td colSpan={8} className="py-20 text-center text-gray-400 font-bold uppercase italic text-sm tracking-tight opacity-70">No Society Bookings Found</td>
                </tr>
              ) : jobCards.map((jobCard) => (
                <tr key={jobCard.id} className="hover:bg-gray-50/80 transition-colors divide-x divide-gray-100">
                  <td className="px-3 py-2.5 font-bold text-gray-400 italic tabular-nums">{extractIdNumber(jobCard.code)}</td>
                  <td className="px-3 py-2.5 font-bold text-gray-800 uppercase leading-tight">
                    <div className="flex items-center gap-1.5">
                       <Building2 className="h-3 w-3 text-blue-600 shrink-0" />
                       <span className="truncate">{jobCard.client_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-blue-600 tabular-nums">{jobCard.client_mobile}</td>
                  <td className="px-3 py-2.5">
                    <div className="relative group">
                      <div className="flex flex-col cursor-help">
                        <span className="font-bold text-gray-700 uppercase line-clamp-1 truncate">{jobCard.flat_number || jobCard.building_name || jobCard.area || 'No Flat/Bldg'}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase italic truncate">{jobCard.client_city || 'Maharashtra'}</span>
                      </div>
                      {/* Premium Blue Tooltip */}
                      <div className="absolute left-0 bottom-full mb-1 px-3 py-2 bg-blue-900 border border-blue-800 text-white text-[10px] rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[200px] font-bold uppercase tracking-tight">
                         <div className="text-blue-300 border-b border-blue-800/50 pb-1 mb-1 font-black">Full Location Data</div>
                         <div className="space-y-0.5">
                            {jobCard.flat_number && <div>Flat / Bldg: {jobCard.flat_number} {jobCard.building_name}</div>}
                            {jobCard.area && <div>Area: {jobCard.area}</div>}
                            {jobCard.landmark && <div className="text-blue-200">Landmark: {jobCard.landmark}</div>}
                            <div>City: {jobCard.client_city}</div>
                            {jobCard.client_address && <div className="mt-1 pt-1 border-t border-blue-800/30 text-[9px] text-blue-200 italic lowercase normal-case">"{jobCard.client_address}"</div>}
                         </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                     <div className="relative group">
                        <div className="flex flex-col cursor-help">
                           <span className="font-black text-indigo-700 uppercase tracking-tighter truncate max-w-[120px]">{getServiceTypeDisplay(jobCard.service_type).first || 'N/A'}</span>
                           {getServiceTypeDisplay(jobCard.service_type).remaining && (
                             <span className="text-[9px] font-black text-amber-600">+{getServiceTypeDisplay(jobCard.service_type).remaining.split(',').length} ADDITIONAL SERVICES</span>
                           )}
                        </div>
                        {/* Premium Blue Tooltip for Services */}
                        {getServiceTypeDisplay(jobCard.service_type).remaining && (
                          <div className="absolute left-0 top-full mt-1 px-3 py-2 bg-blue-900 border border-blue-800 text-white text-[10px] rounded shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[220px] font-bold uppercase tracking-tight">
                             <div className="text-blue-300 border-b border-blue-800/50 pb-1 mb-1 font-black underline">Comprehensive Service List</div>
                             <div className="italic leading-relaxed">{jobCard.service_type}</div>
                          </div>
                        )}
                     </div>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-gray-600 italic uppercase">
                    {jobCard.schedule_date ? new Date(jobCard.schedule_date).toLocaleDateString('en-GB') : '---'}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase ring-1 ring-inset", getStatusBadgeVariant(jobCard.status) === 'success' ? 'bg-green-50 text-green-700 ring-green-600/20' : getStatusBadgeVariant(jobCard.status) === 'warning' ? 'bg-amber-50 text-amber-700 ring-amber-600/20' : 'bg-gray-50 text-gray-700 ring-gray-600/20')}>
                      {jobCard.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button 
                      onClick={() => navigate(`/jobcards/edit/${jobCard.id}`)}
                      className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded transition-all group"
                    >
                      <Edit className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
                    </button>
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
    </div>
  );
};

export default SocietyJobCards;