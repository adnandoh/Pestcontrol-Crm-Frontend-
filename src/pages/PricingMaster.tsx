import React, { useCallback, useEffect, useState } from 'react';
import {
  IndianRupee,
  Plus,
  Search,
  Edit2,
  History,
  Filter,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  Card,
  Button,
  Input,
  Badge,
  Modal,
  PageLoading,
  ConfirmationModal,
} from '../components/ui';
import { Pagination } from '../components/ui/Pagination';
import { enhancedApiService } from '../services/api.enhanced';
import { useAuth } from '../hooks/useAuth';
import { isPricingAdmin } from '../utils/roles';
import type {
  PricingRate,
  PricingRateFormData,
  PricingRateAuditLog,
  PricingRegion,
  PricingPropertyCategory,
} from '../types';
import { cn } from '../utils/cn';

const PAGE_SIZE = 10;

const SERVICE_PACKAGES = [
  'Cockroach / Ants',
  'Bed Bugs',
  'Termite',
  'Rodent',
  'Mosquito',
  'Hotel / Commercial',
];

const PLAN_TYPES = ['One Time Service', 'AMC 3 Services'];

const PROPERTY_CATEGORIES: { value: PricingPropertyCategory; label: string }[] = [
  { value: 'residential', label: 'Residential (BHK/RK)' },
  { value: 'villa', label: 'Villa / Bungalow' },
  { value: 'fogging', label: 'Fogging' },
  { value: 'rodent', label: 'Rodent / Reptile' },
  { value: 'commercial', label: 'Commercial' },
];

const emptyForm = (): PricingRateFormData => ({
  region: 0,
  service_package: 'Cockroach / Ants',
  plan_type: 'One Time Service',
  area_key: '',
  property_category: 'residential',
  amount: 0,
  is_active: true,
  notes: '',
});

