import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, ConfirmationModal, Modal, PageLoading } from '../components/ui';
import { DEEP_CLEANING_SERVICES } from '../constants/deepCleaning';
import { enhancedApiService } from '../services/api.enhanced';
import type { DeepCleaningRate } from '../types';

const SERVICES = [...DEEP_CLEANING_SERVICES];

type FormState = {
  code: string;
  segment: 'Residential' | 'Commercial';
  service: string;
  package_name: string;
  billing_unit: string;
  example_qty: string;
  rate_per_unit: string;
  min_charge: string;
  job_amount: string;
  technicians: string;
  on_site_hours: string;
  scope_note: string;
  amc_visits: string;
  amc_discount: string;
  amc_per_visit: string;
  amc_annual: string;
  amc_interval: string;
  is_active: boolean;
  sort_order: string;
};

const emptyForm = (): FormState => ({
  code: '',
  segment: 'Residential',
  service: SERVICES[0],
  package_name: '',
  billing_unit: 'package',
  example_qty: '1',
  rate_per_unit: '',
  min_charge: '',
  job_amount: '',
  technicians: '1',
  on_site_hours: '',
  scope_note: '',
  amc_visits: '2',
  amc_discount: '0.05',
  amc_per_visit: '',
  amc_annual: '',
  amc_interval: 'Every 6 months',
  is_active: true,
  sort_order: '0',
});

function money(value: string | number | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

function discountForVisits(visits: number) {
  if (visits >= 12) return 0.15;
  if (visits >= 6) return 0.12;
  if (visits >= 4) return 0.1;
  if (visits >= 2) return 0.05;
  return 0;
}

function intervalForVisits(visits: number) {
  if (visits >= 12) return 'Monthly';
  if (visits >= 4) return 'Every 3 months';
  if (visits >= 2) return 'Every 6 months';
  return '';
}

function apiError(err: unknown) {
  const data = (err as { response?: { data?: unknown }; message?: string })?.response?.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>)
      .map(([field, value]) => {
        const text = Array.isArray(value) ? value.join(' ') : String(value);
        return field === 'non_field_errors' ? text : `${field}: ${text}`;
      })
      .join(' · ');
  }
  return (err as { message?: string })?.message || 'Could not save this rate.';
}

function fromRate(rate: DeepCleaningRate): FormState {
  return {
    code: rate.code,
    segment: rate.segment,
    service: rate.service,
    package_name: rate.package_name,
    billing_unit: rate.billing_unit,
    example_qty: String(rate.example_qty),
    rate_per_unit: String(rate.rate_per_unit),
    min_charge: String(rate.min_charge),
    job_amount: String(rate.job_amount),
    technicians: String(rate.technicians),
    on_site_hours: rate.on_site_hours,
    scope_note: rate.scope_note,
    amc_visits: String(rate.amc_visits),
    amc_discount: String(rate.amc_discount),
    amc_per_visit: String(rate.amc_per_visit),
    amc_annual: String(rate.amc_annual),
    amc_interval: rate.amc_interval,
    is_active: rate.is_active,
    sort_order: String(rate.sort_order),
  };
}

