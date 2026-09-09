import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IndianRupee,
  Plus,
  Edit2,
  Filter,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  Card,
  Button,
  Badge,
  Modal,
  PageLoading,
} from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { useAuth } from '../hooks/useAuth';
import { isPricingAdmin } from '../utils/roles';
import type {
  PricingRate,
  PricingRateFilters,
  PricingRateFormData,
  PricingRateOptions,
  PricingRegion,
  PricingPropertyCategory,
} from '../types';
import {
  buildPlanGroups,
  type PricingPlanGroupId,
} from '../utils/pricingPlanGroups';
import { cn } from '../utils/cn';

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

/**
 * One labelled row of filter pills. The label matters here: three stacked rows
 * of pills are ambiguous without saying which dimension each one filters.
 */
const FilterTabRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
    <span className="w-16 shrink-0 pt-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
      {label}
    </span>
    <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
  </div>
);

/** Pill-style filter tab. `title` lists the underlying values it covers. */
const PlanTab: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  title?: string;
}> = ({ label, active, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={active}
    className={cn(
      'h-9 rounded-full border px-4 text-xs font-bold transition-colors',
      active
        ? 'border-[#2d8a2f] bg-[#2d8a2f] text-white'
        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50',
    )}
  >
    {label}
  </button>
);

const PricingMaster: React.FC = () => {
  const { user } = useAuth();
  const canEdit = isPricingAdmin(user);

  const [rates, setRates] = useState<PricingRate[]>([]);
  const [regions, setRegions] = useState<PricingRegion[]>([]);
  const [regionsLoaded, setRegionsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  /** Selected city tab. Defaults to the region flagged `is_default` (Mumbai). */
  const [activeRegionId, setActiveRegionId] = useState<number | null>(null);
  const [activePlan, setActivePlan] = useState<PricingPlanGroupId | 'all'>('all');
  /**
   * Selected service tab. This is where the Standard / Premium split lives —
   * it is part of the service name ("Cockroach Standard", "Cockroach Premium"),
   * not a separate plan or tier column.
   */
  const [activeService, setActiveService] = useState<string>('all');
  /** Plan types present in the selected city, used to build the plan tabs. */
  const [cityPlanTypes, setCityPlanTypes] = useState<string[]>([]);
  /** Services present in the selected city *and* plan, for the service tabs. */
  const [cityServices, setCityServices] = useState<string[]>([]);

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

  const planGroups = useMemo(() => buildPlanGroups(cityPlanTypes), [cityPlanTypes]);

  const activeRegion = useMemo(
    () => regions.find((r) => r.id === activeRegionId) ?? null,
    [regions, activeRegionId],
  );

  /**
   * Cities come from the configured pricing regions, not the master city list.
   * A city without its own rate card falls back to Mumbai's pricing at booking
   * time, so a tab for it would only ever show an empty table.
   */
  useEffect(() => {
    let cancelled = false;
    enhancedApiService
      .getPricingRegions({ page_size: 100 })
      .then((res) => {
        if (cancelled) return;
        setRegions(res.results);
        setActiveRegionId((current) => {
          if (current !== null) return current;
          const preferred = res.results.find((r) => r.is_default) ?? res.results[0];
          return preferred?.id ?? null;
        });
      })
      .catch((err) => console.error('Failed to load pricing cities:', err))
      .finally(() => {
        if (!cancelled) setRegionsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The form's selects list every stored value so a rate can be added for any
   * city, independently of whatever the tabs are currently filtered to.
   */
  useEffect(() => {
    enhancedApiService
      .getPricingRateOptions()
      .then(setOptions)
      // Non-fatal: the dropdowns fall back to the canonical defaults.
      .catch((err) => console.error('Failed to load pricing options:', err));
  }, []);

  /** Plan tabs: scoped to the city only, so changing plan never rebuilds them. */
  useEffect(() => {
    if (activeRegionId === null) return;
    let cancelled = false;
    enhancedApiService
      .getPricingRateOptions({ region: activeRegionId })
      .then((res) => {
        if (!cancelled) setCityPlanTypes(res.plan_types ?? []);
      })
      .catch((err) => {
        if (!cancelled) setCityPlanTypes([]);
        console.error('Failed to load plan tabs:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRegionId]);

  const activePlanTypes = useMemo(
    () => planGroups.find((g) => g.id === activePlan)?.planTypes ?? [],
    [planGroups, activePlan],
  );

  /**
   * Service tabs: scoped to city *and* plan, so a plan is never offered a
   * service with no rates behind it. A selected service that disappears when
   * the plan changes falls back to All Services rather than emptying the table.
   */
  useEffect(() => {
    if (activeRegionId === null) return;
    let cancelled = false;
    enhancedApiService
      .getPricingRateOptions({ region: activeRegionId, planTypes: activePlanTypes })
      .then((res) => {
        if (cancelled) return;
        const services = res.service_packages ?? [];
        setCityServices(services);
        setActiveService((current) =>
          current !== 'all' && !services.includes(current) ? 'all' : current,
        );
      })
      .catch((err) => {
        if (!cancelled) setCityServices([]);
        console.error('Failed to load service tabs:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRegionId, activePlanTypes]);

  /** Reset both tabs when the city changes so a stale one cannot empty the table. */
  useEffect(() => {
    setActivePlan('all');
    setActiveService('all');
  }, [activeRegionId]);

  const fetchRates = useCallback(async () => {
    if (activeRegionId === null) {
      setRates([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // City, plan and service are all applied by the API — the table never
      // holds rows outside the current selection.
      const params: PricingRateFilters = {
        region: activeRegionId,
        ordering: 'service_package,plan_type,area_key',
      };
      if (activePlanTypes.length) params.plan_type__in = activePlanTypes.join(',');
      if (activeService !== 'all') params.service_package = activeService;

      setRates(await enhancedApiService.getAllPricingRates(params));
    } catch (err) {
      console.error('Failed to load pricing rates:', err);
      setRates([]);
    } finally {
      setLoading(false);
    }
  }, [activeRegionId, activePlanTypes, activeService]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const openCreate = () => {
    setSelectedRate(null);
    setFormError('');
    setFormData({
      ...emptyForm(),
      region: activeRegionId ?? regions[0]?.id ?? 0,
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
      setFormError('Select a city.');
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

      // A rate saved against another city would be invisible under the current
      // tab, which reads as a failed save. Follow it instead.
      if (payload.region !== activeRegionId) {
        setActiveRegionId(payload.region);
      } else {
        fetchRates();
      }
    } catch (err: unknown) {
      console.error('Save failed:', err);
      setFormError(pricingApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!regionsLoaded) {
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
        {canEdit && (
          <Button onClick={openCreate} className="bg-[#2d8a2f] hover:bg-[#246b27] text-white gap-2">
            <Plus className="h-4 w-4" />
            Add Rate
          </Button>
        )}
      </div>

      {/* City tabs. One city at a time — the list is never mixed. */}
      {regions.length === 0 ? (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 font-medium">
          No pricing cities are configured yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 border-b border-gray-200">
          {regions.map((region) => (
            <button
              key={region.id}
              type="button"
              onClick={() => setActiveRegionId(region.id)}
              className={cn(
                'px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-colors',
                region.id === activeRegionId
                  ? 'border-[#1e5a9e] text-[#1e5a9e]'
                  : 'border-transparent text-gray-500 hover:text-gray-800',
              )}
            >
              {region.name}
            </button>
          ))}
        </div>
      )}

      <Card className="p-4">
        {/* Plan tabs, built from the plan types this city actually has. */}
        {planGroups.length > 0 && (
          <FilterTabRow label="Plan">
            <PlanTab
              label="All Plans"
              active={activePlan === 'all'}
              onClick={() => setActivePlan('all')}
            />
            {planGroups.map((group) => (
              <PlanTab
                key={group.id}
                label={group.label}
                title={group.planTypes.join(', ')}
                active={activePlan === group.id}
                onClick={() => setActivePlan(group.id)}
              />
            ))}
          </FilterTabRow>
        )}

        {/* Service tabs. Standard / Premium appear here because that is where
            the split actually lives — in the service name. */}
        {cityServices.length > 0 && (
          <FilterTabRow label="Service">
            <PlanTab
              label="All Services"
              active={activeService === 'all'}
              onClick={() => setActiveService('all')}
            />
            {cityServices.map((service) => (
              <PlanTab
                key={service}
                label={service}
                active={activeService === service}
                onClick={() => setActiveService(service)}
              />
            ))}
          </FilterTabRow>
        )}

        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-gray-500">
            {loading
              ? 'Loading…'
              : `${rates.length.toLocaleString('en-IN')} ${rates.length === 1 ? 'rate' : 'rates'}`}
            {activeRegion && !loading && ` · ${activeRegion.name}`}
            {activePlan !== 'all' && !loading
              && ` · ${planGroups.find((g) => g.id === activePlan)?.label ?? ''}`}
            {activeService !== 'all' && !loading && ` · ${activeService}`}
          </p>
        </div>

        {/* Scroll container with a sticky header: all matching rates are
            rendered at once, so the header has to survive scrolling. */}
        <div className="overflow-auto max-h-[calc(100vh-22rem)] min-h-[12rem] rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(229,231,235)]">
              <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                <th className="py-3 pl-3 pr-3">City</th>
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
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400">
                    {activePlan === 'all'
                      ? `No rates for ${activeRegion?.name ?? 'this city'} yet. Click Add Rate to create one.`
                      : `No ${planGroups.find((g) => g.id === activePlan)?.label ?? ''} rates for ${activeRegion?.name ?? 'this city'}.`}
                  </td>
                </tr>
              ) : (
                rates.map((rate) => (
                  <tr key={rate.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="py-3 pl-3 pr-3 font-semibold">{rate.region_name}</td>
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
        description="Set city, service, amount, and GST. Preview updates as you type."
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
                  City <span className="text-red-500">*</span>
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
                  Rates are priced per city.
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
