import React, { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, Wallet } from 'lucide-react';
import { Button, Input, PageLoading } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import type { SettlementCadence, TechnicianSettlement } from '../types';
import { useRevenueModelV2 } from '../hooks/useRevenueModelV2';
import {
  defaultPeriodForCadence,
  settlementStatusLabel,
} from '../utils/settlementPeriods';
import { showAlert } from '../utils/notify';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const Settlements: React.FC = () => {
  const revenueEnabled = useRevenueModelV2();
  const [cadence, setCadence] = useState<SettlementCadence>('weekly');
  const defaults = defaultPeriodForCadence(cadence);
  const [periodStart, setPeriodStart] = useState(defaults.start);
  const [periodEnd, setPeriodEnd] = useState(defaults.end);
  const [statusFilter, setStatusFilter] = useState('');
  const [settlements, setSettlements] = useState<TechnicianSettlement[]>([]);
  const [selected, setSelected] = useState<TechnicianSettlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await enhancedApiService.getSettlements({
        page_size: 100,
        status: statusFilter || undefined,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
      });
      const rows = Array.isArray(data) ? data : data.results || [];
      setSettlements(rows);
    } catch (err) {
      console.error(err);
      showAlert('Failed to load settlements');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, periodStart, periodEnd]);

  useEffect(() => {
    if (revenueEnabled) load();
    else setLoading(false);
  }, [load, revenueEnabled]);

  useEffect(() => {
    const period = defaultPeriodForCadence(cadence);
    setPeriodStart(period.start);
    setPeriodEnd(period.end);
  }, [cadence]);

  const build = async () => {
    setBusy(true);
    try {
      const result = await enhancedApiService.buildSettlements({
        period_start: periodStart,
        period_end: periodEnd,
        cadence,
      });
      showAlert(
        result.count
          ? `Built ${result.count} settlement(s)`
          : 'No approved earnings in this period (or already settled)',
      );
      await load();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      showAlert(apiErr.message || 'Build failed');
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (id: number) => {
    try {
      const detail = await enhancedApiService.getSettlement(id);
      setSelected(detail);
    } catch {
      showAlert('Failed to load settlement detail');
    }
  };

  const runAction = async (action: 'approve' | 'paid' | 'cancel') => {
    if (!selected) return;
    setBusy(true);
    try {
      let updated: TechnicianSettlement;
      if (action === 'approve') updated = await enhancedApiService.approveSettlement(selected.id);
      else if (action === 'paid') updated = await enhancedApiService.markSettlementPaid(selected.id);
      else updated = await enhancedApiService.cancelSettlement(selected.id);
      setSelected(updated);
      await load();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      showAlert(apiErr.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const exportExcel = async () => {
    setBusy(true);
    try {
      const blob = await enhancedApiService.downloadSettlementsExcel({
        status: statusFilter || undefined,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
      });
      downloadBlob(blob, `settlements_${periodStart}_${periodEnd}.xlsx`);
    } catch {
      showAlert('Excel export failed');
    } finally {
      setBusy(false);
    }
  };

  const exportRevenueReport = async () => {
    setBusy(true);
    try {
      const blob = await enhancedApiService.downloadRevenueSharingReport({
        from: periodStart,
        to: periodEnd,
      });
      downloadBlob(blob, `revenue_sharing_${periodStart}_${periodEnd}.xlsx`);
    } catch {
      showAlert('Revenue report export failed');
    } finally {
      setBusy(false);
    }
  };

  if (!revenueEnabled) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-lg font-extrabold uppercase tracking-wide mb-2">Settlements</h1>
          <p className="text-sm font-semibold">
            Enable <code>REVENUE_MODEL_V2</code> on the backend (or set{' '}
            <code>VITE_REVENUE_MODEL_V2=true</code>) to use settlement batches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-1 sm:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-700" />
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">
            Settlements
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy}
            onClick={exportExcel}
            className="h-8 text-[11px] font-extrabold uppercase bg-white text-emerald-800 border border-emerald-600 hover:bg-emerald-50"
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Export settlements
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={exportRevenueReport}
            className="h-8 text-[11px] font-extrabold uppercase bg-white text-blue-800 border border-blue-600 hover:bg-blue-50"
          >
            <Download className="h-3.5 w-3.5 mr-1" /> Revenue sharing Excel
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <h2 className="text-[12px] font-extrabold text-emerald-800 uppercase tracking-widest">
          Build period batch
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Cadence</label>
            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value as SettlementCadence)}
              className="w-full h-9 text-sm border rounded-lg px-2"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">From</label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">To</label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="h-9" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Status filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 text-sm border rounded-lg px-2"
            >
              <option value="">All</option>
              <option value="pending_approval">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <Button
            type="button"
            disabled={busy}
            onClick={build}
            className="h-9 bg-emerald-700 hover:bg-emerald-800 text-[11px] font-extrabold uppercase"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Build settlements
          </Button>
        </div>
        <p className="text-[10px] text-gray-500 font-semibold">
          Pulls approved Partner earnings in the period that are not already on a settlement. Legacy
          jobs are excluded.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <PageLoading />
          ) : (
            <div className="overflow-x-auto max-h-[640px]">
              <table className="w-full text-[11px] border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left uppercase text-gray-500">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Technician</th>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Net</th>
                    <th className="px-3 py-2">Lines</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-gray-400 font-bold uppercase">
                        No settlements yet
                      </td>
                    </tr>
                  ) : (
                    settlements.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => openDetail(s.id)}
                        className={`border-t border-gray-100 cursor-pointer hover:bg-emerald-50/40 ${
                          selected?.id === s.id ? 'bg-emerald-50' : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-bold">#{s.id}</td>
                        <td className="px-3 py-2 font-bold">
                          {s.technician_name}
                          <div className="text-[9px] text-gray-400">{s.technician_mobile}</div>
                        </td>
                        <td className="px-3 py-2">
                          {s.period_start} → {s.period_end}
                          <div className="text-[9px] uppercase text-gray-400">{s.cadence}</div>
                        </td>
                        <td className="px-3 py-2 font-bold">{settlementStatusLabel(s.status)}</td>
                        <td className="px-3 py-2 font-extrabold text-emerald-800">
                          ₹{Number(s.net_amount).toFixed(2)}
                        </td>
                        <td className="px-3 py-2">{s.line_count ?? s.line_items?.length ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 shadow-sm min-h-[320px]">
          {!selected ? (
            <p className="text-xs text-gray-400 font-bold uppercase text-center py-16">
              Select a settlement to view lines
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold uppercase text-gray-800">
                    Settlement #{selected.id}
                  </h3>
                  <p className="text-[11px] font-bold text-gray-500">
                    {selected.technician_name} · {settlementStatusLabel(selected.status)}
                  </p>
                </div>
                <div className="text-right text-[11px] font-extrabold text-emerald-800">
                  Net ₹{Number(selected.net_amount).toFixed(2)}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={busy || !['draft', 'pending_approval'].includes(selected.status)}
                  onClick={() => runAction('approve')}
                  className="h-8 text-[10px] font-extrabold uppercase bg-emerald-700"
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  disabled={busy || selected.status !== 'approved'}
                  onClick={() => runAction('paid')}
                  className="h-8 text-[10px] font-extrabold uppercase bg-blue-700"
                >
                  Mark paid
                </Button>
                <Button
                  type="button"
                  disabled={busy || selected.status === 'paid' || selected.status === 'cancelled'}
                  onClick={() => runAction('cancel')}
                  className="h-8 text-[10px] font-extrabold uppercase bg-white text-red-700 border border-red-500 hover:bg-red-50"
                >
                  Cancel
                </Button>
              </div>

              <div className="overflow-x-auto max-h-[420px] border border-gray-100 rounded-lg">
                <table className="w-full text-[10px]">
                  <thead className="bg-gray-50 uppercase text-gray-500">
                    <tr>
                      <th className="px-2 py-1.5 text-left">Job</th>
                      <th className="px-2 py-1.5 text-left">Type</th>
                      <th className="px-2 py-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.line_items || []).map((line) => (
                      <tr key={line.id} className="border-t border-gray-100">
                        <td className="px-2 py-1.5 font-bold">{line.job_code || line.job}</td>
                        <td className="px-2 py-1.5 uppercase">{line.earning_type}</td>
                        <td className="px-2 py-1.5 text-right font-extrabold">
                          ₹{Number(line.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settlements;
