import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import { cn } from '../../utils/cn';
import type { LeaveApplication } from '../../types';

const LeavePage: React.FC = () => {
  const [apps, setApps] = useState<LeaveApplication[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setApps(await enhancedApiService.getStaffTrackingLeaveApplications({ status: filter || undefined }));
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const review = async (id: number, approved: boolean) => {
    await enhancedApiService.reviewStaffTrackingLeave(id, { approved, comment: approved ? 'Approved' : 'Rejected' });
    load();
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between border-b pb-4">
        <h1 className="text-2xl font-black flex items-center gap-2"><Calendar className="text-indigo-600" /> Leave Management</h1>
        <button onClick={load} className="p-2 border rounded-lg"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button>
      </div>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
        <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="">All</option>
      </select>
      <div className="space-y-3">
        {apps.map((a) => (
          <div key={a.id} className="border rounded-xl bg-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="font-bold">{a.staff_name} — {a.leave_type_name}</p>
              <p className="text-sm text-gray-600">{a.start_date} → {a.end_date} ({a.days_count} days)</p>
              <p className="text-sm italic text-gray-500">{a.reason}</p>
              <span className="text-xs font-bold uppercase text-indigo-600">{a.status}</span>
            </div>
            {a.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => review(a.id, true)} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg">Approve</button>
                <button onClick={() => review(a.id, false)} className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-lg">Reject</button>
              </div>
            )}
          </div>
        ))}
        {!loading && apps.length === 0 && <p className="text-center text-gray-500 py-8">No leave applications.</p>}
      </div>
    </div>
  );
};

export default LeavePage;
