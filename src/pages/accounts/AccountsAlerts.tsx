import React, { useEffect, useState } from 'react';
import { enhancedApiService } from '../../services/api.enhanced';
import { notify } from '../../utils/notify';

const listify = (data: any) => (Array.isArray(data) ? data : data?.results || []);

const AccountsAlerts: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);

  const reload = async () => {
    try {
      setRows(listify(await enhancedApiService.listAccountsAlerts({ is_resolved: false })));
    } catch (e) {
      notify.apiError(e, 'Alerts');
    }
  };

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-extrabold uppercase">Accounts Alerts</h1>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
          onClick={async () => {
            await enhancedApiService.runAccountsAlerts();
            notify.success('Alerts refreshed');
            reload();
          }}
        >
          Run alerts now
        </button>
      </div>
      <ul className="divide-y rounded-xl border bg-white">
        {rows.length === 0 && <li className="p-4 text-sm text-gray-500">No open alerts</li>}
        {rows.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 px-3 py-3">
            <div>
              <p className="text-xs font-black text-gray-900">{row.title}</p>
              <p className="text-[11px] text-gray-600">{row.message}</p>
              <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">
                {row.alert_type} · {row.severity} · {row.branch_name || 'All'}
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded border px-2 py-1 text-[10px] font-bold"
              onClick={async () => {
                await enhancedApiService.resolveAccountsAlert(row.id);
                reload();
              }}
            >
              Resolve
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AccountsAlerts;