const PricingMaster: React.FC = () => {
  const { user } = useAuth();
  const canEdit = isPricingAdmin(user);

  const [tab, setTab] = useState<'rates' | 'audit'>('rates');
  const [rates, setRates] = useState<PricingRate[]>([]);
  const [auditLogs, setAuditLogs] = useState<PricingRateAuditLog[]>([]);
  const [regions, setRegions] = useState<PricingRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterActive, setFilterActive] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<PricingRate | null>(null);
  const [formData, setFormData] = useState<PricingRateFormData>(emptyForm());
  const [saving, setSaving] = useState(false);

  const fetchRegions = useCallback(async () => {
    const res = await enhancedApiService.getPricingRegions({ page_size: 100 });
    setRegions(res.results);
    if (!formData.region && res.results.length > 0) {
      setFormData((prev) => ({ ...prev, region: res.results[0].id }));
    }
  }, [formData.region]);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page,
        page_size: PAGE_SIZE,
        ordering: 'region__name,service_package,plan_type,area_key',
      };
      if (search.trim()) params.search = search.trim();
      if (filterRegion) params.region = Number(filterRegion);
      if (filterService) params.service_package = filterService;
      if (filterPlan) params.plan_type = filterPlan;
      if (filterActive !== '') params.is_active = filterActive === 'true';

      const res = await enhancedApiService.getPricingRates(params);
      setRates(res.results);
      setTotalCount(res.count);
    } catch (err) {
      console.error('Failed to load pricing rates:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterRegion, filterService, filterPlan, filterActive]);

  const fetchAudit = useCallback(async () => {
    try {
      setLoading(true);
      const res = await enhancedApiService.getPricingAuditLogs({
        page,
        page_size: PAGE_SIZE,
        search: search.trim() || undefined,
        region_slug: filterRegion
          ? regions.find((r) => r.id === Number(filterRegion))?.slug
          : undefined,
      });
      setAuditLogs(res.results);
      setTotalCount(res.count);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterRegion, regions]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'rates') fetchRates();
      else fetchAudit();
    }, 300);
    return () => clearTimeout(timer);
  }, [tab, fetchRates, fetchAudit]);

  useEffect(() => {
    setPage(1);
  }, [search, filterRegion, filterService, filterPlan, filterActive, tab]);

  const openCreate = () => {
    setSelectedRate(null);
    setFormData({
      ...emptyForm(),
      region: regions[0]?.id ?? 0,
    });
    setIsModalOpen(true);
  };

  const openEdit = (rate: PricingRate) => {
    setSelectedRate(rate);
    setFormData({
      region: rate.region,
      service_package: rate.service_package,
      plan_type: rate.plan_type,
      area_key: rate.area_key,
      property_category: rate.property_category,
      amount: Number(rate.amount),
      is_active: rate.is_active,
      notes: rate.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    try {
      setSaving(true);
      if (selectedRate) {
        await enhancedApiService.updatePricingRate(selectedRate.id, formData);
      } else {
        await enhancedApiService.createPricingRate(formData);
      }
      setIsModalOpen(false);
      fetchRates();
    } catch (err: unknown) {
      console.error('Save failed:', err);
      alert('Failed to save pricing rate. Check all fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedRate || !canEdit) return;
    try {
      await enhancedApiService.deletePricingRate(selectedRate.id);
      setIsDeleteOpen(false);
      setSelectedRate(null);
      fetchRates();
    } catch (err) {
      console.error('Deactivate failed:', err);
      alert('Failed to deactivate rate.');
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  if (loading && rates.length === 0 && auditLogs.length === 0 && regions.length === 0) {
    return <PageLoading text="Loading Pricing Master..." />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <IndianRupee className="h-7 w-7 text-[#2d8a2f]" />
            Pricing Master
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Central pricing for all cities. Changes apply to new bookings only — existing records are unaffected.
          </p>
        </div>
        {canEdit && tab === 'rates' && (
          <Button onClick={openCreate} className="bg-[#2d8a2f] hover:bg-[#246b27] text-white gap-2">
            <Plus className="h-4 w-4" />
            Add Rate
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('rates')}
          className={cn(
            'px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors',
            tab === 'rates'
              ? 'border-[#1e5a9e] text-[#1e5a9e]'
              : 'border-transparent text-gray-500 hover:text-gray-800',
          )}
        >
          <IndianRupee className="inline h-4 w-4 mr-1.5" />
          Rates
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={() => setTab('audit')}
            className={cn(
              'px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors',
              tab === 'audit'
                ? 'border-[#1e5a9e] text-[#1e5a9e]'
                : 'border-transparent text-gray-500 hover:text-gray-800',
            )}
          >
            <History className="inline h-4 w-4 mr-1.5" />
            Audit Log
          </button>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search service, area, region..."
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="">All Regions</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {tab === 'rates' && (
              <>
                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">All Services</option>
                  {SERVICE_PACKAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">All Plans</option>
                  {PLAN_TYPES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  className="h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </>
            )}
          </div>
        </div>

        {tab === 'rates' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 pr-3">Region</th>
                  <th className="py-3 pr-3">Service</th>
                  <th className="py-3 pr-3">Plan</th>
                  <th className="py-3 pr-3">Area / Size</th>
                  <th className="py-3 pr-3">Category</th>
                  <th className="py-3 pr-3 text-right">Amount</th>
                  <th className="py-3 pr-3">Status</th>
                  {canEdit && <th className="py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-400">Loading...</td></tr>
                ) : rates.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-400">No pricing rates found.</td></tr>
                ) : (
                  rates.map((rate) => (
                    <tr key={rate.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-3 pr-3 font-semibold">{rate.region_name}</td>
                      <td className="py-3 pr-3">{rate.service_package}</td>
                      <td className="py-3 pr-3 text-gray-600">{rate.plan_type}</td>
                      <td className="py-3 pr-3 font-medium">{rate.area_key}</td>
                      <td className="py-3 pr-3">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {rate.property_category}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 text-right font-black text-gray-900 tabular-nums">
                        ₹{Number(rate.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 pr-3">
                        {rate.is_active ? (
                          <span className="inline-flex items-center gap-1 text-green-700 text-xs font-bold">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-bold">
                            <XCircle className="h-3.5 w-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(rate)}
                              className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {rate.is_active && (
                              <button
                                type="button"
                                onClick={() => { setSelectedRate(rate); setIsDeleteOpen(true); }}
                                className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                                title="Deactivate"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3 pr-3">When</th>
                  <th className="py-3 pr-3">Action</th>
                  <th className="py-3 pr-3">Region</th>
                  <th className="py-3 pr-3">Service</th>
                  <th className="py-3 pr-3">Area</th>
                  <th className="py-3 pr-3 text-right">Old → New</th>
                  <th className="py-3 pr-3">By</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading...</td></tr>
                ) : auditLogs.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No audit entries yet.</td></tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100">
                      <td className="py-3 pr-3 text-gray-500 text-xs">
                        {new Date(log.created_at).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 pr-3 capitalize font-semibold">{log.action}</td>
                      <td className="py-3 pr-3">{log.region_slug}</td>
                      <td className="py-3 pr-3">{log.service_package}</td>
                      <td className="py-3 pr-3">{log.area_key}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">
                        {log.old_amount != null ? `₹${Number(log.old_amount)}` : '—'}
                        {' → '}
                        {log.new_amount != null ? `₹${Number(log.new_amount)}` : '—'}
                      </td>
                      <td className="py-3 pr-3 text-gray-600">{log.changed_by_name || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 font-medium">
            Showing {rangeStart}–{rangeEnd} of {totalCount}
          </p>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={PAGE_SIZE}
            onPageChange={setPage}
            showPageSizeSelector={false}
          />
        </div>
      </Card>

      {!canEdit && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 font-medium">
          <Filter className="inline h-3.5 w-3.5 mr-1" />
          Read-only view. Contact an Admin to update pricing.
        </p>
      )}

      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={selectedRate ? 'Edit Pricing Rate' : 'Add Pricing Rate'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Region *</label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: Number(e.target.value) })}
                className="w-full mt-1 h-10 px-3 border border-gray-300 rounded-lg"
                required
              >
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Service *</label>
              <select
                value={formData.service_package}
                onChange={(e) => setFormData({ ...formData, service_package: e.target.value })}
                className="w-full mt-1 h-10 px-3 border border-gray-300 rounded-lg"
                required
              >
                {SERVICE_PACKAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Plan Type *</label>
              <select
                value={formData.plan_type}
                onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                className="w-full mt-1 h-10 px-3 border border-gray-300 rounded-lg"
                required
              >
                {PLAN_TYPES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Property Category *</label>
              <select
                value={formData.property_category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    property_category: e.target.value as PricingPropertyCategory,
                  })
                }
                className="w-full mt-1 h-10 px-3 border border-gray-300 rounded-lg"
                required
              >
                {PROPERTY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-600 uppercase">Area / Size Key *</label>
              <Input
                value={formData.area_key}
                onChange={(e) => setFormData({ ...formData, area_key: e.target.value })}
                placeholder="e.g. 2 BHK, Up to 1,000 Sq.Ft., Windows"
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Amount (₹) *</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="mt-1"
                required
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm font-semibold">Active (used for new bookings)</span>
              </label>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-600 uppercase">Notes</label>
              <Input
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional internal note"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-[#2d8a2f] text-white">
              {saving ? 'Saving...' : selectedRate ? 'Update Rate' : 'Create Rate'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Rate?"
        message={`Deactivate ${selectedRate?.service_package} — ${selectedRate?.area_key} for ${selectedRate?.region_name}? Existing bookings will not be affected.`}
        confirmText="Deactivate"
        type="danger"
      />
    </div>
  );
};

export default PricingMaster;
