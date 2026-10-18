import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, PageLoading } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import {
  DEEP_CLEANING_CITIES,
  DEEP_CLEANING_PRESENCE,
  DEEP_CLEANING_SERVICES,
  deepCleaningApiError,
} from '../constants/deepCleaning';

type FormState = {
  name: string;
  mobile: string;
  age: string;
  alternative_mobile: string;
  address: string;
  location: string;
  cities: string[];
  services: string[];
  presence_status: 'active' | 'on_leave' | 'suspended';
};

const emptyForm = (): FormState => ({
  name: '',
  mobile: '',
  age: '',
  alternative_mobile: '',
  address: '',
  location: '',
  cities: [],
  services: [],
  presence_status: 'active',
});

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

const DeepCleaningTechnicianForm: React.FC = () => {
  const { id } = useParams();
  const techId = id ? Number(id) : null;
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(Boolean(techId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!techId) return;
    let active = true;
    enhancedApiService.getDeepCleaningTechnician(techId).then((row) => {
      if (!active) return;
      setForm({
        name: row.name,
        mobile: row.mobile,
        age: row.age ? String(row.age) : '',
        alternative_mobile: row.alternative_mobile || '',
        address: row.address || '',
        location: row.location || '',
        cities: row.cities || [],
        services: row.services || [],
        presence_status: row.presence_status,
      });
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      setError(deepCleaningApiError(err, 'Could not load this technician.'));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [techId]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      mobile: form.mobile,
      age: form.age ? Number(form.age) : null,
      alternative_mobile: form.alternative_mobile || null,
      address: form.address.trim(),
      location: form.location.trim(),
      cities: form.cities,
      services: form.services,
      presence_status: form.presence_status,
      is_active: true,
    };
    try {
      if (techId) {
        await enhancedApiService.updateDeepCleaningTechnician(techId, payload);
      } else {
        await enhancedApiService.createDeepCleaningTechnician(payload);
      }
      navigate('/deepcleaning-technicians');
    } catch (err) {
      setError(deepCleaningApiError(err, 'Could not save this technician.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading text="Loading technician..." />;

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {techId ? 'Edit Deep Cleaning technician' : 'Add Deep Cleaning technician'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Active technicians can be assigned to a cleaning booking. On Leave and Suspended stay off the assign list.
        </p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm sm:col-span-2">
          Full name
          <input required className="mt-1 w-full rounded-md border px-3 py-2" value={form.name} onChange={(e) => setField('name', e.target.value)} />
        </label>
        <label className="text-sm">
          Mobile
          <input required inputMode="numeric" maxLength={10} className="mt-1 w-full rounded-md border px-3 py-2" value={form.mobile} onChange={(e) => setField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
        </label>
        <label className="text-sm">
          Age
          <input type="number" min={18} max={80} className="mt-1 w-full rounded-md border px-3 py-2" value={form.age} onChange={(e) => setField('age', e.target.value)} />
        </label>
        <label className="text-sm">
          Alternate mobile
          <input inputMode="numeric" maxLength={10} className="mt-1 w-full rounded-md border px-3 py-2" value={form.alternative_mobile} onChange={(e) => setField('alternative_mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
        </label>
        <label className="text-sm">
          Location
          <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.location} onChange={(e) => setField('location', e.target.value)} placeholder="Area, city" />
        </label>
        <label className="text-sm sm:col-span-2">
          Address
          <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.address} onChange={(e) => setField('address', e.target.value)} />
        </label>
        <fieldset className="text-sm">
          <legend className="mb-2">Cities</legend>
          <div className="flex flex-wrap gap-2">
            {DEEP_CLEANING_CITIES.map((city) => (
              <label key={city} className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1">
                <input type="checkbox" checked={form.cities.includes(city)} onChange={() => setField('cities', toggle(form.cities, city))} />
                {city}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="text-sm">
          <legend className="mb-2">Services</legend>
          <div className="flex flex-col gap-1">
            {DEEP_CLEANING_SERVICES.map((service) => (
              <label key={service} className="inline-flex items-center gap-2">
                <input type="checkbox" checked={form.services.includes(service)} onChange={() => setField('services', toggle(form.services, service))} />
                {service}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="text-sm">
          Status
          <select className="mt-1 w-full rounded-md border px-3 py-2" value={form.presence_status} onChange={(e) => setField('presence_status', e.target.value as FormState['presence_status'])}>
            {DEEP_CLEANING_PRESENCE.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate('/deepcleaning-technicians')}>Back</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save technician'}</Button>
      </div>
    </form>
  );
};

export default DeepCleaningTechnicianForm;
