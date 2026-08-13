import React, { useEffect, useState } from 'react';
import { enhancedApiService } from '../../services/api.enhanced';
import { notify } from '../../utils/notify';

const listify = (data: any) => (Array.isArray(data) ? data : data?.results || []);

const AccountsInventory: React.FC = () => {
  const [branches, setBranches] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [chemName, setChemName] = useState('');
  const [equipName, setEquipName] = useState('');
  const [purchase, setPurchase] = useState({
    branch_id: '', chemical_id: '', quantity: '', unit_cost: '', supplier_id: '',
  });
  const [ops, setOps] = useState({
    branch_id: '', to_branch_id: '', chemical_id: '', quantity: '', quantity_delta: '',
  });

  const reload = async () => {
    try {
      const [b, c, eq, s, bal, mv, low, exp] = await Promise.all([
        enhancedApiService.listAccountsBranches(),
        enhancedApiService.listAccountsChemicals(),
        enhancedApiService.listAccountsEquipment(),
        enhancedApiService.listAccountsSuppliers(),
        enhancedApiService.listStockBalances(),
        enhancedApiService.listStockMovements(),
        enhancedApiService.listLowStock(),
        enhancedApiService.listExpiringLots(30),
      ]);
      setBranches(listify(b));
      setChemicals(listify(c));
      setEquipment(listify(eq));
      setSuppliers(listify(s));
      setBalances(listify(bal));
      setMovements(listify(mv));
      setLowStock(listify(low));
      setExpiring(listify(exp));
    } catch (e) {
      notify.apiError(e, 'Inventory');
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-extrabold uppercase">Inventory & Stock</h1>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border bg-white p-3">
          <h2 className="mb-2 text-sm font-black">Add chemical</h2>
          <div className="flex flex-wrap gap-2">
            <input value={chemName} onChange={(e) => setChemName(e.target.value)} placeholder="Chemical name" className="h-9 rounded-lg border px-2 text-sm" />
            <button type="button" className="rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white" onClick={async () => {
              if (!chemName.trim()) return;
              await enhancedApiService.saveAccountsChemical({ name: chemName.trim(), unit: 'ml', reorder_level: 100 });
              setChemName('');
              notify.success('Chemical saved');
              reload();
            }}>Save</button>
          </div>
        </section>
        <section className="rounded-xl border bg-white p-3">
          <h2 className="mb-2 text-sm font-black">Add equipment</h2>
          <div className="flex flex-wrap gap-2">
            <input value={equipName} onChange={(e) => setEquipName(e.target.value)} placeholder="Equipment name" className="h-9 rounded-lg border px-2 text-sm" />
            <button type="button" className="rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white" onClick={async () => {
              if (!equipName.trim()) return;
              await enhancedApiService.saveAccountsEquipment({ name: equipName.trim(), reorder_level: 1 });
              setEquipName('');
              notify.success('Equipment saved');
              reload();
            }}>Save</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {equipment.map((e) => <span key={e.id} className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-bold">{e.name}</span>)}
          </div>
        </section>
      </div>

      <section className="rounded-xl border bg-white p-3">
        <h2 className="mb-2 text-sm font-black">Purchase entry</h2>
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
          <select className="h-9 rounded-lg border text-sm" value={purchase.branch_id} onChange={(e) => setPurchase({ ...purchase, branch_id: e.target.value })}>
            <option value="">Branch</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="h-9 rounded-lg border text-sm" value={purchase.chemical_id} onChange={(e) => setPurchase({ ...purchase, chemical_id: e.target.value })}>
            <option value="">Chemical</option>
            {chemicals.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="h-9 rounded-lg border text-sm" value={purchase.supplier_id} onChange={(e) => setPurchase({ ...purchase, supplier_id: e.target.value })}>
            <option value="">Supplier (optional)</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="h-9 rounded-lg border px-2 text-sm" placeholder="Qty (ml)" value={purchase.quantity} onChange={(e) => setPurchase({ ...purchase, quantity: e.target.value })} />
          <input className="h-9 rounded-lg border px-2 text-sm" placeholder="Cost / unit" value={purchase.unit_cost} onChange={(e) => setPurchase({ ...purchase, unit_cost: e.target.value })} />
          <button type="button" className="rounded-lg bg-blue-600 text-xs font-bold text-white" onClick={async () => {
            try {
              await enhancedApiService.purchaseStock({
                branch_id: Number(purchase.branch_id),
                item_type: 'chemical',
                chemical_id: Number(purchase.chemical_id),
                supplier_id: purchase.supplier_id ? Number(purchase.supplier_id) : null,
                quantity: purchase.quantity,
                unit_cost: purchase.unit_cost,
              });
              notify.success('Purchase recorded');
              reload();
            } catch (e) {
              notify.apiError(e, 'Purchase');
            }
          }}>Record purchase</button>
        </div>
        <button type="button" className="mt-2 text-xs font-bold text-blue-700 underline" onClick={async () => {
          const name = window.prompt('Supplier name');
          if (!name) return;
          await enhancedApiService.saveAccountsSupplier({ name });
          reload();
        }}>+ Add supplier</button>
      </section>

      <section className="rounded-xl border bg-white p-3">
        <h2 className="mb-2 text-sm font-black">Issue / Adjust / Transfer / Return</h2>
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-6">
          <select className="h-9 rounded-lg border text-sm" value={ops.branch_id} onChange={(e) => setOps({ ...ops, branch_id: e.target.value })}>
            <option value="">From branch</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="h-9 rounded-lg border text-sm" value={ops.to_branch_id} onChange={(e) => setOps({ ...ops, to_branch_id: e.target.value })}>
            <option value="">To branch (transfer)</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="h-9 rounded-lg border text-sm" value={ops.chemical_id} onChange={(e) => setOps({ ...ops, chemical_id: e.target.value })}>
            <option value="">Chemical</option>
            {chemicals.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="h-9 rounded-lg border px-2 text-sm" placeholder="Qty" value={ops.quantity} onChange={(e) => setOps({ ...ops, quantity: e.target.value })} />
          <input className="h-9 rounded-lg border px-2 text-sm" placeholder="Adjust +/- qty" value={ops.quantity_delta} onChange={(e) => setOps({ ...ops, quantity_delta: e.target.value })} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-bold" onClick={async () => {
            try {
              await enhancedApiService.issueStock({ branch_id: Number(ops.branch_id), chemical_id: Number(ops.chemical_id), quantity: ops.quantity });
              notify.success('Issued');
              reload();
            } catch (e) { notify.apiError(e, 'Issue'); }
          }}>Issue to tech</button>
          <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-bold" onClick={async () => {
            try {
              await enhancedApiService.adjustStock({
                branch_id: Number(ops.branch_id), item_type: 'chemical', chemical_id: Number(ops.chemical_id), quantity_delta: ops.quantity_delta,
              });
              notify.success('Adjusted');
              reload();
            } catch (e) { notify.apiError(e, 'Adjust'); }
          }}>Adjust stock</button>
          <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-bold" onClick={async () => {
            try {
              await enhancedApiService.transferStock({
                from_branch_id: Number(ops.branch_id), to_branch_id: Number(ops.to_branch_id),
                item_type: 'chemical', chemical_id: Number(ops.chemical_id), quantity: ops.quantity,
              });
              notify.success('Transferred');
              reload();
            } catch (e) { notify.apiError(e, 'Transfer'); }
          }}>Branch transfer</button>
          <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-bold" onClick={async () => {
            try {
              await enhancedApiService.purchaseReturnStock({
                branch_id: Number(ops.branch_id), item_type: 'chemical', chemical_id: Number(ops.chemical_id), quantity: ops.quantity,
              });
              notify.success('Purchase return');
              reload();
            } catch (e) { notify.apiError(e, 'Purchase return'); }
          }}>Purchase return</button>
          <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-bold" onClick={async () => {
            try {
              await enhancedApiService.stockReturn({
                branch_id: Number(ops.branch_id), chemical_id: Number(ops.chemical_id), quantity: ops.quantity,
              });
              notify.success('Stock return');
              reload();
            } catch (e) { notify.apiError(e, 'Return'); }
          }}>Chemical return</button>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
          <h2 className="mb-2 text-sm font-black text-rose-800">Low stock ({lowStock.length})</h2>
          {lowStock.length === 0 ? <p className="text-xs text-gray-500">None</p> : lowStock.map((r) => (
            <p key={r.id} className="text-xs font-semibold">{r.branch_name}: {r.chemical_name || r.equipment_name} = {r.quantity}</p>
          ))}
        </section>
        <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
          <h2 className="mb-2 text-sm font-black text-amber-800">Expiring in 30 days ({expiring.length})</h2>
          {expiring.length === 0 ? <p className="text-xs text-gray-500">None</p> : expiring.map((r) => (
            <p key={r.id} className="text-xs font-semibold">{r.chemical_name} · {r.expiry_date} · qty {r.qty_remaining}</p>
          ))}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border bg-white">
        <h2 className="border-b px-3 py-2 text-sm font-black">Stock balances</h2>
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Reorder</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.branch_name}</td>
                <td className="px-3 py-2 font-semibold">{row.chemical_name || row.equipment_name}</td>
                <td className="px-3 py-2 text-right">{row.quantity}</td>
                <td className="px-3 py-2 text-right">{row.reorder_level}</td>
                <td className="px-3 py-2">
                  {row.is_low ? <span className="rounded bg-rose-50 px-1.5 py-0.5 font-bold text-rose-700">Low</span> : <span className="text-emerald-700">OK</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white">
        <h2 className="border-b px-3 py-2 text-sm font-black">Stock movement history</h2>
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {movements.slice(0, 50).map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-3 py-2">{row.movement_date}</td>
                <td className="px-3 py-2">{row.movement_type}</td>
                <td className="px-3 py-2">{row.branch_name}</td>
                <td className="px-3 py-2">{row.chemical_name}</td>
                <td className="px-3 py-2 text-right">{row.quantity}</td>
                <td className="px-3 py-2 text-right">₹{row.line_cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default AccountsInventory;
