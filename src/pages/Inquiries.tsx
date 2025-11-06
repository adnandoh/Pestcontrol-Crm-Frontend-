import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  CheckCircle,
  ArrowRight,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react';
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Badge,
  PageLoading,
  Pagination
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import type { Inquiry, PaginatedResponse } from '../types';

const Inquiries: React.FC = () => {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
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

  // Load inquiries
  const loadInquiries = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        page_size: pagination.pageSize,
        ordering: '-created_at'
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
      setError(err.message || 'Failed to load inquiries');
      console.error('Error loading inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadInquiries();
  }, []);



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
        client_city: inquiry.city || '',
        client_address: '', // Will need to be filled later
        job_type: 'Customer' as const, // Default to Customer for inquiry conversions
        service_type: inquiry.service_interest,
        schedule_date: new Date().toISOString().split('T')[0], // Today's date as default
        status: 'Enquiry',
        payment_status: 'Unpaid',
        price: '',
        next_service_date: ''
      };

      const jobCard = await enhancedApiService.convertInquiry(inquiry.id, jobCardData);
      alert(`Successfully converted to Job Card #${jobCard.code}`);
      loadInquiries(pagination.current);
    } catch (err: any) {
      setError('Failed to convert inquiry: ' + err.message);
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'New': return 'default';
      case 'Contacted': return 'warning';
      case 'Converted': return 'success';
      case 'Closed': return 'secondary';
      default: return 'default';
    }
  };

  if (loading && inquiries.length === 0) {
    return <PageLoading text="Loading inquiries..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
        </div>
        <div className="flex items-center space-x-3">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Inquiry
          </Button>
        </div>
      </div>



      {/* Error Message */}
      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="text-red-600 text-center">{error}</div>
          </CardContent>
        </Card>
      )}

      {/* Inquiries List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Inquiries ({pagination.count})
            </span>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {inquiries.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No inquiries found</p>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Inquiry
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {inquiries.map((inquiry) => (
                <div 
                  key={inquiry.id} 
                  className={`p-6 hover:bg-gray-50 transition-colors ${!inquiry.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {inquiry.name}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(inquiry.status)}>
                          {inquiry.status}
                        </Badge>
                        {!inquiry.is_read && (
                          <Badge variant="default" size="sm">
                            New
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {inquiry.mobile}
                        </div>
                        {inquiry.email && (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {inquiry.email}
                          </div>
                        )}
                        {inquiry.city && (
                          <div className="flex items-center">
                            <span>{inquiry.city}</span>
                          </div>
                        )}
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Service Interest:</strong> {inquiry.service_interest}
                        </p>
                        <p className="text-sm text-gray-700">
                          {inquiry.message}
                        </p>
                      </div>

                      <div className="text-sm text-gray-500">
                        Received on {new Date(inquiry.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {!inquiry.is_read && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleMarkAsRead(inquiry.id)}
                          title="Mark as read"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {inquiry.status === 'New' && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleConvertToJobCard(inquiry)}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Convert
                        </Button>
                      )}
                      

                    </div>
                  </div>
                </div>
              ))}
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

export default Inquiries;