import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Badge, Button, ConfirmationModal, Modal, PageLoading, Pagination } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { deepCleaningApiError, formatDeepCleaningMoney } from '../constants/deepCleaning';
import { deepCleaningBookingWhatsAppItems } from '../utils/deepCleaningWhatsApp';
import DeepCleaningWhatsAppMenu from '../components/crm/DeepCleaningWhatsAppMenu';
import type {
  DeepCleaningBooking,
  DeepCleaningBookingStatus,
  DeepCleaningBookingStatusCounts,
  DeepCleaningTechnician,
} from '../types';

const TABS: DeepCleaningBookingStatus[] = ['Pending', 'On Process', 'Done', 'Cancelled'];

const emptyCounts: DeepCleaningBookingStatusCounts = {
  all: 0,
  Pending: 0,
  'On Process': 0,
  Done: 0,
  Cancelled: 0,
};

const DeepCleaningBookings: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<DeepCleaningBooking[]>([]);
  const [counts, setCounts] = useState<DeepCleaningBookingStatusCounts>(emptyCounts);
  const [tab, setTab] = useState<DeepCleaningBookingStatus>('Pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [assignFor, setAssignFor] = useState<DeepCleaningBooking | null>(null);
  const [technicians, setTechnicians] = useState<DeepCleaningTechnician[]>([]);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [assignError, setAssignError] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [confirmDone, setConfirmDone] = useState<DeepCleaningBooking | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<DeepCleaningBooking | null>(null);

  const load = useCallback(async (status: string, query: string, pageNumber: number, size: number) => {
    try {
      setLoading(true);
      setError('');
      const response = await enhancedApiService.getDeepCleaningBookings({
        status,
        search: query || undefined,
        page: pageNumber,
        page_size: size,
      });
      setRows(response.results || []);
      setTotal(response.count || 0);
      setCounts({ ...emptyCounts, ...(response.status_counts as DeepCleaningBookingStatusCounts | undefined) });
    } catch (err) {
      setError(deepCleaningApiError(err, 'Could not load bookings.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(tab, search.trim(), page, pageSize), 250);
    return () => clearTimeout(timer);
  }, [load, search, tab, page, pageSize]);

  async function openAssign(row: DeepCleaningBooking) {
    setAssignFor(row);
    setPickedId(row.technician || null);
    setAssignError('');
    setTechnicians([]);
    try {
      const list = await enhancedApiService.getDeepCleaningTechnicians({
        available: 1,
        service: row.service,
        city: row.city,
      });
      setTechnicians(Array.isArray(list) ? list : []);
    } catch (err) {
      setAssignError(deepCleaningApiError(err, 'Could not load technicians.'));
    }
  }

  async function submitAssign() {
    if (!assignFor || !pickedId) return;
    setAssigning(true);
    setAssignError('');
    try {
      await enhancedApiService.assignDeepCleaningBooking(assignFor.id, pickedId);
      setAssignFor(null);
      await load(tab, search.trim(), page, pageSize);
    } catch (err) {
      setAssignError(deepCleaningApiError(err, 'Could not assign this technician.'));
    } finally {
      setAssigning(false);
    }
  }

  async function runAction(id: number, action: 'unassign' | 'complete' | 'cancel') {
    setBusyId(id);
    setError('');
    try {
      if (action === 'unassign') await enhancedApiService.unassignDeepCleaningBooking(id);
      if (action === 'complete') await enhancedApiService.completeDeepCleaningBooking(id);
      if (action === 'cancel') await enhancedApiService.cancelDeepCleaningBooking(id);
      setConfirmDone(null);
      setConfirmCancel(null);
      await load(tab, search.trim(), page, pageSize);
    } catch (err) {
      setError(deepCleaningApiError(err, 'Could not update this booking.'));
    } finally {
      setBusyId(null);
    }
  }

  const visibleRows = rows.filter((row) => row.status === tab);

  if (loading && rows.length === 0 && !search) {
    return <PageLoading text="Loading Deep Cleaning bookings..." />;
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Deep Cleaning Bookings</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Pending has no technician. Assigning moves the booking to On Process. Mark Done when the clean is finished.
          </p>
        </div>
        <Button onClick={() => navigate('/deepcleaning-bookings/create')}>
          <Plus className="mr-1 h-4 w-4" />
          Create booking
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => { setTab(item); setPage(1); }}
            className={`border-b-2 px-3 py-2 text-sm font-semibold ${
              tab === item ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500'
            }`}
          >
            {item} ({counts[item] || 0})
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(event) => { setSearch(event.target.value); setPage(1); }}
        placeholder="Search code, name, or mobile"
        className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Booking</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">Visit</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Technician</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  No {tab.toLowerCase()} bookings.
                </td>
              </tr>
            ) : visibleRows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2">
                  <div className="font-semibold text-slate-900">{row.code}</div>
                  <Badge variant={row.status === 'Done' ? 'success' : row.status === 'Pending' ? 'warning' : 'secondary'}>
                    {row.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-slate-500">{row.mobile}</div>
                  <div className="text-slate-500">{[row.city, row.area].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="px-3 py-2">
                  <div>{row.service}</div>
                  <div className="text-slate-500">
                    {[row.property_size, row.property_type].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div>{row.preferred_date_display || '—'}</div>
                  <div className="text-slate-500">{row.preferred_time || ''}</div>
                </td>
                <td className="px-3 py-2">{formatDeepCleaningMoney(row.price)}</td>
                <td className="px-3 py-2">{row.technician_name || '—'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <DeepCleaningWhatsAppMenu items={deepCleaningBookingWhatsAppItems(row)} />
                    {row.status === 'Pending' || row.status === 'On Process' ? (
                      <Button size="sm" variant="outline" onClick={() => openAssign(row)}>
                        {row.technician ? 'Change' : 'Assign'}
                      </Button>
                    ) : null}
                    {row.status === 'On Process' ? (
                      <>
                        <Button size="sm" variant="outline" disabled={busyId === row.id} onClick={() => runAction(row.id, 'unassign')}>
                          Remove
                        </Button>
                        <Button size="sm" disabled={busyId === row.id} onClick={() => setConfirmDone(row)}>
                          Mark Done
                        </Button>
                      </>
                    ) : null}
                    {row.status === 'Pending' || row.status === 'On Process' ? (
                      <>
                        <Link className="self-center text-sm font-semibold text-teal-700" to={`/deepcleaning-bookings/edit/${row.id}`}>
                          Edit
                        </Link>
                        <button type="button" className="text-sm text-slate-500" onClick={() => setConfirmCancel(row)}>
                          Cancel
                        </button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        totalItems={total}
        itemsPerPage={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        showPageSizeSelector={false}
        showGoToPage
      />

      <Modal
        open={Boolean(assignFor)}
        onOpenChange={(open) => { if (!open) setAssignFor(null); }}
        title={assignFor ? `Assign ${assignFor.code}` : 'Assign'}
        description={assignFor ? [assignFor.city, assignFor.area].filter(Boolean).join(' · ') : ''}
      >
        <div className="space-y-3 p-4">
          {assignFor ? (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">This booking</p>
              <p className="font-semibold">{assignFor.service}</p>
              <p>{[assignFor.city, assignFor.area || 'Locality not set'].filter(Boolean).join(' · ')}</p>
            </div>
          ) : null}
          {assignError ? <p className="text-sm text-red-600">{assignError}</p> : null}
          {technicians.length === 0 ? (
            <p className="text-sm text-slate-600">
              No active technician covers this service and city.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {[...technicians].sort((a, b) => {
                const area = (assignFor?.area || '').trim().toLowerCase();
                const score = (tech: DeepCleaningTechnician) => (
                  area && (tech.localities || []).some((item) => item.name.trim().toLowerCase() === area) ? 0 : 1
                );
                return score(a) - score(b) || a.name.localeCompare(b.name);
              }).map((tech) => {
                const area = (assignFor?.area || '').trim().toLowerCase();
                return (
                  <label key={tech.id} className="flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2">
                    <input
                      type="radio"
                      name="deep-cleaning-tech"
                      checked={pickedId === tech.id}
                      onChange={() => setPickedId(tech.id)}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{tech.name}</span>
                      <span className="block text-xs text-slate-500">{tech.mobile}</span>
                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">City</span>
                      <span className="block text-xs text-slate-700">{tech.cities.join(', ') || '—'}</span>
                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Locality</span>
                      <span className="mt-0.5 flex flex-wrap gap-1">
                        {(tech.localities || []).length === 0 ? (
                          <span className="text-xs text-slate-500">No locality selected</span>
                        ) : (tech.localities || []).map((item) => {
                          const matches = area && item.name.trim().toLowerCase() === area;
                          return (
                            <span
                              key={`${item.city}-${item.name}`}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                matches ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.city ? `${item.city} · ${item.name}` : item.name}
                            </span>
                          );
                        })}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignFor(null)}>Close</Button>
            <Button onClick={submitAssign} disabled={!pickedId || assigning}>
              {assigning ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={Boolean(confirmDone)}
        onClose={() => setConfirmDone(null)}
        onConfirm={() => confirmDone && runAction(confirmDone.id, 'complete')}
        title="Mark this booking done?"
        message={confirmDone ? `${confirmDone.code} for ${confirmDone.name} will move to Done.` : ''}
        confirmText="Mark Done"
        isLoading={busyId === confirmDone?.id}
      />
      <ConfirmationModal
        isOpen={Boolean(confirmCancel)}
        onClose={() => setConfirmCancel(null)}
        onConfirm={() => confirmCancel && runAction(confirmCancel.id, 'cancel')}
        title="Cancel this booking?"
        message={confirmCancel ? `${confirmCancel.code} will leave the working list.` : ''}
        confirmText="Cancel booking"
        type="danger"
        isLoading={busyId === confirmCancel?.id}
      />
    </div>
  );
};

export default DeepCleaningBookings;
