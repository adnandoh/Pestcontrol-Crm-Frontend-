import React, { useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  IndianRupee,
  Wallet,
  Clock,
  History,
  Banknote,
} from 'lucide-react';
import dayjs from 'dayjs';
import { Button, PageLoading, Pagination } from '../components/ui';
import CopyablePhone from '../components/crm/CopyablePhone';
import CollectPaymentModal, { type CollectPaymentFormData } from '../components/crm/CollectPaymentModal';
import PaymentHistoryModal from '../components/crm/PaymentHistoryModal';
import { enhancedApiService } from '../services/api.enhanced';
import type {
  City,
  JobCard,
  PaginatedResponse,
  PendingPaymentStats,
  StaffUser,
} from '../types';

const formatMoney = (value?: string | number | null) => {
  const num = Number.parseFloat(String(value ?? 0));
  return Number.isFinite(num) ? num.toLocaleString('en-IN') : '0';
};

const statusBadgeClass = (status?: string) => {
  if (status === 'Fully Paid') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Partially Paid') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

const PendingAmounts: React.FC = () => {
  const [bookings, setBookings] = useState<JobCard[]>([]);
  const [stats, setStats] = useState<PendingPaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [collectJob, setCollectJob] = useState<JobCard | null>(null);
  const [historyJob, setHistoryJob] = useState<JobCard | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    payment_status: '',
    master_city: '',
    created_by: '',
    date_from: '',
    date_to: '',
  });
  const [pagination, setPagination] = useState({
    count: 0,
    current: 1,
    pageSize: 20,
    totalPages: 1,
  });

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        page_size: pagination.pageSize,
        ordering: '-created_at',
      };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });

      const [listRes, statsRes] = await Promise.all([
        enhancedApiService.getPendingPayments(params),
        enhancedApiService.getPendingPaymentStats(),
      ]);

      setBookings(listRes.results);
      setStats(statsRes);
      setPagination((prev) => ({
        ...prev,
        count: listRes.count,
        current: page,
        totalPages: Math.max(1, Math.ceil(listRes.count / prev.pageSize)),
      }));
    } catch (err) {
      console.error('Failed to load pending payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
    enhancedApiService.getCities({ page_size: 200 }).then((res: PaginatedResponse<City>) => {
      setCities(res.results || []);
    }).catch(() => {});
    enhancedApiService.getStaff({ page_size: 200 }).then((res: PaginatedResponse<StaffUser>) => {
      setStaff(res.results || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput }));
      loadData(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const applyFilters = () => loadData(1);

  const handleCollect = async (form: CollectPaymentFormData) => {
    if (!collectJob) return;
    try {
      setActionLoading(true);
      await enhancedApiService.collectPendingPayment(collectJob.id, {
        amount: form.amount,
        payment_mode: form.paymentMode,
        remarks: form.remarks,
      });
      setCollectJob(null);
      loadData(pagination.current);
    } catch (err) {
      console.error('Collection failed:', err);
      alert('Failed to collect payment. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && bookings.length === 0 && !stats) {
    return <PageLoading text="Loading pending amounts…" />;
  }

  return (
    <div className="space-y-4 px-1 sm:px-0">
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-gray-800 tracking-tight italic uppercase">
            Pending Amounts
          </h1>
          <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded tracking-widest uppercase">
            {pagination.count} bookings
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => loadData(pagination.current)} className="h-8">
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Outstanding',
            value: `₹${formatMoney(stats?.total_outstanding_amount)}`,
            icon: IndianRupee,
            color: 'text-red-600 bg-red-50',
          },
          {
            label: 'Total Collected',
            value: `₹${formatMoney(stats?.total_collected_amount)}`,
            icon: Wallet,
            color: 'text-emerald-600 bg-emerald-50',
          },
          {
            label: 'Pending Bookings',
            value: String(stats?.total_pending_bookings ?? 0),
            icon: Clock,
            color: 'text-amber-600 bg-amber-50',
          },
          {
            label: "Today's Collections",
            value: `₹${formatMoney(stats?.todays_collections)}`,
            icon: Banknote,
            color: 'text-blue-600 bg-blue-50',
          },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-3 border border-gray-200 rounded flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Booking ID, name, mobile…"
              className="w-full pl-8 pr-3 h-8 text-xs border border-gray-300 rounded font-semibold"
            />
          </div>
        </div>

        <div className="w-40">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase">Payment Status</label>
          <select
            value={filters.payment_status}
            onChange={(e) => setFilters((p) => ({ ...p, payment_status: e.target.value }))}
            className="w-full h-8 text-xs border border-gray-300 rounded px-2 font-bold"
          >
            <option value="">All</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        <div className="w-40">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase">Service City</label>
          <select
            value={filters.master_city}
            onChange={(e) => setFilters((p) => ({ ...p, master_city: e.target.value }))}
            className="w-full h-8 text-xs border border-gray-300 rounded px-2 font-bold"
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>{city.name}</option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase">Created By</label>
          <select
            value={filters.created_by}
            onChange={(e) => setFilters((p) => ({ ...p, created_by: e.target.value }))}
            className="w-full h-8 text-xs border border-gray-300 rounded px-2 font-bold"
          >
            <option value="">All Staff</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-36">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase">From</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => setFilters((p) => ({ ...p, date_from: e.target.value }))}
            className="w-full h-8 text-xs border border-gray-300 rounded px-2"
          />
        </div>

        <div className="w-36">
          <label className="text-[10px] font-extrabold text-gray-500 mb-1 block uppercase">To</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => setFilters((p) => ({ ...p, date_to: e.target.value }))}
            className="w-full h-8 text-xs border border-gray-300 rounded px-2"
          />
        </div>

        <Button size="sm" onClick={applyFilters} className="h-8">Apply</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[1100px]">
          <thead className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase tracking-widest text-gray-500">
            <tr>
              <th className="px-3 py-2">Booking ID</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Mobile</th>
              <th className="px-3 py-2">Service</th>
              <th className="px-3 py-2">City</th>
              <th className="px-3 py-2">Total</th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Pending</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Booking Date</th>
              <th className="px-3 py-2">Created By</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-gray-500">
                  No outstanding balances found.
                </td>
              </tr>
            ) : (
              bookings.map((job) => (
                <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-2 font-black text-gray-800">{job.code}</td>
                  <td className="px-3 py-2 font-semibold">{job.client_name}</td>
                  <td className="px-3 py-2">
                    <CopyablePhone phone={job.client_mobile} />
                  </td>
                  <td className="px-3 py-2">{job.service_type}</td>
                  <td className="px-3 py-2">{job.master_city_name || job.city || '—'}</td>
                  <td className="px-3 py-2 font-bold">₹{formatMoney(job.total_amount || job.price)}</td>
                  <td className="px-3 py-2 text-emerald-700 font-bold">₹{formatMoney(job.paid_amount)}</td>
                  <td className="px-3 py-2 text-amber-700 font-bold">₹{formatMoney(job.pending_amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusBadgeClass(job.payment_status_display)}`}>
                      {job.payment_status_display || job.payment_status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{dayjs(job.created_at).format('DD MMM YYYY')}</td>
                  <td className="px-3 py-2">{job.created_by_name || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCollectJob(job)}
                        className="px-2 py-1 rounded bg-amber-500 text-white text-[10px] font-black uppercase hover:bg-amber-600"
                      >
                        Collect
                      </button>
                      <button
                        onClick={() => setHistoryJob(job)}
                        className="p-1.5 rounded border border-gray-200 hover:bg-gray-100"
                        title="Payment history"
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.current}
          totalPages={pagination.totalPages}
          totalItems={pagination.count}
          itemsPerPage={pagination.pageSize}
          onPageChange={(page) => loadData(page)}
        />
      )}

      <CollectPaymentModal
        isOpen={!!collectJob}
        jobCard={collectJob}
        isLoading={actionLoading}
        onClose={() => setCollectJob(null)}
        onSubmit={handleCollect}
      />

      <PaymentHistoryModal
        isOpen={!!historyJob}
        jobCard={historyJob}
        onClose={() => setHistoryJob(null)}
      />
    </div>
  );
};

export default PendingAmounts;
