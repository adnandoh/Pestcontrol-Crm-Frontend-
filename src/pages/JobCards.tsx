import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Search,
  CheckCircle,
  Ban,
  Trash2,
  ChevronDown,
  UserMinus,
  CheckSquare,
  Star
} from 'lucide-react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);
import {
  Button,
  Pagination,
  ConfirmationModal
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import AssignTechnicianModal from '../components/crm/AssignTechnicianModal';
import FeedbackModal from '../components/crm/FeedbackModal';
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
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [removeTechId, setRemoveTechId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelErrors, setCancelErrors] = useState<string[]>([]);
  const [removeRemarks, setRemoveRemarks] = useState('');
  const [removeErrors, setRemoveErrors] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // Abort controller for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Status options for dropdown
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'On Process', label: 'On Process' },
    { value: 'Done', label: 'Done' },
    { value: 'Cancelled', label: 'Cancelled' }
  ];

  const serviceCategoryOptions = [
    { value: '', label: 'All Service Types' },
    { value: 'One-Time Service', label: 'One-Time Service' },
    { value: 'AMC', label: 'AMC (Annual Maintenance Contract)' }
  ];



  // Load job cards
  const loadJobCards = useCallback(async (page = 1, currentFilters = filters) => {
    // 1. Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 2. Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      // Optional: Clear jobCards if switching tabs to avoid stale flicker
      // setJobCards([]); 

      const params: any = {
        page,
        page_size: pagination.pageSize,
        ordering: '-created_at',
        booking_type: activeTab
      };

      // Add search filter if provided
      if (currentFilters.search.trim()) {
        params.q = currentFilters.search.trim();
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

      // Add date filters using dayjs for IST accuracy
      if (currentFilters.date_preset === 'today') {
        const today = dayjs().tz("Asia/Kolkata").format("YYYY-MM-DD");
        params.from = today;
        params.to = today;
      } else if (currentFilters.date_preset === 'tomorrow') {
        const tomorrow = dayjs().tz("Asia/Kolkata").add(1, 'day').format("YYYY-MM-DD");
        params.from = tomorrow;
        params.to = tomorrow;
      } else if (currentFilters.date_preset === 'week') {
        const today = dayjs().tz("Asia/Kolkata").format("YYYY-MM-DD");
        const nextWeek = dayjs().tz("Asia/Kolkata").add(7, 'day').format("YYYY-MM-DD");
        params.from = today;
        params.to = nextWeek;
      } else if (currentFilters.date_preset === 'custom' && currentFilters.from && currentFilters.to) {
        params.from = currentFilters.from;
        params.to = currentFilters.to;
      }

      const response: PaginatedResponse<JobCard> = await enhancedApiService.getJobCards(params, controller.signal);

      // Note: Backend now handles sorting priority for Pending/OnProcess
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
      if (err.name === 'CanceledError' || err.name === 'AbortError' || axios.isCancel(err)) {
        console.log('Fetch cancelled');
        return;
      }
      console.error('Error loading job cards:', err);
    } finally {
      // Only set loading to false if this is still the active request
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [activeTab, filters, pagination.pageSize]);

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [pagination.current, filters, loadJobCards]);

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
    let newFilters = { ...filters, [field]: value };
    
    // Automatically switch to custom if user selects a date
    if ((field === 'from' || field === 'to') && value) {
      newFilters.date_preset = 'custom';
    }

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

  // Handle Mark Reminder Done
  const handleMarkReminderDone = async (id: number) => {
    try {
      setLoading(true);
      await enhancedApiService.updateJobCard(id, { 
        is_reminder_done: true 
      });
      loadJobCards(pagination.current, filters);
    } catch (error) {
      console.error('Failed to mark reminder done:', error);
    } finally {
      setLoading(false);
    }
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

  // Handle Delete
  const handleDeleteJobCard = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      await enhancedApiService.deleteJobCard(deleteId);
      setDeleteId(null);
      alert('Booking deleted successfully');
      loadJobCards(pagination.current, filters);
    } catch (error) {
      console.error('Failed to delete booking:', error);
      alert('Failed to delete booking');
    } finally {
      setLoading(false);
    }
  };

  // Validate removal remarks
  const validateRemoveRemarks = (remarks: string) => {
    const errors: string[] = [];
    if (!remarks.trim()) {
      errors.push("Remarks are required");
    } else {
      if (remarks.trim().length < 4) {
        errors.push("Remarks must be at least 4 characters");
      }
      if (!/^[a-zA-Z0-9\s]*$/.test(remarks)) {
        errors.push("Special characters are not allowed");
      }
    }
    return errors;
  };

  const handleRemoveRemarksChange = (value: string) => {
    setRemoveRemarks(value);
    setRemoveErrors(validateRemoveRemarks(value));
  };

  // Handle Remove Technician (Revert to Pending)
  const handleRemoveTechnician = async () => {
    if (!removeTechId) return;
    
    const errors = validateRemoveRemarks(removeRemarks);
    if (errors.length > 0) {
      setRemoveErrors(errors);
      return;
    }

    try {
      setLoading(true);
      await enhancedApiService.updateJobCard(removeTechId, { 
        technician: null,
        assigned_to: '',
        status: 'Pending',
        removal_remarks: removeRemarks.trim()
      });
      setRemoveTechId(null);
      setRemoveRemarks('');
      setRemoveErrors([]);
      loadJobCards(pagination.current, filters);
    } catch (error) {
      console.error('Failed to remove technician:', error);
    } finally {
      setLoading(false);
    }
  };

  // Validate cancellation reason
  const validateCancelReason = (reason: string) => {
    const errors: string[] = [];
    if (!reason.trim()) {
      errors.push("Reason is required");
    } else {
      if (reason.trim().length < 4) {
        errors.push("Reason must be at least 4 characters");
      }
      if (!/^[a-zA-Z0-9\s]*$/.test(reason)) {
        errors.push("Special characters are not allowed");
      }
    }
    return errors;
  };

  const handleCancelReasonChange = (value: string) => {
    setCancelReason(value);
    setCancelErrors(validateCancelReason(value));
  };

  // Handle Cancel Booking
  const handleCancelBooking = async (id: number) => {
    const errors = validateCancelReason(cancelReason);
    if (errors.length > 0) {
      setCancelErrors(errors);
      return;
    }

    try {
      setLoading(true);
      await enhancedApiService.updateJobCard(id, { 
        status: 'Cancelled',
        cancellation_reason: cancelReason.trim()
      });
      setCancellingId(null);
      setCancelReason('');
      setCancelErrors([]);
      loadJobCards(pagination.current, filters);
    } catch (error) {
      console.error('Failed to cancel booking:', error);
    } finally {
      setLoading(false);
    }
  };



  // Skeleton Loader Component
  const TableSkeleton = () => (
    <>
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-gray-100 divide-x divide-gray-50">
          <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded w-12"></div></td>
          <td className="px-4 py-4"><div className="space-y-2"><div className="h-4 bg-gray-200 rounded w-24"></div><div className="h-3 bg-gray-200 rounded w-16"></div></div></td>
          <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
          <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
          <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded w-20"></div></td>
          <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
          {(activeTab === 'pending' || activeTab === 'on_process') && <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>}
          <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
          <td className="px-4 py-4"><div className="h-8 bg-gray-200 rounded w-10"></div></td>
        </tr>
      ))}
    </>
  );

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
            { id: 'reminders', label: 'Reminders' },
            { id: 'cancelled', label: 'Cancelled' },
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

        <div className="flex items-center gap-1">
           <div className="w-32 text-gray-400">
              <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">From</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white text-gray-800"
              />
           </div>
           <div className="w-32 text-gray-400">
              <label className="text-[10px] font-bold text-gray-400 mb-1 block uppercase">To</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white text-gray-800"
              />
           </div>
        </div>

        <div className="flex gap-2 h-8">
           <button 
             onClick={() => handleFilterChange('date_preset', 'today')}
             className={`px-3 text-[10px] font-black rounded border transition-all uppercase ${
               filters.date_preset === 'today' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
             }`}
           >
             Today
           </button>
           <button 
             onClick={() => handleFilterChange('date_preset', 'tomorrow')}
             className={`px-3 text-[10px] font-black rounded border transition-all uppercase ${
               filters.date_preset === 'tomorrow' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
             }`}
           >
             Tomorrow
           </button>
           <button 
             onClick={() => handleFilterChange('date_preset', 'week')}
             className={`px-3 text-[10px] font-black rounded border transition-all uppercase ${
               filters.date_preset === 'week' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
             }`}
           >
             Week
           </button>
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
                {(activeTab === 'pending' || activeTab === 'on_process') && (
                  <th className="px-4 py-3 text-left font-extrabold tracking-tighter">Created</th>
                )}
                {activeTab === 'upcoming_services' && (
                  <th className="px-4 py-3 text-left font-extrabold tracking-tighter text-blue-700">Next Service</th>
                )}
                {activeTab === 'reminders' && (
                  <th className="px-4 py-3 text-left font-extrabold tracking-tighter text-orange-700">Reminder Info</th>
                )}
                <th className="px-4 py-3 text-left font-extrabold tracking-tighter">Status</th>
                <th className="px-4 py-3 text-center font-extrabold tracking-tighter w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                 <TableSkeleton />
              ) : jobCards.length === 0 ? (
                 <tr>
                    <td colSpan={10} className="py-20 text-center text-gray-400 font-bold uppercase italic">
                       No Bookings Found In This Category
                    </td>
                 </tr>
              ) : jobCards.map((job) => {
                const today = dayjs().tz("Asia/Kolkata").startOf('day');
                const tomorrow = today.add(1, 'day');
                const jobDate = dayjs(job.schedule_datetime).tz("Asia/Kolkata");

                const isToday = jobDate.isSame(today, 'day');
                const isTomorrow = jobDate.isSame(tomorrow, 'day');
                
                const rowBg = isToday ? 'bg-emerald-100/60' : isTomorrow ? 'bg-yellow-100/60' : '';
                
                return (
                  <React.Fragment key={job.id}>
                    <tr className={`${rowBg} hover:bg-blue-50/50 transition-colors divide-x divide-gray-50 group`}>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5 relative">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              if (activeTab !== 'on_process') {
                                handleOpenAssign(job);
                              }
                            }}
                            className={`text-[10px] font-bold ${
                              activeTab === 'on_process' 
                                ? 'text-gray-500 bg-gray-100 cursor-default' 
                                : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                            } px-1.5 py-0.5 rounded border border-blue-100 w-fit transition-colors shadow-xs`}
                          >
                            {job.id}
                          </button>
                        </div>
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
                        
                        {(job.is_service_call || ((job.status === 'On Process' || job.status === 'Done') && job.next_service_date)) && (
                          <div className="mt-1">
                            <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm tracking-tighter uppercase italic">
                              SERVICE CALL
                            </span>
                          </div>
                        )}
                        
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
                        activeTab === 'on_process' ? (
                          <span className="font-bold text-indigo-700 uppercase italic tracking-tighter text-[11px]">
                            {job.technician_name || job.assigned_to}
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleOpenAssign(job)}
                            className="font-bold text-indigo-700 hover:text-blue-600 uppercase italic tracking-tighter text-[11px] text-left hover:underline transition-all"
                          >
                            {job.technician_name || job.assigned_to}
                          </button>
                        )
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
                          {job.schedule_datetime ? dayjs(job.schedule_datetime).tz("Asia/Kolkata").format('DD/MM/YYYY') : '---'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {job.schedule_datetime ? dayjs(job.schedule_datetime).tz("Asia/Kolkata").format('hh:mm A') : ''}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-black text-emerald-700 uppercase tracking-tighter">Today</span>
                        )}
                        {isTomorrow && (
                          <span className="text-[9px] font-black text-yellow-700 uppercase tracking-tighter">Tomorrow</span>
                        )}
                      </div>
                    </td>
                    {(activeTab === 'pending' || activeTab === 'on_process') && (
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-500 text-[10px]">
                            {job.created_at || '---'}
                          </span>
                        </div>
                      </td>
                    )}
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
                    {activeTab === 'reminders' && (
                      <td className="px-4 py-4 bg-orange-50/20">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded shadow-xs border",
                              dayjs(job.reminder_date).isSame(dayjs(), 'day') ? "bg-red-500 text-white border-red-600" :
                              dayjs(job.reminder_date).isSame(dayjs().add(1, 'day'), 'day') ? "bg-yellow-500 text-white border-yellow-600" :
                              "bg-orange-50 text-orange-700 border-orange-200"
                            )}>
                              {job.reminder_date ? dayjs(job.reminder_date).format('DD-MM-YYYY') : '---'}
                            </span>
                            {dayjs(job.reminder_date).isSame(dayjs(), 'day') && (
                              <span className="text-[9px] font-black text-red-600 uppercase animate-pulse">Urgent</span>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-gray-600 italic line-clamp-2 max-w-[150px]">
                            {job.reminder_note || 'No notes added'}
                          </p>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-4 text-center">
                      <div className="flex flex-col gap-1.5 items-center">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase shadow-xs border ${
                          job.status === 'Done' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                          job.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          job.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {job.status}
                        </span>
                        {job.status === 'Cancelled' && job.cancellation_reason && (
                          <div className="max-w-[120px] text-[9px] font-bold text-red-600 bg-red-50/50 px-2 py-0.5 rounded border border-red-100 leading-tight">
                            {job.cancellation_reason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {cancellingId === job.id ? (
                          <div className="flex flex-col gap-2 min-w-[200px] animate-fade-in">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Enter reason (min 4 letters)..."
                                value={cancelReason}
                                onChange={(e) => handleCancelReasonChange(e.target.value)}
                                className={`w-full px-2 py-1.5 text-[10px] border rounded outline-none font-bold ${
                                  cancelErrors.length > 0 ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                                autoFocus
                              />
                              {cancelErrors.length > 0 && (
                                <div className="absolute left-0 top-full mt-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded shadow-lg z-50 animate-bounce-subtle">
                                  {cancelErrors[0]}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleCancelBooking(job.id)}
                                disabled={cancelErrors.length > 0 || !cancelReason.trim()}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-[9px] font-black py-1.5 rounded uppercase transition-colors shadow-sm"
                              >
                                Confirm Cancel
                              </button>
                              <button 
                                onClick={() => {
                                  setCancellingId(null);
                                  setCancelReason('');
                                  setCancelErrors([]);
                                }}
                                className="px-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[9px] font-bold py-1.5 rounded uppercase"
                              >
                                X
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {(activeTab === 'pending' || activeTab === 'on_process') && (
                              <>
                                <button 
                                  onClick={() => {
                                    setCancellingId(job.id);
                                    setCancelReason('');
                                    setCancelErrors([]);
                                  }} 
                                  className="p-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded shadow-xs border border-red-100 transition-all group/cancel"
                                  title="Cancel Booking"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </button>
                                
                                <button 
                                  onClick={() => setDoneId(job.id)} 
                                  className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded shadow-xs border border-emerald-100 transition-all group/done"
                                  title="Mark as Done"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </button>
                                
                                {activeTab === 'on_process' && (
                                  <button 
                                    onClick={() => setRemoveTechId(job.id)} 
                                    className="p-2 bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white rounded shadow-xs border border-amber-100 transition-all group/remove"
                                    title="Remove Technician (Back to Pending)"
                                  >
                                    <UserMinus className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </>
                            )}

                            {job.status === 'Done' && (
                              <button 
                                onClick={() => {
                                  setSelectedJobCard(job);
                                  setShowFeedbackModal(true);
                                }} 
                                className="p-2 bg-purple-50 hover:bg-purple-600 text-purple-600 hover:text-white rounded shadow-xs border border-purple-100 transition-all group/feedback"
                                title="Feedback"
                              >
                                <Star className="h-3.5 w-3.5" />
                              </button>
                            )}
                            
                            <button 
                              onClick={() => setDeleteId(job.id)} 
                              className="p-2 bg-red-50 hover:bg-red-900 text-red-700 hover:text-white rounded shadow-xs border border-red-100 transition-all group/delete"
                              title="Delete Permanently"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            {activeTab === 'reminders' && (
                              <button 
                                onClick={() => handleMarkReminderDone(job.id)}
                                className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded shadow-xs border border-emerald-100 transition-all group/reminder-done"
                                title="Mark Reminder Done"
                              >
                                <CheckSquare className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button 
                              onClick={() => navigate(`/jobcards/edit/${job.id}`)} 
                              className="p-2 bg-gray-50 hover:bg-blue-600 text-gray-400 hover:text-white rounded shadow-xs border border-gray-100 transition-all group/edit"
                              title="Edit Booking"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-4">
                      {(job.cancellation_reason || job.removal_remarks) && (
                        <button
                          onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                          className="p-1 hover:bg-gray-100 text-gray-400 rounded transition-all"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expandedId === job.id ? 'rotate-180 text-blue-600' : ''}`} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === job.id && (
                    <tr className="animate-fade-in bg-[#fcfdfe]">
                      <td colSpan={activeTab === 'upcoming_services' ? 9 : 8} className="p-0">
                        <div className="px-12 py-6 border-b border-gray-100">
                          <div className="max-w-4xl border border-[#e2e8f0] rounded-sm overflow-hidden shadow-sm">
                            {job.cancellation_reason && (
                              <div className="grid grid-cols-[180px_1fr] border-b border-[#e2e8f0] last:border-b-0 group/row">
                                <div className="bg-[#f8fafc] px-6 py-3 text-[11px] font-black text-gray-500 border-r border-[#e2e8f0] uppercase tracking-wider">
                                  Cancelled Reason
                                </div>
                                <div className="px-6 py-3 text-[12px] font-bold text-gray-700 bg-white italic">
                                  "{job.cancellation_reason}"
                                </div>
                              </div>
                            )}
                            {job.removal_remarks && (
                              <div className="grid grid-cols-[180px_1fr] border-b border-[#e2e8f0] last:border-b-0 group/row">
                                <div className="bg-[#f8fafc] px-6 py-3 text-[11px] font-black text-gray-500 border-r border-[#e2e8f0] uppercase tracking-wider">
                                  Removal Remarks
                                </div>
                                <div className="px-6 py-3 text-[12px] font-bold text-gray-700 bg-white italic text-amber-700">
                                  "{job.removal_remarks}"
                                </div>
                              </div>
                            )}
                            {/* Placeholders for future expanded data as per user's screenshot style */}
                            <div className="grid grid-cols-[180px_1fr] border-b border-[#e2e8f0] last:border-b-0 opacity-40">
                              <div className="bg-[#f8fafc] px-6 py-3 text-[11px] font-black text-gray-500 border-r border-[#e2e8f0] uppercase tracking-wider">
                                Technician Name
                              </div>
                              <div className="px-6 py-3 text-[12px] font-bold text-gray-700 bg-white">
                                {job.technician_name || '-'}
                              </div>
                            </div>
                            <div className="grid grid-cols-[180px_1fr] border-b border-[#e2e8f0] last:border-b-0 opacity-40">
                              <div className="bg-[#f8fafc] px-6 py-3 text-[11px] font-black text-gray-500 border-r border-[#e2e8f0] uppercase tracking-wider">
                                Assigned By
                              </div>
                              <div className="px-6 py-3 text-[12px] font-bold text-gray-700 bg-white">
                                {job.assigned_to || '-'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
        isOpen={!!removeTechId}
        onClose={() => {
          setRemoveTechId(null);
          setRemoveRemarks('');
          setRemoveErrors([]);
        }}
        onConfirm={handleRemoveTechnician}
        title="Remove Technician"
        message="Are you sure you want to remove the technician from this booking? It will be moved back to the Pending tab."
        confirmText="Yes, Remove"
        type="danger"
        isConfirmDisabled={!removeRemarks.trim() || removeErrors.length > 0}
      >
        <div className="mt-4 space-y-2">
          <label className="text-[11px] font-black text-gray-700 uppercase tracking-widest block">
            Removal Remarks *
          </label>
          <textarea
            value={removeRemarks}
            onChange={(e) => handleRemoveRemarksChange(e.target.value)}
            placeholder="Why are you removing the technician? (min 4 chars)"
            className={`w-full p-3 text-sm border rounded-lg outline-none transition-all ${
              removeErrors.length > 0 
                ? 'border-red-500 bg-red-50 focus:ring-1 focus:ring-red-200' 
                : 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-100'
            }`}
            rows={3}
            autoFocus
          />
          {removeErrors.length > 0 && (
            <p className="text-[10px] font-black text-red-500 uppercase animate-fade-in">
              {removeErrors[0]}
            </p>
          )}
        </div>
      </ConfirmationModal>
      <ConfirmationModal
        isOpen={!!doneId}
        onClose={() => setDoneId(null)}
        onConfirm={handleMarkAsDone}
        title="Complete Booking"
        message="Are you sure you want to mark this booking as DONE? It will be moved to the Done tab."
        confirmText="Yes, Done"
        type="info"
      />
      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteJobCard}
        title="Delete Booking Permanently"
        message="Are you sure you want to DELETE this booking forever? This action cannot be undone and the record will be removed from all tabs."
        confirmText="Yes, Delete Permanently"
        type="danger"
      />
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        jobCard={selectedJobCard}
        onSuccess={() => {
          loadJobCards(pagination.current, filters);
        }}
      />
    </div>
  );
};

export default JobCards;