const DeepCleaningRates: React.FC = () => {
  const [rows, setRows] = useState<DeepCleaningRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [segment, setSegment] = useState('');
  const [service, setService] = useState('');
  const [query, setQuery] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DeepCleaningRate | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<DeepCleaningRate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await enhancedApiService.getDeepCleaningRates();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!showHidden && !row.is_active) return false;
      if (segment && row.segment !== segment) return false;
      if (service && row.service !== service) return false;
      if (!q) return true;
      return `${row.code} ${row.package_name} ${row.service} ${row.scope_note}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, segment, service, query, showHidden]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError('');
    setFormOpen(true);
  }

  function openEdit(rate: DeepCleaningRate) {
    setEditing(rate);
    setForm(fromRate(rate));
    setFormError('');
    setFormOpen(true);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function recalculateAmc() {
    const visits = Number(form.amc_visits) || 0;
    const job = Number(form.job_amount) || 0;
    const discount = discountForVisits(visits);
    const perVisit = Math.round(job * (1 - discount));
    setForm((current) => ({
      ...current,
      amc_discount: String(discount),
      amc_per_visit: String(perVisit),
      amc_annual: String(perVisit * visits),
      amc_interval: current.amc_interval || intervalForVisits(visits),
    }));
  }

  async function save() {
    setSaving(true);
    setFormError('');
    const payload = {
      code: form.code.trim(),
      segment: form.segment,
      service: form.service.trim(),
      package_name: form.package_name.trim(),
      billing_unit: form.billing_unit.trim() || 'package',
      example_qty: form.example_qty || '1',
      rate_per_unit: form.rate_per_unit || '0',
      min_charge: form.min_charge || '0',
      job_amount: form.job_amount || '0',
      technicians: Number(form.technicians) || 1,
      on_site_hours: form.on_site_hours.trim(),
      scope_note: form.scope_note.trim(),
      amc_visits: Number(form.amc_visits) || 0,
      amc_discount: form.amc_discount || '0',
      amc_per_visit: form.amc_per_visit || '0',
      amc_annual: form.amc_annual || '0',
      amc_interval: form.amc_interval.trim(),
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    try {
      if (editing) {
        await enhancedApiService.updateDeepCleaningRate(editing.id, payload);
      } else {
        await enhancedApiService.createDeepCleaningRate(payload);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await enhancedApiService.deleteDeepCleaningRate(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">DeepCleaning99 Prices</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Diwali 2026 selling rates for deepcleaning99.com. The amount shown is the customer price
            and excludes GST. The 30% OFF label on the website does not reduce it. Older rates stay
            hidden so they do not conflict with Standard and Premium.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add rate
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          value={segment}
          onChange={(event) => setSegment(event.target.value)}
        >
          <option value="">All properties</option>
          <option>Residential</option>
          <option>Commercial</option>
        </select>
        <select
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          value={service}
          onChange={(event) => setService(event.target.value)}
        >
          <option value="">All services</option>
          {SERVICES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <input
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Search code or package"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(event) => setShowHidden(event.target.checked)}
          />
          Show hidden rates
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <PageLoading text="Loading rates..." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Package</th>
                <th className="px-3 py-2">One-time</th>
                <th className="px-3 py-2">AMC / year</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{row.code}</td>
                  <td className="px-3 py-2">
                    <div>{row.package_name}</div>
                    <div className="text-xs text-slate-500">
                      {row.segment} · {row.service}
                    </div>
                  </td>
                  <td className="px-3 py-2">{money(row.job_amount)}</td>
                  <td className="px-3 py-2">
                    {money(row.amc_annual)}
                    <div className="text-xs text-slate-500">
                      {row.amc_visits} visits · {row.amc_interval}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={row.is_active ? 'success' : 'secondary'}>
                      {row.is_active ? 'On website' : 'Hidden'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPendingDelete(row)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length ? (
                <tr>
                  <td className="px-3 py-6 text-slate-500" colSpan={6}>
                    No rates match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? `Update ${editing.code}` : 'Add DeepCleaning99 rate'}
        description="These amounts exclude GST. They are the selling rates. The website 30% OFF label does not change them."
        size="lg"
      >
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {formError ? <p className="sm:col-span-2 text-sm text-red-600">{formError}</p> : null}
          <label className="text-sm">
            Code
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.code} onChange={(e) => setField('code', e.target.value)} />
          </label>
          <label className="text-sm">
            Property
            <select className="mt-1 w-full rounded-md border px-3 py-2" value={form.segment} onChange={(e) => setField('segment', e.target.value as FormState['segment'])}>
              <option>Residential</option>
              <option>Commercial</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            Service
            <input className="mt-1 w-full rounded-md border px-3 py-2" list="dc-services" value={form.service} onChange={(e) => setField('service', e.target.value)} />
            <datalist id="dc-services">
              {SERVICES.map((item) => <option key={item} value={item} />)}
            </datalist>
          </label>
          <label className="text-sm sm:col-span-2">
            Package
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.package_name} onChange={(e) => setField('package_name', e.target.value)} />
          </label>
          <label className="text-sm">
            Billing unit
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.billing_unit} onChange={(e) => setField('billing_unit', e.target.value)} />
          </label>
          <label className="text-sm">
            Example quantity
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.example_qty} onChange={(e) => setField('example_qty', e.target.value)} />
          </label>
          <label className="text-sm">
            Rate / unit
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.rate_per_unit} onChange={(e) => setField('rate_per_unit', e.target.value)} />
          </label>
          <label className="text-sm">
            Minimum charge
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.min_charge} onChange={(e) => setField('min_charge', e.target.value)} />
          </label>
          <label className="text-sm">
            One-time job amount
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.job_amount} onChange={(e) => setField('job_amount', e.target.value)} />
          </label>
          <label className="text-sm">
            Technicians
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.technicians} onChange={(e) => setField('technicians', e.target.value)} />
          </label>
          <label className="text-sm">
            On-site hours
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.on_site_hours} onChange={(e) => setField('on_site_hours', e.target.value)} />
          </label>
          <label className="text-sm">
            Sort order
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.sort_order} onChange={(e) => setField('sort_order', e.target.value)} />
          </label>
          <label className="text-sm sm:col-span-2">
            Scope note
            <textarea className="mt-1 w-full rounded-md border px-3 py-2" rows={2} value={form.scope_note} onChange={(e) => setField('scope_note', e.target.value)} />
          </label>
          <label className="text-sm">
            AMC visits / year
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.amc_visits} onChange={(e) => setField('amc_visits', e.target.value)} />
          </label>
          <label className="text-sm">
            AMC interval
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.amc_interval} onChange={(e) => setField('amc_interval', e.target.value)} />
          </label>
          <label className="text-sm">
            AMC per visit
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.amc_per_visit} onChange={(e) => setField('amc_per_visit', e.target.value)} />
          </label>
          <label className="text-sm">
            AMC annual
            <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.amc_annual} onChange={(e) => setField('amc_annual', e.target.value)} />
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
              Show on the website
            </label>
            <button type="button" className="text-sm text-slate-700 underline" onClick={recalculateAmc}>
              Recalculate AMC from the one-time amount
            </button>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Update rate' : 'Add rate'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmationModal
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this rate?"
        message={pendingDelete ? `${pendingDelete.code} — ${pendingDelete.package_name} will be removed from the website and the master list.` : ''}
        confirmText="Delete"
        type="danger"
        isLoading={deleting}
      />
    </div>
  );
};

export default DeepCleaningRates;
