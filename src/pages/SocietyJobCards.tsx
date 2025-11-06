import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Calendar,
  Building2,
  Search,
  Filter,
  X
} from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  PageLoading,
  Pagination,
  Input,
  Select
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import type { JobCard, PaginatedResponse } from '../types';

const SocietyJobCards: React.FC = () => {
  const navigate = useNavigate();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    status: ''
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Status options for dropdown
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Enquiry', label: 'Enquiry' },
    { value: 'WIP', label: 'WIP' },
    { value: 'Done', label: 'Done' },
    { value: 'Hold', label: 'Hold' },
    { value: 'Cancel', label: 'Cancel' },
    { value: 'Inactive', label: 'Inactive' }
  ];

  // Load society job cards
  const loadSocietyJobCards = async (page = 1, currentFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

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
      setError(err.message || 'Failed to load society job cards');
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
        console.log('🔄 Page visible - refreshing society job cards data');
        loadSocietyJobCards(pagination.current, filters);
      }
    };

    const handleFocus = () => {
      console.log('🔄 Window focused - refreshing society job cards data');
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

  // Handle Enter key in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
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
    const newFilters = { search: '', status: '' };
    setFilters(newFilters);
    setSearchInput('');
    setPagination(prev => ({ ...prev, current: 1 }));
    loadSocietyJobCards(1, newFilters);
  };

  // Check if any filters are active
  const hasActiveFilters = filters.search || filters.status;

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

  // Truncate address to show only first 5 words
  const truncateAddress = (text: string, wordLimit: number = 5) => {
    if (!text) return '';
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  // Extract only the number from job card code (e.g., "JC-0018" -> "0018")
  const extractIdNumber = (code: string) => {
    if (!code) return '';
    // Remove any prefix like "JC-", "#", etc. and return only the number part
    const match = code.match(/(\d+)$/);
    return match ? match[1] : code;
  };

  if (loading && jobCards.length === 0) {
    return <PageLoading text="Loading society job cards..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-blue-600" />
            Society Job Cards
          </h1>
          <p className="text-sm text-gray-600 mt-1">Manage and track all society job cards</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button size="sm" onClick={() => navigate('/jobcards/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Society Job Card
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Field */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by job code (e.g., JC-0021), society name, or contact number..."
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="pl-10 pr-10"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      if (searchTimeout) {
                        clearTimeout(searchTimeout);
                        setSearchTimeout(null);
                      }
                      if (filters.search) {
                        const newFilters = { ...filters, search: '' };
                        setFilters(newFilters);
                        setPagination(prev => ({ ...prev, current: 1 }));
                        loadSocietyJobCards(1, newFilters);
                      }
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Button */}
            <Button onClick={handleSearchSubmit} variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>

            {/* Status Filter */}
            <div className="w-48">
              <Select
                value={filters.status}
                onChange={handleStatusFilterChange}
                options={statusOptions}
                placeholder="Filter by status"
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="ghost" size="sm">
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.search && (
                <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  <Search className="h-3 w-3 mr-1" />
                  Search: "{filters.search}"
                  <button
                    onClick={() => {
                      const newFilters = { ...filters, search: '' };
                      setFilters(newFilters);
                      setSearchInput('');
                      setPagination(prev => ({ ...prev, current: 1 }));
                      loadSocietyJobCards(1, newFilters);
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {filters.status && (
                <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  <Filter className="h-3 w-3 mr-1" />
                  Status: {filters.status}
                  <button
                    onClick={() => {
                      const newFilters = { ...filters, status: '' };
                      setFilters(newFilters);
                      setPagination(prev => ({ ...prev, current: 1 }));
                      loadSocietyJobCards(1, newFilters);
                    }}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="text-red-600 text-center">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* Society Job Cards List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-blue-600" />
              {hasActiveFilters ? 'Filtered Society Job Cards' : 'Society Job Cards'} ({pagination.count})
            </span>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {jobCards.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {hasActiveFilters ? (
                <>
                  <p className="text-gray-500 mb-4">No society job cards match your search criteria</p>
                  <Button onClick={clearFilters} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-4">No society job cards found</p>
                  <Button size="sm" onClick={() => navigate('/jobcards/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Society Job Card
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <div className="inline-block min-w-full align-middle px-6">
                <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider w-16">
                      Id
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Society Name
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider w-28">
                      Mobile Number
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Society Address
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider w-32">
                      Service Types
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider w-28">
                      Schedule Date
                    </th>
                    <th className="px-3 py-3 text-left text-sm font-semibold text-gray-500 uppercase tracking-wider w-20">
                      Status
                    </th>
                    <th className="px-3 py-3 text-right text-sm font-semibold text-gray-500 uppercase tracking-wider w-16">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobCards.map((jobCard) => (
                    <tr key={jobCard.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {extractIdNumber(jobCard.code)}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-blue-600 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            {jobCard.client_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {jobCard.client_mobile}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="relative group">
                          <div className="text-sm text-gray-900 cursor-help">
                            {truncateAddress(jobCard.client_address || 'N/A')}
                          </div>
                          {/* Enhanced Tooltip for Address */}
                          {(jobCard.client_address && jobCard.client_address !== 'N/A') && (
                            <div className="absolute left-0 top-full mt-1 px-3 py-2 bg-black text-white text-sm rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 whitespace-normal max-w-xs">
                              <div className="font-semibold mb-1">Full Address:</div>
                              <div>{jobCard.client_address}</div>
                              {jobCard.client_city && (
                                <div className="mt-1 text-gray-300">
                                  <span className="font-semibold">City:</span> {jobCard.client_city}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="relative group">
                          <div className="text-sm text-gray-900 cursor-help">
                            {getServiceTypeDisplay(jobCard.service_type).first || 'N/A'}
                            {getServiceTypeDisplay(jobCard.service_type).remaining && (
                              <span className="text-gray-400 ml-1">+{getServiceTypeDisplay(jobCard.service_type).remaining.split(',').length}</span>
                            )}
                          </div>
                          {/* Enhanced Tooltip - Show remaining services */}
                          {getServiceTypeDisplay(jobCard.service_type).remaining && (
                            <div className="absolute left-0 top-full mt-1 px-3 py-2 bg-black text-white text-sm rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 whitespace-break-spaces max-w-xs">
                              <div className="font-semibold mb-1">All Services:</div>
                              {jobCard.service_type}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {jobCard.schedule_date ? (
                            <div className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(jobCard.schedule_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-gray-400">Not scheduled</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <Badge variant={getStatusBadgeVariant(jobCard.status)}>
                          {jobCard.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/jobcards/edit/${jobCard.id}`)}
                            title="Edit Society Job Card"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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