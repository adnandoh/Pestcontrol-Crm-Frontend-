import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Eye, 
  Edit2, 
  Trash2, 
  Share2, 
  CheckCircle,
  MoreVertical,
  Download,
  Send,
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { enhancedApiService } from '../services/api.enhanced';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { cn } from '../utils/cn';
import type { Quotation, QuotationStatus, QuotationFilters } from '../types';

const Quotations: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<QuotationFilters>({
    search: '',
    status: '',
    ordering: '-created_at'
  });

  const { data: quotationsData, isLoading, refetch } = useQuery({
    queryKey: ['quotations', filters],
    queryFn: () => enhancedApiService.getQuotations(filters),
  });

  const { data: stats } = useQuery({
    queryKey: ['quotation-stats'],
    queryFn: () => enhancedApiService.getQuotationStats(),
  });

  const convertMutation = useMutation({
    mutationFn: (id: number) => enhancedApiService.convertQuotationToBooking(id),
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotation-stats'] });
      queryClient.invalidateQueries({ queryKey: ['jobcards'] });
      alert(`Successfully converted to Booking: ${data.booking_code}`);
      navigate(`/jobcards`);
    },
    onError: (error: any) => {
      alert(`Error converting: ${error.message || 'Something went wrong'}`);
    }
  });

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'Draft': return <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">Draft</Badge>;
      case 'Sent': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Sent</Badge>;
      case 'Approved': return <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>;
      case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
      case 'Converted': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Converted</Badge>;
      case 'Expired': return <Badge className="bg-red-100 text-red-700 border-red-200">Expired</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const handleConvert = (id: number) => {
    if (window.confirm('Are you sure you want to convert this quotation into a live booking?')) {
      convertMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quotation Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create, manage and convert professional quotations</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="hidden md:flex gap-2 bg-white"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Link to="/quotations/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2 px-6">
              <Plus className="h-4 w-4" />
              New Quotation
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Quotations</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{stats?.total || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Pending (Sent)</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{stats?.pending || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Approved</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{stats?.approved || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Revenue Converted</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">₹{stats?.revenue?.toLocaleString() || 0}</h3>
            </div>
            <div className="h-12 w-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
              <ArrowRight className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="p-4 bg-white/80 backdrop-blur-sm border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by quotation no, customer name, mobile..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Approved">Approved</option>
              <option value="Converted">Converted</option>
              <option value="Rejected">Rejected</option>
              <option value="Expired">Expired</option>
            </select>

            <Button variant="outline" className="gap-2 rounded-xl text-gray-600">
              <Filter className="h-4 w-4" />
              Advanced
            </Button>
          </div>
        </div>
      </Card>

      {/* Quotations Table */}
      <Card className="overflow-hidden border-gray-100 shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Quotation</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4 h-16 bg-gray-50/50"></td>
                  </tr>
                ))
              ) : quotationsData?.results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                        <FileText className="h-10 w-10" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">No Quotations Found</h3>
                      <p className="text-gray-500 text-sm max-w-xs mt-1">Start by creating your first professional quotation for a customer.</p>
                      <Link to="/quotations/create" className="mt-4">
                        <Button className="bg-blue-600">Create Quotation</Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                quotationsData?.results.map((q: Quotation) => (
                  <tr key={q.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-blue-600">{q.quotation_no}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{format(new Date(q.created_at), 'dd MMM yyyy')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{q.customer_name}</span>
                        <span className="text-xs text-gray-500">{q.mobile}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-700">{q.quotation_type}</span>
                        {q.is_amc && (
                          <span className="text-[10px] text-orange-600 font-bold uppercase tracking-tighter">AMC Package</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-gray-900">₹{q.grand_total.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(q.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/quotations/preview/${q.id}`}>
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {q.status !== 'Converted' && (
                          <Link to={`/quotations/edit/${q.id}`}>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        {q.status === 'Approved' && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-8 bg-green-600 hover:bg-green-700 text-white rounded-lg gap-1.5 px-3"
                            onClick={() => handleConvert(q.id)}
                            disabled={convertMutation.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Convert</span>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-green-50 hover:text-green-600 hover:border-green-200">
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Quotations;
