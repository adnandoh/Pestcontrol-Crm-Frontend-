import React, { useEffect, useState } from 'react';
import { Calculator } from 'lucide-react';
import { enhancedApiService } from '../../services/api.enhanced';
import { notify } from '../../utils/notify';

const listify = (data: any) => (Array.isArray(data) ? data : data?.results || []);
const money = (v: unknown) => `₹${Number(v || 0).toLocaleString('en-IN')}`;

interface Props {
  jobId: number;
  status?: string;
}

const JobAccountsPanel: React.FC<Props> = ({ jobId, status }) => {
  const [snap, setSnap] = useState<any>(null);
  const [usages, setUsages] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [chemicalId, setChemicalId] = useState('');
  const [qty, setQty] = useState('');

  const load = async () => {
    try {
      const [costs, usageRows, chems] = await Promise.all([
        enhancedApiService.listBookingCosts({ jobcard: jobId, page_size: 5 }),
        enhancedApiService.listChemicalUsages({ jobcard: jobId }),
        enhancedApiService.listAccountsChemicals({ is_active: true }),
      ]);
      const match = listify(costs).find((r: any) => Number(r.booking_id || r.jobcard) === Number(jobId));
      setSnap(match || null);
      setUsages(listify(usageRows).filter((u: any) => Number(u.jobcard) === Number(jobId)));
      setChemicals(listify(chems));
    } catch {
      /* accounts may not be seeded yet */
    }
  };

  useEffect(() => {
    if (jobId) load();
  }, [jobId]);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-5 shadow-sm">
      <h4 className="mb-3 flex items-center gap-2 border-b border-emerald-100 pb-2 text-[13px] font-extrabold uppercase tracking-widest text-emerald-700">
        <Calculator className="h-4 w-4" /> Accounts — Cost & Profit
      </h4>

      {snap ? (
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg bg-white p-2 border">
            <p className="text-[9px] font-bold uppercase text-gray-400">Visit ₹</p>
            <p className="text-sm font-black">{money(snap.visit_revenue)}</p>
          </div>
          <div className="rounded-lg bg-white p-2 border">
            <p className="text-[9px] font-bold uppercase text-gray-400">Chemical</p>
            <p className="text-sm font-black">{money(snap.chemical_cost)}</p>
          </div>
          <div className="rounded-lg bg-white p-2 border">
            <p className="text-[9px] font-bold uppercase text-gray-400">Gross profit</p>
            <p className="text-sm font-black text-emerald-700">{money(snap.gross_profit)}</p>
          </div>
          <div className="rounded-lg bg-white p-2 border">
            <p className="text-[9px] font-bold uppercase text-gray-400">Company net</p>
            <p className="text-sm font-black text-purple-700">{money(snap.company_net_profit)}</p>
          </div>
        </div>
      ) : (
        <p className="mb-3 text-xs text-gray-500">
          {status === 'Done'
            ? 'No cost snapshot yet — add chemical usage or click recalculate.'
            : 'Profit snapshot appears after booking is marked Done.'}
        </p>
      )}

      <div className="mb-3">
        <p className="mb-1 text-[11px] font-bold text-gray-600">Chemical used on this booking</p>
        {usages.length === 0 ? (
          <p className="text-[11px] text-gray-400">None yet</p>
        ) : (
          <ul className="space-y-1 text-[11px]">
            {usages.map((u) => (
              <li key={u.id} className="flex justify-between rounded bg-white px-2 py-1 border">
                <span>{u.chemical_name} · {u.quantity_ml} ml</span>
                <span className="font-bold">{money(u.line_cost)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-lg border px-2 text-xs"
          value={chemicalId}
          onChange={(e) => setChemicalId(e.target.value)}
        >
          <option value="">Chemical</option>
          {chemicals.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          className="h-9 w-24 rounded-lg border px-2 text-xs"
          placeholder="ml"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <button
          type="button"
          className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white"
          onClick={async () => {
            try {
              await enhancedApiService.createChemicalUsage({
                jobcard_id: jobId,
                chemical_id: Number(chemicalId),
                quantity_ml: qty,
                source: 'crm',
              });
              notify.success('Chemical usage saved');
              setQty('');
              load();
            } catch (e) {
              notify.apiError(e, 'Chemical usage');
            }
          }}
        >
          Add usage
        </button>
        {status === 'Done' && (
          <button
            type="button"
            className="h-9 rounded-lg border px-3 text-xs font-bold"
            onClick={async () => {
              try {
                await enhancedApiService.recalculateBookingCost(jobId);
                notify.success('Profit recalculated');
                load();
              } catch (e) {
                notify.apiError(e, 'Recalculate');
              }
            }}
          >
            Recalculate profit
          </button>
        )}
      </div>
    </div>
  );
};

export default JobAccountsPanel;
