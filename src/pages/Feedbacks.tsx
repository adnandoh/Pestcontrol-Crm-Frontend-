import React, { useState, useEffect } from 'react';
import { Star, Search, User, TrendingUp } from 'lucide-react';
import { Button, Pagination } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import type { Feedback, TechnicianPerformance } from '../types';
import dayjs from 'dayjs';

const Feedbacks: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [performance, setPerformance] = useState<TechnicianPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    count: 0,
    current: 1,
    pageSize: 10,
    totalPages: 1
  });

  const [filters, setFilters] = useState({
    rating: '',
    feedback_type: '',
    search: ''
  });

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const [feedbackRes, perfRes] = await Promise.all([
        enhancedApiService.getFeedbacks({ 
          page, 
          page_size: 10,
          rating: filters.rating,
          feedback_type: filters.feedback_type,
          search: filters.search
        }),
        enhancedApiService.getTechnicianPerformance()
      ]);

      setFeedbacks(feedbackRes.results);
      setPerformance(perfRes.technicians || []);
      setPagination(prev => ({
        ...prev,
        count: feedbackRes.count,
        current: page,
        totalPages: Math.max(1, Math.ceil(feedbackRes.count / 10))
      }));
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [filters.rating, filters.feedback_type]);

  const handleSearch = () => loadData(1);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Customer Feedbacks</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 italic">Monitoring Service Quality & Technician Performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performance.map((tech) => (
          <div key={tech.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-600">
                <User className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-black text-yellow-700">{tech.avg_rating}</span>
              </div>
            </div>
            <h3 className="text-sm font-black text-gray-900 uppercase truncate">{tech.name}</h3>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Reviews</span>
              <span className="text-xs font-black text-gray-700">{tech.feedback_count}</span>
            </div>
            <div className="mt-3 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${(tech.avg_rating / 5) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {performance.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-400 uppercase">No performance data available yet</p>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, Customer..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
          />
        </div>

        <select
          value={filters.rating}
          onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg outline-none font-bold bg-white"
        >
          <option value="">All Ratings</option>
          <option value="5">⭐ 5 Stars</option>
          <option value="4">⭐ 4 Stars</option>
          <option value="3">⭐ 3 Stars</option>
          <option value="2">⭐ 2 Stars</option>
          <option value="1">⭐ 1 Star</option>
        </select>

        <select
          value={filters.feedback_type}
          onChange={(e) => setFilters({ ...filters, feedback_type: e.target.value })}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg outline-none font-bold bg-white"
        >
          <option value="">All Sources</option>
          <option value="Manual">Manual Entry</option>
          <option value="WhatsApp Link">WhatsApp Link</option>
        </select>

        <Button variant="outline" onClick={() => setFilters({ rating: '', feedback_type: '', search: '' })}>Clear</Button>
      </div>

      {/* Feedbacks Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Booking</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Technician</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Rating</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Remark</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Source</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs font-bold text-gray-400 uppercase italic">
                    No feedbacks found matching your filters
                  </td>
                </tr>
              ) : (
                feedbacks.map((fb) => (
                  <tr key={fb.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">#{fb.booking_code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 uppercase">{fb.client_name}</span>
                        <span className="text-[10px] text-gray-400 font-bold">{fb.service_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800 uppercase">{fb.technician_name}</span>
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${
                          fb.technician_behavior === 'excellent' ? 'text-emerald-600' :
                          fb.technician_behavior === 'good' ? 'text-blue-600' :
                          fb.technician_behavior === 'average' ? 'text-amber-600' : 'text-red-600'
                        }`}>Behavior: {fb.technician_behavior}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3 w-3 ${s <= fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-medium text-gray-600 max-w-[200px] truncate" title={fb.remark}>
                        {fb.remark || <span className="italic opacity-50">No remark</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                        fb.feedback_type === 'Manual' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {fb.feedback_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-500">{dayjs(fb.created_at).format('DD MMM YYYY')}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Showing {feedbacks.length} Feedbacks</span>
          <Pagination
            currentPage={pagination.current}
            totalPages={pagination.totalPages}
            totalItems={pagination.count}
            itemsPerPage={pagination.pageSize}
            onPageChange={loadData}
          />
        </div>
      </div>
    </div>
  );
};

export default Feedbacks;
