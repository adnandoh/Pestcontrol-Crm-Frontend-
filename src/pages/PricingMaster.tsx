import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '../components/ui';
import { Pagination } from '../components/ui/Pagination';
import { enhancedApiService } from '../services/api.enhanced';
import { useAuth } from '../hooks/useAuth';
import { isPricingAdmin } from '../utils/roles';
import type {
  PricingRate,
  PricingRateFormData,
  PricingRateOptions,
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

const PLAN_TYPES = [
  'One Time Service',
  'AMC 3 Services',
  'AMC 4 Services',
  'AMC 6 Services',
  'AMC 12 Services',
];

/**
 * Grouped so the list reads as segments rather than a flat mix. "Fogging" used
 * to sit here as if it were a property type; the two area-priced rows are now
 * described by the area they price, matching the backend labels.
 */
const PROPERTY_CATEGORY_GROUPS: {
  group: string;
  options: { value: PricingPropertyCategory; label: string }[];
}[] = [
  {
    group: 'Residential',
    options: [
      { value: 'residential', label: 'Residential (BHK/RK)' },
      { value: 'villa', label: 'Villa / Bungalow (Sq.Ft.)' },
    ],
  },
  {
    group: 'Commercial',
    options: [
      { value: 'commercial', label: 'Commercial' },
      { value: 'society', label: 'Housing Society (Common Area)' },
      { value: 'hospital', label: 'Hospital / Clinic' },
      { value: 'hotel', label: 'Hotel / Restaurant / Cloud Kitchen' },
      { value: 'corporate', label: 'Corporate One-Time' },
      { value: 'corporate_monthly', label: 'Corporate Monthly Contract' },
      { value: 'multi_site', label: 'Multi-Site Chain (Per Outlet)' },
    ],
  },
  {
    group: 'Priced by treated area',
    options: [
      { value: 'fogging', label: 'Open / Outdoor Area (Sq.Ft.)' },
      { value: 'rodent', label: 'Rodent / Reptile Zone (Sq.Ft.)' },
    ],
  },
  {
    group: 'Not bookable directly',
    options: [{ value: 'addon', label: 'Add-On / Equipment / SLA' }],
  },
];

const PROPERTY_CATEGORIES = PROPERTY_CATEGORY_GROUPS.flatMap((g) => g.options);

/** Falls back to the raw value so a category added server-side still renders. */
const categoryLabel = (value: string) =>
  PROPERTY_CATEGORIES.find((c) => c.value === value)?.label ?? value;

const emptyForm = (): PricingRateFormData => ({
  region: 0,
  service_package: 'Cockroach / Ants',
  plan_type: 'One Time Service',
  area_key: '',
  property_category: 'residential',
  amount: 0,
  floor_amount: null,
  billing_basis: '',
  gst_percent: 18,
  price_includes_gst: true,
  is_active: true,
  notes: '',
});

/** Live GST preview for the Pricing Master form. */
function previewGst(amount: number, gstPercent: number, includes: boolean) {
  const selling = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const rate = Number.isFinite(gstPercent) ? Math.max(0, gstPercent) : 0;
  if (selling <= 0 || rate <= 0) {
    return { base: selling, gst: 0, total: selling };
  }
  if (includes) {
    const base = Math.round((selling / (1 + rate / 100)) * 100) / 100;
    const gst = Math.round((selling - base) * 100) / 100;
    return { base, gst, total: selling };
  }
  const gst = Math.round((selling * rate) / 100 * 100) / 100;
  return { base: selling, gst, total: Math.round((selling + gst) * 100) / 100 };
}

/**
 * Surface the API's actual complaint instead of a generic failure. Duplicate
 * region+service+plan+area rows and a floor above the rate both come back as
 * DRF field errors, and staff cannot act on "check all fields and try again".
 */
function pricingApiError(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const parts: string[] = [];
    for (const [field, value] of Object.entries(data as Record<string, unknown>)) {
      const text = Array.isArray(value) ? value.join(' ') : String(value);
      parts.push(field === 'non_field_errors' ? text : `${field}: ${text}`);
    }
    if (parts.length > 0) return parts.join(' · ');
  }
  return 'Failed to save pricing rate. Check all fields and try again.';
}

