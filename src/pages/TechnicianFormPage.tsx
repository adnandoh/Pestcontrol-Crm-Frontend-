import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, UserPlus, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { enhancedApiService } from '../services/api.enhanced';
import type { City, Technician } from '../types';
import { useRevenueModelV2 } from '../hooks/useRevenueModelV2';
import { showAlert } from '../utils/notify';
import TechnicianMonthlyPerformancePanel from '../components/crm/TechnicianMonthlyPerformancePanel';
import { SERVICE_TYPES } from '../constants/pricing';

const fieldClass =
  'w-full h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';
const selectClass = fieldClass;

/** Pest services only — Hotel / Commercial is a property category, not a base service. */
const BASE_SERVICE_OPTIONS = (Object.keys(SERVICE_TYPES) as string[]).filter(
  (name) => name !== 'Hotel / Commercial',
);

type FormState = {
  name: string;
  mobile: string;
  age: string;
  alternative_mobile: string;
  service_city_ids: number[];
  base_services: string[];
  is_active: boolean;
  technician_type: 'partner' | 'salaried';
  branch: string;
  aadhaar: string;
  pan: string;
  presence_status: NonNullable<Technician['presence_status']>;
  security_deposit_status: NonNullable<Technician['security_deposit_status']>;
  security_deposit_amount: string;
};

const emptyForm: FormState = {
  name: '',
  mobile: '',
  age: '',
  alternative_mobile: '',
  service_city_ids: [],
  // Technicians handle all pest work by default; staff can narrow later.
  base_services: [...BASE_SERVICE_OPTIONS],
  is_active: true,
  technician_type: 'partner',
  branch: '',
  aadhaar: '',
  pan: '',
  presence_status: 'offline',
  security_deposit_status: 'pending',
  security_deposit_amount: '',
};

const TechnicianFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const techId = id ? Number(id) : null;
  const revenueModelEnabled = useRevenueModelV2();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [cities, setCities] = useState<City[]>([]);
  const [citySearch, setCitySearch] = useState('');

  useEffect(() => {
    enhancedApiService
      .getCities({ is_active: true, page_size: 200 })
      .then((res) => {
        const rows = Array.isArray(res) ? res : res?.results || [];
        setCities(rows as City[]);
      })
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!isEdit || !techId) return;
    setLoading(true);
    enhancedApiService
      .getTechnician(techId)
      .then((tech) => {
        const fromM2M = (tech.service_cities || []).map((c) => c.id);
        const rawServices = tech.base_services?.length
          ? [...tech.base_services]
          : tech.skills?.length
            ? [...tech.skills]
            : [];
        const cleaned = rawServices.filter(
          (s) => s && s !== 'Hotel / Commercial' && BASE_SERVICE_OPTIONS.includes(s),
        );
        setForm({
          name: tech.name || '',
          mobile: tech.mobile || '',
          age: tech.age?.toString() || '',
          alternative_mobile: tech.alternative_mobile || '',
          service_city_ids: fromM2M,
          // Empty / legacy → all pest services selected (current default).
          base_services: cleaned.length ? cleaned : [...BASE_SERVICE_OPTIONS],
          is_active: tech.is_active,
          technician_type: tech.technician_type || 'partner',
          branch: tech.branch || '',
          aadhaar: tech.aadhaar || '',
          pan: tech.pan || '',
          presence_status: tech.presence_status || 'offline',
          security_deposit_status: tech.security_deposit_status || 'pending',
          security_deposit_amount: tech.security_deposit_amount?.toString() || '',
        });
      })
      .catch(() => {
        showAlert('Technician not found');
        navigate('/technicians');
      })
      .finally(() => setLoading(false));
  }, [isEdit, techId, navigate]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectedCities = useMemo(
    () => cities.filter((c) => form.service_city_ids.includes(c.id)),
    [cities, form.service_city_ids],
  );

  const availableCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    return cities
      .filter((c) => !form.service_city_ids.includes(c.id))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.state_name || '').toLowerCase().includes(q))
      .slice(0, 40);
  }, [cities, form.service_city_ids, citySearch]);

  const addCity = (cityId: number) => {
    if (!cityId || form.service_city_ids.includes(cityId)) return;
    setField('service_city_ids', [...form.service_city_ids, cityId]);
    setCitySearch('');
  };

  const removeCity = (cityId: number) => {
    setField(
      'service_city_ids',
      form.service_city_ids.filter((id) => id !== cityId),
    );
  };

  const toggleBaseService = (service: string) => {
    setField(
      'base_services',
      form.base_services.includes(service)
        ? form.base_services.filter((s) => s !== service)
        : [...form.base_services, service],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mobile = form.mobile.replace(/\D/g, '').slice(0, 10);
    if (!form.name.trim() || mobile.length !== 10) {
      showAlert('Please enter full name and a valid 10-digit mobile number.');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<Technician> = {
        name: form.name.trim(),
        mobile,
        age: form.age ? parseInt(form.age, 10) : undefined,
        alternative_mobile: form.alternative_mobile
          ? form.alternative_mobile.replace(/\D/g, '').slice(0, 10)
          : '',
        service_city_ids: form.service_city_ids,
        base_services: form.base_services,
        is_active: form.is_active,
      };

      if (revenueModelEnabled) {
        Object.assign(payload, {
          technician_type: form.technician_type,
          branch: form.branch.trim(),
          aadhaar: form.aadhaar.trim(),
          pan: form.pan.trim().toUpperCase(),
          presence_status: form.presence_status,
          security_deposit_status: form.security_deposit_status,
          security_deposit_amount: form.security_deposit_amount
            ? Number(form.security_deposit_amount)
            : 0,
        });
      }

      if (isEdit && techId) {
        await enhancedApiService.updateTechnician(techId, payload);
        if (form.service_city_ids.length) {
          await enhancedApiService.updateTechnicianServiceAreas(techId, form.service_city_ids);
        }
      } else {
        const created = await enhancedApiService.createTechnician(payload);
        if (created?.id && form.service_city_ids.length) {
          await enhancedApiService.updateTechnicianServiceAreas(created.id, form.service_city_ids);
        }
      }
      navigate('/technicians');
    } catch (error: unknown) {
      const apiErr = error as { message?: string; details?: Record<string, string[] | string> };
      let msg = apiErr.message || 'Failed to save technician.';
      if (apiErr.details?.mobile) {
        msg = Array.isArray(apiErr.details.mobile)
          ? apiErr.details.mobile[0]
          : String(apiErr.details.mobile);
      }
      showAlert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/technicians"
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to technicians
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <UserPlus className="h-7 w-7 text-blue-700" />
            {isEdit ? 'Edit Technician' : 'Add Technician'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEdit
              ? 'Update technician details and assignment settings'
              : 'Fill basic details to register a new technician'}
          </p>
        </div>
      </div>

      {isEdit && techId != null && (
        <TechnicianMonthlyPerformancePanel technicianId={techId} />
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-4 border-b border-gray-100 pb-2 text-base font-semibold text-gray-800">
            General Details
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <label className={labelClass}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="Enter full name"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Age</label>
              <Input
                type="number"
                min={18}
                max={80}
                value={form.age}
                onChange={(e) => setField('age', e.target.value)}
                placeholder="Age"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <Input
                required
                value={form.mobile}
                onChange={(e) => setField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10 digit mobile"
                maxLength={10}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Alt Mobile</label>
              <Input
                value={form.alternative_mobile}
                onChange={(e) =>
                  setField('alternative_mobile', e.target.value.replace(/\D/g, '').slice(0, 10))
                }
                placeholder="Optional"
                maxLength={10}
                className={fieldClass}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className={labelClass}>
                Service Areas
              </label>
              <p className="mb-2 text-xs text-gray-500">
                Optional. Used for partner app job filtering. CRM desk can assign any active
                technician regardless of service areas.
              </p>
              <div className="flex flex-wrap gap-2 mb-3 min-h-[2.25rem]">
                {selectedCities.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">No service areas selected</span>
                ) : (
                  selectedCities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => removeCity(city.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100"
                    >
                      {city.name}
                      <X className="h-3 w-3" />
                    </button>
                  ))
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="Search city to add…"
                  className={fieldClass}
                />
                <select
                  className={selectClass}
                  value=""
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id) addCity(id);
                  }}
                >
                  <option value="">+ Add Service Area</option>
                  {availableCities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                      {city.state_name ? ` (${city.state_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className={labelClass}>Base Services</label>
              <p className="mb-2 text-xs text-gray-500">
                Pest services this technician can handle. All are selected by default.
                Uncheck only if you want Partner App New Bookings limited to specific services.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {BASE_SERVICE_OPTIONS.map((service) => {
                  const checked = form.base_services.includes(service);
                  return (
                    <label
                      key={service}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                        checked
                          ? 'border-blue-300 bg-blue-50 text-blue-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBaseService(service)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-600"
                      />
                      {service}
                    </label>
                  );
                })}
              </div>
              {form.base_services.length > 0 && (
                <p className="mt-2 text-xs font-medium text-blue-700">
                  Selected: {form.base_services.join(' · ')}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>Branch</label>
              <Input
                value={form.branch}
                onChange={(e) => setField('branch', e.target.value)}
                placeholder="Branch name"
                className={fieldClass}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setField('is_active', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-700 focus:ring-blue-600"
                />
                Active / available for assignment
              </label>
            </div>
          </div>
        </section>

        {revenueModelEnabled && (
          <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-1 border-b border-emerald-100 pb-2 text-base font-semibold text-emerald-900">
              Payment Type & Compliance
            </h2>
            <p className="mb-4 text-xs text-emerald-800/80">
              Partner = 40% share · Salaried = fixed salary (no 40% pool)
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>
                  Technician Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.technician_type}
                  onChange={(e) =>
                    setField('technician_type', e.target.value as FormState['technician_type'])
                  }
                  className={selectClass}
                >
                  <option value="partner">Partner (40/60)</option>
                  <option value="salaried">Salaried</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Presence Status</label>
                <select
                  value={form.presence_status}
                  onChange={(e) =>
                    setField(
                      'presence_status',
                      e.target.value as FormState['presence_status'],
                    )
                  }
                  className={selectClass}
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="busy">Busy</option>
                  <option value="on_service">On Service</option>
                  <option value="on_leave">On Leave</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Deposit Status</label>
                <select
                  value={form.security_deposit_status}
                  onChange={(e) =>
                    setField(
                      'security_deposit_status',
                      e.target.value as FormState['security_deposit_status'],
                    )
                  }
                  className={selectClass}
                >
                  <option value="pending">Pending</option>
                  <option value="collected">Collected</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Deposit Amount (₹)</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.security_deposit_amount}
                  onChange={(e) => setField('security_deposit_amount', e.target.value)}
                  placeholder="0.00"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Aadhaar (optional)</label>
                <Input
                  value={form.aadhaar}
                  onChange={(e) => setField('aadhaar', e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>PAN (optional)</label>
                <Input
                  value={form.pan}
                  onChange={(e) => setField('pan', e.target.value.toUpperCase())}
                  className={fieldClass}
                />
              </div>
            </div>
          </section>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/technicians')}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="gap-2 bg-blue-700 hover:bg-blue-800">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? 'Save Changes' : 'Create Technician'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TechnicianFormPage;
