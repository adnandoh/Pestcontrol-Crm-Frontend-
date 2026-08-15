import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit2,
  MapPin,
  Check,
  X,
} from 'lucide-react';
import CopyablePhone from '../components/crm/CopyablePhone';
import {
  Button,
  Pagination,
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import type { PaginatedResponse, Technician } from '../types';
import { cn } from '../utils/cn';
import { showAlert } from '../utils/notify';
import { useRevenueModelV2 } from '../hooks/useRevenueModelV2';

const PAGE_SIZE = 10;

const Technicians: React.FC = () => {
  const navigate = useNavigate();
  const revenueModelEnabled = useRevenueModelV2();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null as string | null,
    previous: null as string | null,
    current: 1,
    pageSize: PAGE_SIZE,
    totalPages: 0,
  });

  const loadTechnicians = useCallback(async (page = 1, currentSearch = searchInput) => {
    try {
      setLoading(true);

      const params: {
        page: number;
        page_size: number;
        ordering: string;
        search?: string;
      } = {
        page,
        page_size: PAGE_SIZE,
        ordering: '-created_at',
      };

      if (currentSearch.trim()) {
        params.search = currentSearch.trim();
      }

      const response: PaginatedResponse<Technician> = await enhancedApiService.getTechnicians(params);

      setTechnicians(response.results);
      setPagination((prev) => ({
        ...prev,
        count: response.count,
        next: response.next,
        previous: response.previous,
        current: page,
        totalPages: Math.max(1, Math.ceil(response.count / PAGE_SIZE)),
      }));
    } catch (error) {
      console.error('Failed to fetch technicians:', error);
    } finally {
      setLoading(false);
    }
  }, [searchInput]);

  useEffect(() => {
    loadTechnicians(1);
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, []);

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const newTimeout = setTimeout(() => {
      loadTechnicians(1, value);
    }, 400);

    setSearchTimeout(newTimeout);
  };

  const handleSearchSubmit = () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    loadTechnicians(1, searchInput);
  };

  const handlePageChange = (page: number) => {
    loadTechnicians(page, searchInput);
  };

  const handleApproveApp = async (tech: Technician) => {
    if (!window.confirm(`Approve Partner App access for ${tech.name}?`)) return;
    try {
      setActionBusyId(tech.id);
      await enhancedApiService.approvePartnerApp(tech.id);
      showAlert(`Partner App approved for ${tech.name}`);
      await loadTechnicians(pagination.current, searchInput);
    } catch {
      showAlert('Could not approve Partner App');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRejectApp = async (tech: Technician) => {
    if (!window.confirm(`Reject / revoke Partner App access for ${tech.name}?`)) return;
    try {
      setActionBusyId(tech.id);
      await enhancedApiService.revokePartnerApp(tech.id);
      showAlert(`Partner App access rejected for ${tech.name}`);
      await loadTechnicians(pagination.current, searchInput);
    } catch {
      showAlert('Could not reject Partner App');
    } finally {
      setActionBusyId(null);
    }
  };

  const showingFrom = pagination.count === 0 ? 0 : (pagination.current - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(pagination.current * PAGE_SIZE, pagination.count);

  return (
    <div className="space-y-4 px-1 sm:px-0 bg-gray-50/10">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">View Technicians</h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            Total {pagination.count} Staff
          </span>
        </div>
        <Button
          onClick={() => navigate('/technicians/create')}
          className="bg-blue-700 hover:bg-blue-800 h-8 text-[11px] font-extrabold shadow-lg px-6 uppercase tracking-wider"
        >
          <Plus className="h-4 w-4 mr-1" /> Create Technician
        </Button>
      </div>

      <div className="bg-white p-3 border border-gray-200 shadow-xs flex items-end gap-3 rounded">
        <div className="flex-1">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase tracking-tight">Search By Name / Mobile</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Name, Phone..."
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              className="w-full pl-8 pr-4 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none transition-all h-8 font-semibold"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full table-auto border-collapse text-[11px]">
            <thead className="bg-[#f8f9fa] sticky top-0 z-10 border-b border-gray-200 text-gray-600 uppercase">
              <tr className="divide-x divide-gray-200">
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Initials</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Name</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Mobile Info</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Age</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Join Date</th>
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Status</th>
                {revenueModelEnabled && (
                  <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Type</th>
                )}
                <th className="px-3 py-2 text-left font-extrabold tracking-tight italic">Partner App</th>
                <th className="px-3 py-2 text-center font-extrabold tracking-tight italic">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={revenueModelEnabled ? 9 : 8} className="py-20 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Loading Results...</span>
                  </td>
                </tr>
              ) : technicians.length === 0 ? (
                <tr>
                  <td colSpan={revenueModelEnabled ? 9 : 8} className="py-20 text-center text-gray-400 font-bold uppercase italic">
                    No Technicians Found
                  </td>
                </tr>
              ) : technicians.map((tech) => {
                const busy = actionBusyId === tech.id;
                const hasApp = Boolean(tech.has_partner_app);
                const approved = Boolean(tech.partner_app_approved);

                return (
                <tr key={tech.id} className="hover:bg-gray-50/80 transition-colors divide-x divide-gray-100">
                  <td className="px-3 py-2.5">
                    <div className={cn('h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold shadow-inner', tech.is_active ? 'bg-emerald-500' : 'bg-gray-400')}>
                      {tech.name.charAt(0).toUpperCase()}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-gray-800 uppercase">{tech.name}</div>
                    {(tech.service_area || tech.city) && (
                      <div className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 uppercase tracking-tighter">
                        <MapPin className="h-2.5 w-2.5" />
                        {tech.service_area} {tech.city && `- ${tech.city}`}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <CopyablePhone phone={tech.mobile} className="text-sm font-bold text-gray-600" />
                    {tech.alternative_mobile && (
                      <div className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1">
                        Alt: <CopyablePhone phone={tech.alternative_mobile} className="text-[9px] font-bold text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-gray-600">{tech.age || '---'}</td>
                  <td className="px-3 py-2.5 font-bold text-gray-600">{new Date(tech.created_at).toLocaleDateString('en-GB')}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 ring-inset ${
                      tech.is_active ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-gray-50 text-gray-700 ring-gray-600/20'
                    }`}>
                      {tech.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  {revenueModelEnabled && (
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ring-1 ring-inset ${
                          tech.technician_type === 'salaried'
                            ? 'bg-slate-50 text-slate-700 ring-slate-600/20'
                            : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                        }`}
                      >
                        {tech.technician_type === 'salaried' ? 'Salaried' : 'Partner'}
                      </span>
                      {tech.presence_status && tech.presence_status !== 'offline' && (
                        <div className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">
                          {tech.presence_status.replace('_', ' ')}
                        </div>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    {!hasApp ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-gray-50 text-gray-500 ring-1 ring-inset ring-gray-200">
                        No app
                      </span>
                    ) : approved ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20">
                        Pending approval
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {hasApp && !approved && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleApproveApp(tech)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-wide disabled:opacity-50"
                          title="Approve Partner App"
                        >
                          <Check className="h-3 w-3" />
                          Approve
                        </button>
                      )}
                      {hasApp && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleRejectApp(tech)}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wide disabled:opacity-50',
                            approved
                              ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-100'
                              : 'bg-red-600 hover:bg-red-700 text-white',
                          )}
                          title={approved ? 'Revoke Partner App access' : 'Reject Partner App'}
                        >
                          <X className="h-3 w-3" />
                          {approved ? 'Revoke' : 'Reject'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/technicians/edit/${tech.id}`)}
                        className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded transition-all group"
                        title="Edit technician"
                      >
                        <Edit2 className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pagination.count > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              Showing {showingFrom}–{showingTo} of {pagination.count}
            </p>
            <Pagination
              currentPage={pagination.current}
              totalPages={Math.max(1, pagination.totalPages)}
              totalItems={pagination.count}
              itemsPerPage={PAGE_SIZE}
              onPageChange={handlePageChange}
              showPageSizeSelector={false}
              showGoToPage
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Technicians;