const formatInr = (n: number | string | undefined | null) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const pricingFieldClass =
  'w-full h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#2d8a2f] focus:ring-2 focus:ring-[#2d8a2f]/20';

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
  const [selectedRate, setSelectedRate] = useState<PricingRate | null>(null);
  const [formData, setFormData] = useState<PricingRateFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<PricingRateOptions | null>(null);
  const [formError, setFormError] = useState('');

  /**
   * Service and plan dropdowns come from the values already stored, merged with
   * the canonical defaults. Hard-coding them meant most of the imported rate
   * chart could not be selected, and editing a rate whose plan was missing
   * showed the wrong option.
   */
  const servicePackageOptions = useMemo(
    () => Array.from(new Set([...(options?.service_packages ?? []), ...SERVICE_PACKAGES])).sort(),
    [options],
  );
  const planTypeOptions = useMemo(
    () => Array.from(new Set([...(options?.plan_types ?? []), ...PLAN_TYPES])).sort(),
    [options],
  );
  /**
   * Area keys are free text but must match the booking form's size option
   * exactly, so suggest the ones already used in the same segment. Drawn from
   * the loaded page rather than the whole table — enough to stop a typo.
   */
  const areaKeySuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          rates
            .filter((r) => r.property_category === formData.property_category)
            .map((r) => r.area_key),
        ),
      ).sort(),
    [rates, formData.property_category],
  );

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
    enhancedApiService
      .getPricingRateOptions()
      .then(setOptions)
      // Non-fatal: the dropdowns fall back to the canonical defaults.
      .catch((err) => console.error('Failed to load pricing options:', err));
  }, []);

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
    setFormError('');
    setFormData({
      ...emptyForm(),
      region: regions[0]?.id ?? 0,
    });
    setIsModalOpen(true);
  };

  const openEdit = (rate: PricingRate) => {
    setSelectedRate(rate);
    setFormError('');
    setFormData({
      region: rate.region,
      service_package: rate.service_package,
      plan_type: rate.plan_type,
      area_key: rate.area_key,
      property_category: rate.property_category,
      amount: Number(rate.amount),
      floor_amount:
        rate.floor_amount === null || rate.floor_amount === undefined
          ? null
          : Number(rate.floor_amount),
      billing_basis: rate.billing_basis || '',
      gst_percent: Number(rate.gst_percent ?? 18),
      price_includes_gst: rate.price_includes_gst !== false,
      is_active: rate.is_active,
      notes: rate.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    // Mirror the API's rules so staff see the problem before a failed round trip.
    if (!formData.region) {
      setFormError('Select a region.');
      return;
    }
    if (!formData.area_key.trim()) {
      setFormError('Area / size key is required — it identifies the rate row.');
      return;
    }
    if (!(formData.amount > 0)) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    if (formData.floor_amount !== null && formData.floor_amount > formData.amount) {
      setFormError(
        `Internal floor (₹${formData.floor_amount}) cannot be above the rate ` +
          `(₹${formData.amount}).`,
      );
      return;
    }
    setFormError('');

    try {
      setSaving(true);
      const payload: PricingRateFormData = {
        ...formData,
        area_key: formData.area_key.trim(),
        billing_basis: formData.billing_basis.trim(),
      };
      if (selectedRate) {
        await enhancedApiService.updatePricingRate(selectedRate.id, payload);
      } else {
        await enhancedApiService.createPricingRate(payload);
      }
      setIsModalOpen(false);
      fetchRates();
    } catch (err: unknown) {
      console.error('Save failed:', err);
      setFormError(pricingApiError(err));
    } finally {
      setSaving(false);
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
            Single master for One-Time and AMC rates with GST. Changes apply to new bookings and the customer catalog — existing bookings keep their stored price.
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
                  {servicePackageOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  value={filterPlan}
                  onChange={(e) => setFilterPlan(e.target.value)}
                  className="h-10 px-3 text-sm border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">All Plans</option>
                  {planTypeOptions.map((p) => (
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
                  <th className="py-3 pr-3">GST</th>
                  <th className="py-3 pr-3 text-right">Total</th>
                  <th className="py-3 pr-3">Status</th>
                  {canEdit && <th className="py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="py-8 text-center text-gray-400">Loading...</td></tr>
                ) : rates.length === 0 ? (
                  <tr><td colSpan={10} className="py-8 text-center text-gray-400">No pricing rates found. Click Add Rate to create one.</td></tr>
                ) : (
                  rates.map((rate) => (
                    <tr key={rate.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-3 pr-3 font-semibold">{rate.region_name}</td>
                      <td className="py-3 pr-3">{rate.service_package}</td>
                      <td className="py-3 pr-3 text-gray-600">{rate.plan_type}</td>
                      <td className="py-3 pr-3 font-medium">
                        {rate.area_key}
                        {rate.billing_basis && (
                          <div className="text-[10px] font-normal text-gray-400">
                            {rate.billing_basis}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant="outline" className="text-[10px]">
                          {categoryLabel(rate.property_category)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 text-right font-black text-gray-900 tabular-nums">
                        {formatInr(rate.amount)}
                        {rate.floor_amount !== null && rate.floor_amount !== undefined && (
                          <div
                            className="text-[10px] font-medium text-gray-400"
                            title="Internal negotiation floor — never shown to customers"
                          >
                            Floor {formatInr(rate.floor_amount)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-xs text-gray-600">
                        <div className="font-semibold">{Number(rate.gst_percent ?? 18)}%</div>
                        <div className="text-[10px] text-gray-400">
                          {rate.price_includes_gst !== false ? 'Incl. GST' : 'Excl. GST'}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-right font-bold text-[#2d8a2f] tabular-nums">
                        {formatInr(rate.total_with_gst ?? rate.amount)}
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
        description="Set region, service, amount, and GST. Preview updates as you type."
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              {formError}
            </div>
          )}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Service details
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Region <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: Number(e.target.value) })}
                  className={pricingFieldClass}
                  required
                >
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Rates are priced per region.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Service <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.service_package}
                  onChange={(e) => setFormData({ ...formData, service_package: e.target.value })}
                  className={pricingFieldClass}
                  required
                >
                  {servicePackageOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Existing service names only, so the booking list stays clean.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Plan type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.plan_type}
                  onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
                  className={pricingFieldClass}
                  required
                >
                  {planTypeOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  One-time, AMC or a visit frequency.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Property category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.property_category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      property_category: e.target.value as PricingPropertyCategory,
                    })
                  }
                  className={pricingFieldClass}
                  required
                >
                  {PROPERTY_CATEGORY_GROUPS.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.options.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  {formData.property_category === 'addon'
                    ? 'Add-ons are hidden from the booking service list and priced separately.'
                    : 'Decides which rate table a booking looks in.'}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Area / size key <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.area_key}
                  onChange={(e) => setFormData({ ...formData, area_key: e.target.value })}
                  placeholder="e.g. 1 BHK, 2 BHK, Up to 1,000 Sq.Ft."
                  className={pricingFieldClass}
                  list="pricing-area-keys"
                  required
                />
                <datalist id="pricing-area-keys">
                  {areaKeySuggestions.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
                <p className="mt-1.5 text-xs text-slate-500">
                  Must match the booking form's size option exactly.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Billing basis
                </label>
                <input
                  value={formData.billing_basis}
                  onChange={(e) => setFormData({ ...formData, billing_basis: e.target.value })}
                  placeholder="e.g. Per month, Per outlet/month"
                  className={pricingFieldClass}
                  list="pricing-billing-bases"
                />
                <datalist id="pricing-billing-bases">
                  {(options?.billing_bases ?? []).map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <p className="mt-1.5 text-xs text-slate-500">
                  How the amount is charged. Leave blank for a one-off price.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pricing &amp; GST
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className={pricingFieldClass}
                  required
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  {formData.price_includes_gst
                    ? 'Tax-inclusive: what the customer pays.'
                    : 'Tax-exclusive: GST is added on top.'}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Internal floor (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={formData.floor_amount ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      floor_amount: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="No floor set"
                  className={cn(
                    pricingFieldClass,
                    formData.floor_amount !== null &&
                      formData.floor_amount > formData.amount &&
                      'border-red-400 focus:border-red-500 focus:ring-red-500/20',
                  )}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Lowest rate staff may negotiate to. Never shown to customers.
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">GST %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={formData.gst_percent}
                  onChange={(e) =>
                    setFormData({ ...formData, gst_percent: Number(e.target.value) })
                  }
                  className={pricingFieldClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={formData.price_includes_gst}
                  onChange={(e) =>
                    setFormData({ ...formData, price_includes_gst: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-[#2d8a2f] focus:ring-[#2d8a2f]"
                />
                <span className="text-sm font-medium text-slate-800">Price includes GST</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-[#2d8a2f] focus:ring-[#2d8a2f]"
                />
                <span className="text-sm font-medium text-slate-800">Active for new bookings</span>
              </label>
            </div>

            {(() => {
              const preview = previewGst(
                formData.amount,
                formData.gst_percent,
                formData.price_includes_gst,
              );
              return (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
                  <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    GST preview
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Base</div>
                      <div className="font-semibold tabular-nums text-slate-900">
                        {formatInr(preview.base)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">
                        GST ({formData.gst_percent}%)
                      </div>
                      <div className="font-semibold tabular-nums text-slate-900">
                        {formatInr(preview.gst)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Customer total</div>
                      <div className="text-base font-bold tabular-nums text-[#2d8a2f]">
                        {formatInr(preview.total)}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {formData.price_includes_gst
                      ? 'Amount is tax-inclusive. Base is back-calculated from GST %.'
                      : 'Amount is tax-exclusive. GST is added on top for the customer total.'}
                    {formData.billing_basis.trim() && ` Billed ${formData.billing_basis.trim().toLowerCase()}.`}
                  </p>
                  {formData.floor_amount !== null && (
                    <p className="mt-1 text-xs text-slate-500">
                      Internal floor {formatInr(formData.floor_amount)} ={' '}
                      {formatInr(
                        previewGst(
                          formData.floor_amount,
                          formData.gst_percent,
                          formData.price_includes_gst,
                        ).total,
                      )}{' '}
                      to the customer.
                    </p>
                  )}
                </div>
              );
            })()}
          </section>

          <section className="space-y-2 border-t border-slate-100 pt-4">
            <label className="block text-sm font-medium text-slate-700">Notes</label>
            <input
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional internal note"
              className={pricingFieldClass}
            />
          </section>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="min-w-[88px] bg-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="min-w-[120px] bg-[#2d8a2f] text-white hover:bg-[#267a28]"
            >
              {saving ? 'Saving...' : selectedRate ? 'Update Rate' : 'Create Rate'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PricingMaster;
