import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Loader2, RefreshCw, Search } from 'lucide-react';
import dayjs from 'dayjs';
import {
  isWhatsAppApiKeyConfigured,
  whatsAppApiKeySetupMessage,
  whatsappInboxApi,
  type ECardWhatsAppTrackingRow,
} from '../services/whatsappInboxApi';
import { getErrorMessage } from '../utils/errors';

const ECardWhatsAppTracking: React.FC = () => {
  const [rows, setRows] = useState<ECardWhatsAppTrackingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setError(null);
    if (!isWhatsAppApiKeyConfigured()) {
      setError(whatsAppApiKeySetupMessage());
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await whatsappInboxApi.getECardWhatsAppTracking({ limit: 200 });
      setRows(res.results || []);
    } catch (err) {
      setError(getErrorMessage(err) || 'Failed to load E-Card WhatsApp tracking.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(row.phone || '').toLowerCase().includes(q) ||
      String(row.customer_name || '').toLowerCase().includes(q) ||
      String(row.external_id ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10 h-full animate-fade-up">
      <div className="bg-white p-4 border border-gray-200 shadow-xs rounded-sm flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-sky-700" />
            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight uppercase italic">
              E-Card WhatsApp Tracking
            </h1>
          </div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Customers who opened the tracked E-Brochure button
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-bold uppercase bg-sky-700 text-white rounded-lg hover:bg-sky-800 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tracked clicks</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{rows.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Showing</p>
          <p className="text-3xl font-black text-sky-700 mt-1">{filtered.length}</p>
        </div>
      </div>

      <div className="bg-white p-3 border border-gray-200 shadow-xs rounded-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            className="w-full h-9 pl-8 pr-3 text-sm border border-gray-200 rounded-lg"
            placeholder="Search phone, name, or inquiry ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
          {error}
        </div>
      ) : null}

      <div className="bg-white border border-gray-200 shadow-xs rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Customer name</th>
                <th className="text-left px-4 py-3">Inquiry ID</th>
                <th className="text-left px-4 py-3">Clicked at</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-xs font-bold text-gray-400 uppercase">
                    Loading clicks…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-xs font-bold text-gray-400 uppercase">
                    No tracked brochure clicks yet
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((row, idx) => {
                  const clicked = row.clicked_at ? dayjs(row.clicked_at) : null;
                  return (
                    <tr
                      key={`${row.phone}-${row.clicked_at}-${idx}`}
                      className="border-b border-gray-100 hover:bg-gray-50/80"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-gray-800 whitespace-nowrap">
                        {row.phone ? `+${String(row.phone).replace(/^\+/, '')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.customer_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.external_id !== undefined && row.external_id !== null && row.external_id !== ''
                          ? String(row.external_id)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {clicked?.isValid() ? clicked.format('DD MMM YYYY hh:mm A') : row.clicked_at || '—'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ECardWhatsAppTracking;
