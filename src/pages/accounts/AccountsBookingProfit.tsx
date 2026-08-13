import React, { useEffect, useState } from 'react';
import { enhancedApiService } from '../../services/api.enhanced';
import { notify } from '../../utils/notify';

const listify = (data: any) => (Array.isArray(data) ? data : data?.results || []);
const money = (v: unknown) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const AccountsBookingProfit: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [usage, setUsage] = useState({ jobcard_id: '', chemical_id: '', quantity_ml: '' });

  const reload = async () => {
    try {
      const [costs, chems] = await Promise.all([
        enhancedApiService.listBookingCosts(),
        enhancedApiService.listAccountsChemicals(),
      ]);
      setRows(listify(costs));
      setChemicals(listify(chems));
    } catch (e) {
      notify.apiError(e, 'Booking profit');
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold uppercase">Booking Profit</h1>
          <p className="text-xs text-gray-500">Gross profit + company net profit per completed booking</p>
        </div>
        <button
          type="button"
          className="rounded-lg border px-3 py-1.5 text-xs font-bold"
          onClick={async () => {
            await enhancedApiService.allocateAccountsOverhead();
            notify.success('Overhead allocated');
            reload();
          }}
        >
          Allocate monthly overhead
        </button>
      </div>

      <section className="rounded-xl border bg-white p-3">
        <h2 className="mb-2 text-sm font-black">Add chemical usage to booking</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <input className="h-9 rounded-lg border px-2 text-sm" placeholder="Booking / Job ID" value={usage.jobcard_id} onChange={(e) => setUsage({ ...usage, jobcard_id: e.target.value })} />
          <select className="h-9 rounded-lg border text-sm" value={usage.chemical_id} onChange={(e) => setUsage({ ...usage, chemical_id: e.target.value })}>
            <option value="">Chemical</option>
            {chemicals.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="h-9 rounded-lg border px-2 text-sm" placeholder="Qty ml" value={usage.quantity_ml} onChange={(e) => setUsage({ ...usage, quantity_ml: e.target.value })} />
          <button
            type="button"
            className="rounded-lg bg-emerald-600 text-xs font-bold text-white"
            onClick={async () => {
              try {
                await enhancedApiService.createChemicalUsage({
                  jobcard_id: Number(usage.jobcard_id),
                  chemical_id: Number(usage.chemical_id),
                  quantity_ml: usage.quantity_ml,
                  source: 'crm',
                });
                notify.success('Usage saved — profit recalculated');
                reload();
              } catch (e) {
                notify.apiError(e, 'Chemical usage');
              }
            }}
          >
            Save usage
          </button>
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[1100px] text-left text-[11px]">
          <thead className="bg-gray-50 text-[9px] uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Booking</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2 text-right">Visit ₹</th>
              <th className="px-3 py-2 text-right">Chemical</th>
              <th className="px-3 py-2 text-right">Expenses</th>
              <th className="px-3 py-2 text-right">Tech cost</th>
              <th className="px-3 py-2 text-right">Overhead</th>
              <th className="px-3 py-2 text-right">Gross profit</th>
              <th className="px-3 py-2 text-right">Company net</th>
              <th className="px-3 py-2 text-right">Margin %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{row.booking_date}</td>
                <td className="px-3 py-2 font-bold text-blue-700">#{row.booking_id}</td>
                <td className="px-3 py-2">{row.customer_name || '—'}</td>
                <td className="px-3 py-2 text-right">{money(row.visit_revenue)}</td>
                <td className="px-3 py-2 text-right">{money(row.chemical_cost)}</td>
                <td className="px-3 py-2 text-right">{money(row.direct_expense_cost)}</td>
                <td className="px-3 py-2 text-right">{money(row.technician_cost)}</td>
                <td className="px-3 py-2 text-right">{money(row.overhead_cost)}</td>
                <td className="px-3 py-2 text-right font-black text-emerald-700">{money(row.gross_profit)}</td>
                <td className="px-3 py-2 text-right font-black text-purple-700">{money(row.company_net_profit)}</td>
                <td className="px-3 py-2 text-right">{row.gross_margin_percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default AccountsBookingProfit;
