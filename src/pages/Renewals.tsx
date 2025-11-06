import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckCircle,
  Calendar,
  AlertTriangle,
  Clock,
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
  Select
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import type { Renewal, PaginatedResponse } from '../types';

const Renewals: React.FC = () => {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRenewals, setSelectedRenewals] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    urgency_level: '',
    renewal_type: ''
  });
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
      setError(null);

      const params = {
        page,
        page_size: pagination.pageSize,
        ordering: 'due_date',
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') {
          delete params[key];
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
      setError(err.message || 'Failed to load renewals');
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
      setError('Failed to mark renewal as completed: ' + err.message);
    }
  };

  // Handle bulk mark as completed
  const handleBulkMarkCompleted = async () => {
    if (selectedRenewals.length === 0) {
      setError('Please select at least one renewal to mark as completed');
      return;
    }

    try {
      setBulkLoading(true);
      setError(null);
      const result = await enhancedApiService.bulkMarkRenewalsCompleted(selectedRenewals);
      
      if (result.failed_count > 0) {
        setError(`Marked ${result.success_count} as completed, but ${result.failed_count} failed`);
      }
      
      setSelectedRenewals([]);
      loadRenewals(pagination.current);
    } catch (err: any) {
      setError('Failed to mark renewals as completed: ' + err.message);
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

  // Clear filters
  const clearFilters = () => {
    setFilters({
      status: '',
      urgency_level: '',
      renewal_type: ''
    });
    setTimeout(() => loadRenewals(1), 0);
  };

  // Refresh renewals
  const refreshRenewals = () => {
    loadRenewals(pagination.current);
  };

  // Get urgency icon and color
  const getUrgencyDisplay = (urgencyLevel: string, urgencyColor: string) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Renewals</h1>
          <p className="text-sm text-gray-600 mt-1">Manage job card renewals and reminders</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedRenewals.length > 0 && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleBulkMarkCompleted}
              disabled={bulkLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark {selectedRenewals.length} as Completed
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={refreshRenewals}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'Due', label: 'Due' },
                  { value: 'Completed', label: 'Completed' }
                ]}
                placeholder="Select status"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urgency Level
              </label>
              <Select
                value={filters.urgency_level}
                onChange={(value) => handleFilterChange('urgency_level', value)}
                options={[
                  { value: '', label: 'All Urgency Levels' },
                  { value: 'High', label: 'High (Red)' },
                  { value: 'Medium', label: 'Medium (Yellow)' },
                  { value: 'Normal', label: 'Normal (Green)' }
                ]}
                placeholder="Select urgency"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Renewal Type
              </label>
              <Select
                value={filters.renewal_type}
                onChange={(value) => handleFilterChange('renewal_type', value)}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'Contract', label: 'Contract Renewal' },
                  { value: 'Monthly', label: 'Monthly Reminder' }
                ]}
                placeholder="Select type"
              />
            </div>

            <div className="flex items-end space-x-2">
              <Button onClick={applyFilters} size="sm">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters} size="sm">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
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

      {/* Renewals List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Renewals ({pagination.count})
            </span>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {renewals.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No renewals found</p>
              <p className="text-sm text-gray-400">Renewals will appear here when job cards are due for renewal</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Select All Checkbox */}
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={renewals.filter(r => r.status === 'Due').every(r => selectedRenewals.includes(r.id)) && renewals.filter(r => r.status === 'Due').length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                />
                <label className="text-sm font-medium text-gray-700">
                  Select all due renewals ({renewals.filter(r => r.status === 'Due').length} due)
                </label>
              </div>
              {renewals.map((renewal) => {
                const urgencyDisplay = getUrgencyDisplay(renewal.urgency_level, renewal.urgency_color);
                const dueDate = new Date(renewal.due_date);
                const isOverdue = dueDate < new Date() && renewal.status === 'Due';

                return (
                  <div
                    key={renewal.id}
                    className={`p-6 hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-50 border-l-4 border-l-red-500' : ''} ${selectedRenewals.includes(renewal.id) ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {renewal.status === 'Due' && (
                          <input
                            type="checkbox"
                            checked={selectedRenewals.includes(renewal.id)}
                            onChange={() => handleToggleSelect(renewal.id)}
                            className="h-4 w-4 text-primary-600 rounded border-gray-300 mt-1"
                          />
                        )}
                        <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            Job Card #{renewal.jobcard_code}
                          </h3>
                          <Badge variant={urgencyDisplay.variant} className="flex items-center">
                            {urgencyDisplay.icon}
                            {renewal.urgency_level}
                          </Badge>
                          <Badge variant={renewal.status === 'Completed' ? 'success' : 'default'}>
                            {renewal.status}
                          </Badge>
                          {renewal.is_paused && (
                            <Badge variant="secondary" size="sm">
                              Paused
                            </Badge>
                          )}
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Client:</strong> {renewal.client_name}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Renewal Type:</strong> {renewal.renewal_type}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Due Date:</strong> {dueDate.toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                            {isOverdue && (
                              <span className="text-red-600 font-medium ml-2">(Overdue)</span>
                            )}
                          </p>
                        </div>

                        {renewal.remarks && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-700">
                              <strong>Remarks:</strong> {renewal.remarks}
                            </p>
                          </div>
                        )}

                        <div className="text-sm text-gray-500">
                          Created on {new Date(renewal.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {renewal.status === 'Due' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleMarkCompleted(renewal.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Complete
                          </Button>
                        )}

                        <Button variant="outline" size="sm">
                          View Job Card
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
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

export default Renewals;