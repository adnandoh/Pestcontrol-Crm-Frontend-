import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Boxes, Receipt, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import { notify } from '../../utils/notify';

const money = (v: unknown) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

const AccountsDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const dash = await enhancedApiService.getAccountsDashboard();
      setData(dash);
    } catch (e) {
      notify.apiError(e, 'Accounts dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const daily = data?.daily || {};
  const monthly = data?.monthly || {};

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-extrabold uppercase tracking-wide">Accounts Dashboard</h1>
          <p className="text-xs font-medium text-gray-500">Daily & monthly profit, stock health, alerts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              await enhancedApiService.rebuildAccountsPnL();
              await load();
              notify.success('P&L rebuilt');
            }}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
          >
            Rebuild P&L
          </button>
          <Link to="/accounts/inventory" className="rounded-lg border px-3 py-1.5 text-xs font-bold">Inventory</Link>
          <Link to="/accounts/expenses" className="rounded-lg border px-3 py-1.5 text-xs font-bold">Expenses</Link>
          <Link to="/accounts/booking-profit" className="rounded-lg border px-3 py-1.5 text-xs font-bold">Booking Profit</Link>
          <Link to="/accounts/alerts" className="rounded-lg border px-3 py-1.5 text-xs font-bold">Alerts</Link>
          <Link to="/accounts/reports" className="rounded-lg border px-3 py-1.5 text-xs font-bold">Reports</Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <section>
            <h2 className="mb-2 flex items-center gap-1 text-sm font-black text-gray-800">
              <BarChart3 className="h-4 w-4" /> Today
            </h2>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
              {[
                ['Collection / Sales', daily.sales],
                ['Expenses', daily.expenses],
                ['Gross Profit', daily.gross_profit],
                ['Company Net', daily.company_net_profit],
                ['Chemical Used ₹', daily.chemical_cogs],
                ['Avg Cost / Booking', daily.avg_cost_per_booking],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
                  <p className="text-base font-black text-gray-900">{money(value)}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-black text-gray-800">This month</h2>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
              {[
                ['Sales', monthly.sales],
                ['Expenses', monthly.expenses],
                ['Gross Profit', monthly.gross_profit],
                ['Company Net', monthly.company_net_profit],
                ['Inventory Value', monthly.inventory_value],
                ['Avg Profit / Booking', monthly.avg_profit_per_booking],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
                  <p className="text-base font-black text-gray-900">{money(value)}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-2 md:grid-cols-3">
            <div className="flex items-center gap-2 rounded-xl border bg-amber-50 p-3 text-sm font-bold text-amber-800">
              <Boxes className="h-4 w-4" /> Low stock items: {data?.low_stock_count ?? 0}
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-rose-50 p-3 text-sm font-bold text-rose-800">
              <AlertTriangle className="h-4 w-4" /> Unread alerts: {data?.unread_alerts ?? 0}
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-blue-50 p-3 text-sm font-bold text-blue-800">
              <Receipt className="h-4 w-4" /> Bookings (month): {monthly.booking_count ?? 0}
            </div>
          </div>
        </>
      )}

      <p className="flex items-start gap-1 text-[10px] text-gray-400">
        <FileSpreadsheet className="mt-0.5 h-3 w-3" />
        Gross profit = visit revenue − chemical − tech expenses − tech 40% − overhead.
        Company net = company 60% − chemical − tech expenses − overhead.
      </p>
    </div>
  );
};

export default AccountsDashboard;
