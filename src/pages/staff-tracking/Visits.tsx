import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, RefreshCw } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import { cn } from '../../utils/cn';
import type { FieldVisit } from '../../types';

const statusColors: Record<string, string> = {
  scheduled: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  missed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

const VisitsPage: React.FC = () => {
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await enhancedApiService.getStaffTrackingVisits({
        status: statusFilter || undefined,
        date: dateFilter || undefined,
      });
      setVisits(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-indigo-600" /> Visit Management
          </h1>
          <p className="text-sm text-gray-500 font-bold italic">Client visits linked to JobCards</p>
        </div>
        <button onClick={load} className="p-2 bg-white border rounded-lg"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button>
      </div>
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="missed">Missed</option>
        </select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visits.map((v) => (
          <div key={v.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex justify-between gap-2 mb-2">
              <h3 className="font-bold text-gray-900">{v.title}</h3>
              <span className={cn('text-xs font-bold px-2 py-1 rounded-full capitalize', statusColors[v.status] || statusColors.scheduled)}>{v.status.replace('_', ' ')}</span>
            </div>
            <p className="text-sm font-semibold text-gray-700">{v.staff_name}</p>
            <p className="text-xs text-gray-500 mt-1">{v.client_name || '—'}</p>
            <p className="text-xs text-gray-500 truncate">{v.address || 'No address'}</p>
            <p className="text-xs text-gray-400 mt-2">{new Date(v.scheduled_at).toLocaleString()}</p>
            {v.job_code && <p className="text-xs font-mono text-indigo-600 mt-1">{v.job_code}</p>}
          </div>
        ))}
        {!loading && visits.length === 0 && <p className="text-gray-500 col-span-full text-center py-8">No visits found.</p>}
      </div>
    </div>
  );
};

export default VisitsPage;
