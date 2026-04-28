import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle,
  Calendar,
  AlertTriangle,
  Clock,
  Search
} from 'lucide-react';
import {
  Button,
  PageLoading,
  Pagination,
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { Renewal, PaginatedResponse } from '../types';

const Renewals: React.FC = () => {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRenewals, setSelectedRenewals] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    urgency_level: '',
    renewal_type: '',
    jobcard__service_category: '',
    jobcard__assigned_to: ''
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
    current: 1,
    pageSize: 10,
    totalPages: 0
  });

  // Load renewals
  const loadRenewals = async (page = 1) => {
    try {
      setLoading(true);

      const params = {
        page,
        page_size: pagination.pageSize,
        ordering: 'due_date',
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        const typedKey = key as keyof typeof params;
        if (params[typedKey] === '') {
          delete params[typedKey];
        }
      });

      const response: PaginatedResponse<Renewal> = await enhancedApiService.getRenewals(params);

      setRenewals(response.results);
      setPagination(prev => ({
        ...prev,
        count: response.count,
        next: response.next,
        previous: response.previous,
        current: page,
        totalPages: Math.max(1, Math.ceil(response.count / prev.pageSize))
      }));
    } catch (err: any) {
      console.error('Error loading renewals:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadRenewals();
  }, []);



  // Handle pagination
  const handlePageChange = (page: number) => {
    loadRenewals(page);
  };

  // Handle page size change
  const handlePageSizeChange = (pageSize: number) => {
    setPagination(prev => ({ ...prev, pageSize }));
    loadRenewals(1);
  };

  // Handle mark as completed
  const handleMarkCompleted = async (id: number) => {
    try {
      await enhancedApiService.markRenewalCompleted(id);
      setSelectedRenewals(prev => prev.filter(rid => rid !== id));
      loadRenewals(pagination.current);
    } catch (err: any) {
    }
  };

  // Handle bulk mark as completed
  const handleBulkMarkCompleted = async () => {
    if (selectedRenewals.length === 0) {
      return;
    }

    try {
      setBulkLoading(true);
      const result = await enhancedApiService.bulkMarkRenewalsCompleted(selectedRenewals);
      
      if (result.failed_count > 0) {
      }
      
      setSelectedRenewals([]);
      loadRenewals(pagination.current);
    } catch (err: any) {
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle select/deselect renewal
  const handleToggleSelect = (id: number) => {
    setSelectedRenewals(prev => 
      prev.includes(id) 
        ? prev.filter(rid => rid !== id)
        : [...prev, id]
    );
  };

  // Handle select all on current page
  const handleSelectAll = () => {
    const dueRenewals = renewals.filter(r => r.status === 'Due').map(r => r.id);
    if (dueRenewals.every(id => selectedRenewals.includes(id))) {
      // Deselect all
      setSelectedRenewals(prev => prev.filter(id => !dueRenewals.includes(id)));
    } else {
      // Select all
      setSelectedRenewals(prev => [...new Set([...prev, ...dueRenewals])]);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    loadRenewals(1);
  };

  // Handle search with debounce
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    
    const timeout = setTimeout(() => {
      if (filters.search !== searchInput) {
        setFilters(prev => ({ ...prev, search: searchInput }));
        loadRenewals(1);
      }
    }, 500);
    
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Clear filters
  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      urgency_level: '',
      renewal_type: '',
      jobcard__service_category: '',
      jobcard__assigned_to: ''
    });
    setSearchInput('');
    setTimeout(() => loadRenewals(1), 0);
  };

  // Refresh renewals
  const refreshRenewals = () => {
    loadRenewals(pagination.current);
  };

  // Get urgency icon and color
  const getUrgencyDisplay = (urgencyLevel: string, _urgencyColor: string) => {
    const iconProps = { className: "h-4 w-4 mr-1" };

    switch (urgencyLevel) {
      case 'High':
        return {
          icon: <AlertTriangle {...iconProps} />,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          variant: 'destructive' as const
        };
      case 'Medium':
        return {
          icon: <Clock {...iconProps} />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          variant: 'warning' as const
        };
      case 'Normal':
        return {
          icon: <Calendar {...iconProps} />,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          variant: 'success' as const
        };
      default:
        return {
          icon: <Calendar {...iconProps} />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          variant: 'secondary' as const
        };
    }
  };

  if (loading && renewals.length === 0) {
    return <PageLoading text="Loading renewals..." />;
  }

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10">
      {/* 1. Header Area */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">View Renewals</h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            Total {pagination.count} Records
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedRenewals.length > 0 && (
            <Button size="sm" onClick={handleBulkMarkCompleted} disabled={bulkLoading} className="bg-amber-500 hover:bg-amber-600 h-8 font-bold shadow-sm">
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Mark Selected ({selectedRenewals.length})
            </Button>
          )}
          <Button size="sm" onClick={refreshRenewals} variant="outline" className="h-8 font-bold shadow-sm border-gray-200">
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* 2. Filter Bar - High Density */}
      <div className="bg-white p-3 border border-gray-200 shadow-xs flex flex-wrap lg:flex-nowrap items-end gap-3 rounded">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Search By Mobile / Name</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search ID, Name, Mobile..."
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
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700"
          >
            {[
              { value: '', label: 'Status' },
              { value: 'Due', label: 'Due' },
              { value: 'Completed', label: 'Completed' }
            ].map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div className="w-32">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Urgency</label>
          <select
            value={filters.urgency_level}
            onChange={(e) => handleFilterChange('urgency_level', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700"
          >
            {[
              { value: '', label: 'Urgency' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Normal', label: 'Normal' }
            ].map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div className="w-40">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Type</label>
          <select
            value={filters.renewal_type}
            onChange={(e) => handleFilterChange('renewal_type', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700"
          >
            {[
              { value: '', label: 'All Types' },
              { value: 'Contract', label: 'Contract' },
              { value: 'Monthly', label: 'Monthly' }
            ].map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div className="flex gap-1 h-8">
           <button onClick={clearFilters} className="px-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded transition-colors">CLEAR</button>
           <button onClick={applyFilters} className="px-3 bg-blue-800 hover:bg-blue-900 text-white text-[11px] font-bold rounded transition-colors">SEARCH</button>
        </div>
      </div>

      {/* 3. Table Results */}
      <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full table-auto border-collapse text-[11px]">
            <thead className="bg-[#f8f9fa] sticky top-0 z-10 border-b border-gray-200 text-gray-600 uppercase">
              <tr className="divide-x divide-gray-200">
                <th className="px-3 py-2 text-left bg-gray-50/50 w-10">
                  <input
                    type="checkbox"
                    checked={renewals.length > 0 && renewals.filter(r => r.status === 'Due').every(r => selectedRenewals.includes(r.id)) && renewals.filter(r => r.status === 'Due').length > 0}
                    onChange={handleSelectAll}
                    className="h-3.5 w-3.5 rounded border-gray-300"
                  />
                </th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Booking ID</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Client Name</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Type</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Due Date</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Urgency</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Status</th>
                <th className="px-3 py-2 text-center font-extrabold tracking-tight italic">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                 <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Loading Results...</span>
                    </td>
                 </tr>
              ) : renewals.length === 0 ? (
                 <tr>
                    <td colSpan={8} className="py-20 text-center text-gray-400 font-bold uppercase italic">
                       No Renewals Found
                    </td>
                 </tr>
              ) : renewals.map((renewal) => {
                const urgency = getUrgencyDisplay(renewal.urgency_level, "");
                const isOverdue = new Date(renewal.due_date) < new Date() && renewal.status === 'Due';
                
                return (
                  <tr key={renewal.id} className={cn(
                    "hover:bg-gray-50/80 transition-colors divide-x divide-gray-100",
                    selectedRenewals.includes(renewal.id) && "bg-blue-50/50",
                    isOverdue && "bg-red-50/30"
                  )}>
                    <td className="px-3 py-2.5">
                      {renewal.status === 'Due' && (
                        <input
                          type="checkbox"
                          checked={selectedRenewals.includes(renewal.id)}
                          onChange={() => handleToggleSelect(renewal.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-blue-600">{renewal.jobcard}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 uppercase">{renewal.client_name}</td>
                    <td className="px-3 py-2.5 font-bold text-gray-600 uppercase">{renewal.renewal_type}</td>
                    <td className="px-3 py-2.5">
                      <div className={cn("font-bold", isOverdue ? "text-red-600" : "text-gray-600")}>
                        {new Date(renewal.due_date).toLocaleDateString('en-GB')}
                        {isOverdue && <span className="ml-1 text-[8px] font-black uppercase tracking-tighter">Overdue</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-bold">
                       <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase ring-1 ring-inset", urgency.color, urgency.bgColor, "ring-gray-200")}>
                         {renewal.urgency_level}
                       </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 ring-inset ${
                        renewal.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-orange-50 text-orange-700 ring-orange-600/20'
                      }`}>
                        {renewal.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {renewal.status === 'Due' && (
                           <button onClick={() => handleMarkCompleted(renewal.id)} className="p-1.5 bg-gray-100 hover:bg-green-100 rounded transition-all group">
                             <CheckCircle className="h-3 w-3 text-gray-400 group-hover:text-green-600" />
                           </button>
                        )}
                        <button className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded transition-all group">
                           <Calendar className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
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

export default Renewals;