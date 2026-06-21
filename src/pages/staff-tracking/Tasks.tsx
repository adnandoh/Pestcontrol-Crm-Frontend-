import React, { useCallback, useEffect, useState } from 'react';
import { CheckSquare, RefreshCw } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import { cn } from '../../utils/cn';
import type { StaffTask } from '../../types';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setTasks(await enhancedApiService.getStaffTrackingTasks({ status: statusFilter || undefined }));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const createTask = async () => {
    if (!form.title || !form.assigned_to) return;
    await enhancedApiService.createStaffTrackingTask({
      title: form.title,
      description: form.description,
      assigned_to: Number(form.assigned_to),
      priority: form.priority,
    });
    setForm({ title: '', description: '', assigned_to: '', priority: 'medium' });
    load();
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-black flex items-center gap-2"><CheckSquare className="text-indigo-600" /> Task Management</h1>
        <button onClick={load} className="p-2 border rounded-lg"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /></button>
      </div>
      <div className="bg-white border rounded-xl p-4 grid md:grid-cols-2 gap-3">
        <input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Assign to profile ID" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
        <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded-lg px-3 py-2 text-sm md:col-span-2" />
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
        <button onClick={createTask} className="bg-blue-600 text-white font-bold rounded-lg px-4 py-2 text-sm">Create task</button>
      </div>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
        <option value="">All</option>
        <option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="overdue">Overdue</option>
      </select>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs font-black uppercase text-gray-500"><tr>
            <th className="px-4 py-3 text-left">Task</th><th className="px-4 py-3">Assignee</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Due</th>
          </tr></thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-t"><td className="px-4 py-3 font-bold">{t.title}</td><td className="px-4 py-3">{t.assignee_name}</td><td className="px-4 py-3 capitalize">{t.priority}</td><td className="px-4 py-3 capitalize">{t.status.replace('_', ' ')}</td><td className="px-4 py-3">{t.due_at ? new Date(t.due_at).toLocaleDateString() : '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TasksPage;
