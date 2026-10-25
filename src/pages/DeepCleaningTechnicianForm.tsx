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
import { loadDeepCleaningLocalities } from '../utils/deepCleaningLocalities';

type Locality = { city: string; name: string };

type FormState = {
  name: string;
  mobile: string;
  age: string;
  alternative_mobile: string;
  address: string;
  cities: string[];
  localities: Locality[];
  services: string[];
  presence_status: 'active' | 'on_leave' | 'suspended';
};

const emptyForm = (): FormState => ({
  name: '',
  mobile: '',
  age: '',
  alternative_mobile: '',
  address: '',
  cities: [],
  localities: [],
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
  const [places, setPlaces] = useState<Record<string, string[]>>({});
  const [localityDraft, setLocalityDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const technicianRequest = techId
      ? enhancedApiService.getDeepCleaningTechnician(techId)
      : Promise.resolve(null);
    Promise.all([
      technicianRequest,
      loadDeepCleaningLocalities().catch(() => ({})),
    ]).then(([row, locationRows]) => {
      if (!active) return;
      if (row) {
        setForm({
          name: row.name,
          mobile: row.mobile,
          age: row.age ? String(row.age) : '',
          alternative_mobile: row.alternative_mobile || '',
          address: row.address || '',
          cities: row.cities || [],
          localities: row.localities || [],
          services: row.services || [],
          presence_status: row.presence_status,
        });
      }
      setPlaces(locationRows || {});
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
      location: form.localities.map((item) => item.name).join(', '),
      cities: form.cities,
      localities: form.localities,
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
        <label className="text-sm sm:col-span-2">
          Address
          <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.address} onChange={(e) => setField('address', e.target.value)} />
        </label>
        <fieldset className="text-sm sm:col-span-2">
          <legend className="mb-2">Cities</legend>
          <div className="flex flex-wrap gap-2">
            {DEEP_CLEANING_CITIES.map((city) => (
              <label key={city} className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1">
                <input
                  type="checkbox"
                  checked={form.cities.includes(city)}
                  onChange={() => {
                    const cities = toggle(form.cities, city);
                    setForm((prev) => ({
                      ...prev,
                      cities,
                      localities: prev.localities.filter((item) => cities.includes(item.city)),
                    }));
                  }}
                />
                {city}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="text-sm sm:col-span-2">
          <legend className="mb-2">Localities</legend>
          {form.cities.length === 0 ? (
            <p className="text-slate-500">Select a city to choose its localities.</p>
          ) : (
            <div className="space-y-3">
              {form.cities.map((city) => {
                const names = places[city] || [];
                const extras = form.localities
                  .filter((item) => item.city === city && !names.includes(item.name))
                  .map((item) => item.name);
                const options = [...extras, ...names];
                return (
                  <div key={city}>
                    <p className="mb-1 font-medium text-slate-800">{city}</p>
                    {options.length === 0 ? (
                      <p className="text-slate-500">No saved localities for {city}. Type one below.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {options.map((name) => {
                          const checked = form.localities.some((item) => item.city === city && item.name === name);
                          return (
                            <label key={`${city}-${name}`} className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setForm((prev) => ({
                                    ...prev,
                                    localities: checked
                                      ? prev.localities.filter((item) => !(item.city === city && item.name === name))
                                      : [...prev.localities, { city, name }],
                                  }));
                                }}
                              />
                              {name}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-2 flex max-w-md gap-2">
                      <input
                        className="w-full rounded-md border px-3 py-1.5"
                        placeholder={`Add a ${city} locality`}
                        value={localityDraft[city] || ''}
                        onChange={(e) => setLocalityDraft((prev) => ({ ...prev, [city]: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="rounded-md border px-3 py-1.5 text-sm font-semibold"
                        onClick={() => {
                          const name = (localityDraft[city] || '').trim();
                          if (!name) return;
                          setForm((prev) => (
                            prev.localities.some((item) => item.city === city && item.name.toLowerCase() === name.toLowerCase())
                              ? prev
                              : { ...prev, localities: [...prev.localities, { city, name }] }
                          ));
                          setLocalityDraft((prev) => ({ ...prev, [city]: '' }));
                        }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
