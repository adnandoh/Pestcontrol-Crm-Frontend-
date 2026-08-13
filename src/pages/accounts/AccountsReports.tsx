import React from 'react';
import { enhancedApiService } from '../../services/api.enhanced';
import { notify } from '../../utils/notify';

const REPORTS = [
  { id: 'booking_profit', label: 'Booking Profit Report' },
  { id: 'inventory', label: 'Inventory Report' },
  { id: 'movements', label: 'Stock Movement Report' },
  { id: 'expenses', label: 'Expense Report' },
  { id: 'monthly_pnl', label: 'Monthly Branch P&L' },
];

const AccountsReports: React.FC = () => {
  const download = async (report: string) => {
    try {
      const blob = await enhancedApiService.exportAccountsReport(report);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounts-${report}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify.apiError(e, 'Export');
    }
  };

  const printPdf = async (report: string) => {
    try {
      const blob = await enhancedApiService.exportAccountsReport(report);
      const text = await blob.text();
      const rows = text.trim().split('\n').map((line) => line.split(','));
      const html = `<!doctype html><html><head><title>${report}</title>
        <style>body{font-family:Arial,sans-serif;padding:16px} table{border-collapse:collapse;width:100%;font-size:11px}
        th,td{border:1px solid #ccc;padding:4px 6px;text-align:left} th{background:#f3f4f6}</style></head><body>
        <h2>Accounts — ${report}</h2>
        <table><thead><tr>${(rows[0] || []).map((c) => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
        <script>window.onload=()=>window.print()</script></body></html>`;
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(html);
      w.document.close();
    } catch (e) {
      notify.apiError(e, 'PDF print');
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-extrabold uppercase">Accounts Reports</h1>
      <p className="text-xs text-gray-500">CSV for Excel, or Print/PDF via browser print dialog.</p>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white px-4 py-5 shadow-sm">
            <p className="text-sm font-black">{r.label}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => download(r.id)} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white">CSV</button>
              <button type="button" onClick={() => printPdf(r.id)} className="rounded-lg border px-3 py-1.5 text-[10px] font-bold">Print / PDF</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountsReports;
