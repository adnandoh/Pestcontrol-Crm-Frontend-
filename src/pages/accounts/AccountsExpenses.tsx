import React, { useEffect, useState } from 'react';
import { enhancedApiService } from '../../services/api.enhanced';
import { notify } from '../../utils/notify';

const listify = (data: any) => (Array.isArray(data) ? data : data?.results || []);

const AccountsExpenses: React.FC = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    branch: '', category: '', amount: '', vendor_name: '', remarks: '', jobcard: '',
  });
  const [bill, setBill] = useState<File | null>(null);

  const reload = async () => {
    try {
      const [b, c, e] = await Promise.all([
        enhancedApiService.listAccountsBranches(),
        enhancedApiService.listExpenseCategories(),
        enhancedApiService.listExpenses(),
      ]);
      setBranches(listify(b));
      setCategories(listify(c));
      setRows(listify(e));
    } catch (err) {
      notify.apiError(err, 'Expenses');
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-extrabold uppercase">Expense Management</h1>

      <section className="rounded-xl border bg-white p-3">
        <h2 className="mb-2 text-sm font-black">New expense</h2>
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
          <select className="h-9 rounded-lg border text-sm" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
            <option value="">Branch</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="h-9 rounded-lg border text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.group} / {c.name}</option>)}
          </select>
          <input className="h-9 rounded-lg border px-2 text-sm" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className="h-9 rounded-lg border px-2 text-sm" placeholder="Vendor" value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} />
          <input className="h-9 rounded-lg border px-2 text-sm" placeholder="Booking ID (optional)" value={form.jobcard} onChange={(e) => setForm({ ...form, jobcard: e.target.value })} />
          <input type="file" accept="image/*,.pdf" className="h-9 text-xs" onChange={(e) => setBill(e.target.files?.[0] || null)} />
          <button
            type="button"
            className="rounded-lg bg-emerald-600 text-xs font-bold text-white"
            onClick={async () => {
              try {
                const fd = new FormData();
                fd.append('branch', String(form.branch));
                fd.append('category', String(form.category));
                fd.append('amount', form.amount);
                fd.append('vendor_name', form.vendor_name);
                fd.append('remarks', form.remarks);
                fd.append('status', 'posted');
                if (form.jobcard) fd.append('jobcard', form.jobcard);
                if (bill) fd.append('bill', bill);
                await enhancedApiService.saveExpense(fd);
                notify.success('Expense saved');
                setForm({ branch: '', category: '', amount: '', vendor_name: '', remarks: '', jobcard: '' });
                setBill(null);
                reload();
              } catch (err) {
                notify.apiError(err, 'Save expense');
              }
            }}
          >
            Save expense
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Vendor</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Booking</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.entry_date}</td>
                <td className="px-3 py-2">{row.branch_name}</td>
                <td className="px-3 py-2">{row.category_group} / {row.category_name}</td>
                <td className="px-3 py-2">{row.vendor_name || '—'}</td>
                <td className="px-3 py-2 text-right font-bold">₹{row.amount}</td>
                <td className="px-3 py-2">{row.jobcard ? `#${row.jobcard}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default AccountsExpenses;
