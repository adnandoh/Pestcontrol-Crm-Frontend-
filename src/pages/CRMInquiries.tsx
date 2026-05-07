import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  Zap,
  MessageCircle
} from 'lucide-react';
import { 
  Button, 
  Pagination
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { cn } from '../utils/cn';
import type { CRMInquiry, CRMInquiryStatus } from '../types';
import CreateCRMInquiryModal from '../components/crm/CreateCRMInquiryModal';

const CRMInquiries: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [inquiries, setInquiries] = useState<CRMInquiry[]>([]);
  
  const pestTypesList = [
    'Cockroach', 'Ants', 'Mosquito', 'Spiders', 'Flies', 'Silverfish', 
    'Moths', 'Beetles', 'Centipedes', 'Millipedes', 'Earwigs', 'Crickets',
    'Bed Bug', 'Rodent', 'Fleas', 'Ticks', 'Mites', 'Termite', 
    'Wood Borer', 'Aphids', 'Thrips', 'Scale Insects', 'Whiteflies', 
    'Caterpillars', 'Slugs', 'Snails', 'Other'
  ];

  const [pagination, setPagination] = useState({
    count: 0,
    current: 1,
    pageSize: 10
  });

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    pest_type: '',
    date: ''
  });

  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadInquiries = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pagination.pageSize,
        search: filters.search,
        status: filters.status,
        pest_type: filters.pest_type,
        inquiry_date: filters.date,
        ordering: '-created_at'
      };
      
      const response = await enhancedApiService.getCRMInquiries(params);
      setInquiries(response.results);
      setPagination(prev => ({ ...prev, count: response.count, current: page }));
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries(1);
  }, [filters.status, filters.pest_type, filters.date]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadInquiries(1);
  };



  const handleStatusChange = async (id: number, newStatus: CRMInquiryStatus) => {
    try {
      setSubmitting(id);
      await enhancedApiService.updateCRMInquiry(id, { status: newStatus });
      setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq));
    } catch (err) {
      console.error('Status update failed:', err);
    } finally {
      setSubmitting(null);
    }
  };

  const handleConvert = async (id: number) => {
    if (!window.confirm('Are you sure you want to convert this inquiry into a booking?')) return;
    
    try {
      setSubmitting(id);
      const result = await enhancedApiService.convertInquiryToBooking(id);
      alert(`Successfully converted! Code: ${result.job_card_code}`);
      loadInquiries(pagination.current);
    } catch (err: any) {
      alert(err.message || 'Conversion failed');
    } finally {
      setSubmitting(null);
    }
  };

  const statusColors: Record<CRMInquiryStatus, string> = {
    'New': 'bg-blue-50 text-blue-700 ring-blue-600/20',
    'Contacted': 'bg-amber-50 text-amber-700 ring-amber-600/20',
    'Converted': 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    'Closed': 'bg-gray-100 text-gray-700 ring-gray-600/20'
  };

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full">
      {/* 1. Header Area */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">View Inquiries</h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            Total {pagination.count} Manual Leads
          </span>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-700 hover:bg-blue-800 h-8 text-[11px] font-extrabold shadow-lg px-6 uppercase tracking-wider"
        >
          <Plus className="h-4 w-4 mr-1" /> Create Inquiry
        </Button>
      </div>

      {/* 2. Filter Bar - High Density */}
      <div className="bg-white p-3 border border-gray-200 shadow-xs flex flex-wrap lg:flex-nowrap items-end gap-3 rounded">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Search Inquiry</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Name, Phone, Location..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-8 pr-4 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition-all h-8 font-semibold"
            />
          </div>
        </div>

        <div className="w-32">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700 uppercase"
          >
            <option value="">Status</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Converted">Converted</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="w-40">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Pest Type</label>
          <select
            value={filters.pest_type}
            onChange={(e) => setFilters({ ...filters, pest_type: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white cursor-pointer font-bold text-gray-700"
          >
            <option value="">All Pests</option>
            {pestTypesList.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="w-36">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Date</label>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded h-8 outline-none bg-white font-bold text-gray-700"
          />
        </div>

        <div className="flex gap-1 h-8">
           <button type="button" onClick={() => setFilters({ search: '', status: '', pest_type: '', date: '' })} className="px-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded transition-colors uppercase">Clear</button>
           <button onClick={handleSearch} className="px-3 bg-blue-800 hover:bg-blue-900 text-white text-[11px] font-bold rounded transition-colors uppercase">Search</button>
        </div>
      </div>

      {/* 3. Table Results */}
      <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full table-auto border-collapse text-[11px]">
            <thead className="bg-[#f8f9fa] sticky top-0 z-10 border-b border-gray-200 text-gray-600 uppercase">
              <tr className="divide-x divide-gray-200">
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-12">ID</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-48">Customer Info</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-64">Location</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-32">Pest Type</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-40">Remark</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic w-32">Status</th>
                <th className="px-3 py-2 text-center font-extrabold tracking-tight italic w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : inquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-gray-400 font-semibold uppercase italic text-sm tracking-tight opacity-70">No inquiries found. Create your first lead now!</td>
                </tr>
              ) : inquiries.map((inq) => (
                <tr key={inq.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-4 py-3 text-xs font-extrabold text-gray-400">{inq.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold text-gray-800 leading-tight uppercase tracking-tighter truncate">{inq.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-bold text-blue-600 flex items-center gap-1">
                          {inq.mobile}
                        </span>
                        <a 
                          href={`https://wa.me/91${inq.mobile}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="hover:scale-110 transition-transform"
                        >
                          <MessageCircle className="h-3 w-3 text-green-500 fill-green-50" />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2 max-w-[240px]">
                      <MapPin className="h-3 w-3 text-gray-400 mt-0.5 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-gray-600 leading-tight line-clamp-2">{inq.location || 'No location provided'}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Pune, MAHARASHTRA</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-tighter italic">{inq.pest_type}</span>
                      <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 mt-0.5">
                        <Calendar className="h-2.5 w-2.5" /> {new Date(inq.inquiry_date).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <p className="text-[11px] text-gray-500 line-clamp-1 italic font-semibold leading-normal" title={inq.remark}>{inq.remark || '--'}</p>
                      {inq.reminder_date && !inq.is_reminder_done && (
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 rounded shadow-xs border uppercase",
                              new Date(inq.reminder_date).toDateString() === new Date().toDateString() ? "bg-red-500 text-white border-red-600" : "bg-orange-50 text-orange-700 border-orange-200"
                            )}>
                              Follow-up: {new Date(inq.reminder_date).toLocaleDateString('en-GB')}
                              {inq.reminder_time && ` @ ${inq.reminder_time}`}
                            </span>
                          </div>
                          {inq.reminder_note && (
                            <p className="text-[9px] font-bold text-orange-600 bg-orange-50/50 px-1.5 py-0.5 rounded border border-orange-100 max-w-fit italic">
                              Note: {inq.reminder_note}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={inq.status}
                      onChange={(e) => handleStatusChange(inq.id, e.target.value as CRMInquiryStatus)}
                      disabled={submitting === inq.id}
                      className={cn(
                        "w-full h-6 px-1.5 rounded-full text-[9px] font-extrabold uppercase text-center outline-none ring-1 ring-inset transition-all cursor-pointer",
                        statusColors[inq.status]
                      )}
                    >
                      <option value="New">New Lead</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Converted">Converted</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {inq.status !== 'Converted' && (
                        <button 
                          onClick={() => handleConvert(inq.id)}
                          disabled={submitting === inq.id}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Convert to Booking"
                        >
                          <Zap className="h-3.5 w-3.5 fill-emerald-50" />
                        </button>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <Pagination
            currentPage={pagination.current}
            totalPages={Math.ceil(pagination.count / pagination.pageSize)}
            totalItems={pagination.count}
            itemsPerPage={pagination.pageSize}
            onPageChange={loadInquiries}
          />
        </div>
      </div>

      <CreateCRMInquiryModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => loadInquiries(1)}
      />


    </div>
  );
};

export default CRMInquiries;
