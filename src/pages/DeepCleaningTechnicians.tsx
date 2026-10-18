import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Badge, Button, PageLoading } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { deepCleaningApiError } from '../constants/deepCleaning';
import type { DeepCleaningTechnician } from '../types';

const DeepCleaningTechnicians: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DeepCleaningTechnician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError('');
      const data = await enhancedApiService.getDeepCleaningTechnicians({
        search: query || undefined,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(deepCleaningApiError(err, 'Could not load technicians.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [load, search]);

  if (loading && rows.length === 0) {
    return <PageLoading text="Loading Deep Cleaning technicians..." />;
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Deep Cleaning Technicians</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Cleaning staff for Deepcleaning99. These profiles are separate from pest control technicians.
          </p>
        </div>
        <Button onClick={() => navigate('/deepcleaning-technicians/create')}>
          <Plus className="mr-1 h-4 w-4" />
          Add technician
        </Button>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search name or mobile"
        className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Mobile</th>
              <th className="px-3 py-2">Cities</th>
              <th className="px-3 py-2">Services</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No Deep Cleaning technicians yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                  <td className="px-3 py-2">{row.mobile}</td>
                  <td className="px-3 py-2">{row.cities.join(', ')}</td>
                  <td className="px-3 py-2">{row.services.join(', ')}</td>
                  <td className="px-3 py-2">
                    <Badge variant={row.presence_status === 'active' ? 'success' : 'warning'}>
                      {row.presence_label || row.presence_status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to={`/deepcleaning-technicians/edit/${row.id}`}
                      className="text-sm font-semibold text-teal-700"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeepCleaningTechnicians;
