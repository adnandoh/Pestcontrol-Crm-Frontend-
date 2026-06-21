import React, { useCallback, useEffect, useState } from 'react';
import { Receipt, RefreshCw } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import { cn } from '../../utils/cn';
import type { ExpenseClaim } from '../../types';

const ExpensesPage: React.FC = () => {
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setClaims(await enhancedApiService.getStaffTrackingExpenses({ status: filter || undefined }));
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const review = async (id: number, approved: boolean) => {
    await enhancedApiService.reviewStaffTrackingExpense(id, { approved, comment: approved ? 'Approved' : 'Rejected' });
    load();
  };

  const pendingTotal = claims.filter((c) => c.status === 'pending').reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Receipt className="text-indigo-600" /> Expense Management</h1>
          <p className="text-sm text-gray-500">Pending total: ₹{pendingTotal.toFixed(2)}</p>
        </div>
        <button onClick={load} className="p-2 border rounded-lg"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button>
      </div>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
        <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="">All</option>
      </select>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs font-black uppercase text-gray-500"><tr>
            <th className="px-4 py-3 text-left">Staff</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3 font-bold">{c.staff_name}</td>
                <td className="px-4 py-3">{c.category_name}</td>
                <td className="px-4 py-3">{c.expense_date}</td>
                <td className="px-4 py-3">₹{Number(c.amount).toFixed(2)}</td>
                <td className="px-4 py-3 capitalize">{c.status}</td>
                <td className="px-4 py-3">
                  {c.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => review(c.id, true)} className="text-green-600 font-bold text-xs">Approve</button>
                      <button onClick={() => review(c.id, false)} className="text-red-600 font-bold text-xs">Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpensesPage;
