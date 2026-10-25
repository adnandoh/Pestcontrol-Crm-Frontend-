import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, PageLoading } from '../components/ui';
import DeepCleaningRateChoices from '../components/crm/DeepCleaningRateChoices';
import DeepCleaningWhatsAppMenu from '../components/crm/DeepCleaningWhatsAppMenu';
import { enhancedApiService } from '../services/api.enhanced';
import {
  DEEP_CLEANING_CITIES,
  DEEP_CLEANING_SERVICES,
  DEEP_CLEANING_SIZES,
  DEEP_CLEANING_TIMES,
  deepCleaningApiError,
} from '../constants/deepCleaning';
import { deepCleaningInquiryWhatsAppItems } from '../utils/deepCleaningWhatsApp';
import { bestDeepCleaningRate, deepCleaningRateAmount, ratesForBooking } from '../utils/deepCleaningRates';
import { loadDeepCleaningLocalities } from '../utils/deepCleaningLocalities';
import type { DeepCleaningInquiry, DeepCleaningRate } from '../types';

type FormState = {
  name: string;
  mobile: string;
  segment: string;
  service: string;
  property_size: string;
  property_type: string;
  city: string;
  area: string;
  address: string;
  preferred_date: string;
  preferred_time: string;
  estimated_price: string;
  package_name: string;
  package_id: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  name: '',
  mobile: '',
  segment: 'Residential',
  service: DEEP_CLEANING_SERVICES[0],
  property_size: '1BHK',
  property_type: 'Furnished',
  city: 'Mumbai',
  area: '',
  address: '',
  preferred_date: '',
  preferred_time: DEEP_CLEANING_TIMES[0],
  estimated_price: '',
  package_name: '',
  package_id: '',
  notes: '',
});

const DeepCleaningInquiryForm: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [rates, setRates] = useState<DeepCleaningRate[]>([]);
  const [places, setPlaces] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<DeepCleaningInquiry | null>(null);
  const ratesReady = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      enhancedApiService.getDeepCleaningRates().catch(() => [] as DeepCleaningRate[]),
      loadDeepCleaningLocalities().catch(() => ({})),
    ]).then(([rateRows, locationRows]) => {
      if (!active) return;
      setRates(rateRows.filter((rate) => rate.is_active));
      setPlaces(locationRows || {});
      setLoading(false);
      ratesReady.current = true;
    }).catch((err) => {
      if (!active) return;
      setError(deepCleaningApiError(err, 'Could not load rates.'));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ratesReady.current || saved) return;
    const choice = {
      segment: form.segment,
      service: form.service,
      propertySize: form.property_size,
      propertyType: form.property_type,
    };
    const match = bestDeepCleaningRate(rates, choice);
    if (match) {
      setForm((prev) => ({
        ...prev,
        estimated_price: deepCleaningRateAmount(match),
        package_name: match.package_name,
        package_id: match.code,
      }));
      return;
    }
    setForm((prev) => {
      const stillShown = ratesForBooking(rates, choice).some((rate) => rate.code === prev.package_id);
      if (stillShown || !prev.package_id) return prev;
      return { ...prev, estimated_price: '', package_name: '', package_id: '' };
    });
  }, [form.segment, form.service, form.property_size, form.property_type, rates, saved]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const areas = places[form.city] || [];

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const row = await enhancedApiService.createDeepCleaningInquiry({
        name: form.name.trim(),
        mobile: form.mobile,
        segment: form.segment,
        service: form.service,
        property_size: form.property_size,
        property_type: form.property_type,
        city: form.city,
        area: form.area,
        address: form.address.trim(),
        preferred_date: form.preferred_date || null,
        preferred_time: form.preferred_time,
        estimated_price: form.estimated_price === '' ? null : form.estimated_price,
        package_name: form.package_name,
        package_id: form.package_id,
        notes: form.notes.trim(),
      });
      setSaved(row);
    } catch (err) {
      setError(deepCleaningApiError(err, 'Could not save this inquiry.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading text="Loading rates..." />;

  if (saved) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <h1 className="text-xl font-semibold text-slate-900">Inquiry saved</h1>
        <p className="text-sm text-slate-600">
          {saved.name} · {saved.mobile}. Open WhatsApp, check the message, and send it yourself.
        </p>
        <DeepCleaningWhatsAppMenu items={deepCleaningInquiryWhatsAppItems(saved)} />
        <div>
          <Button type="button" variant="outline" onClick={() => navigate('/deepcleaning-inquiries')}>
            Back to inquiries
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Create Deep Cleaning inquiry</h1>
        <p className="mt-1 text-sm text-slate-600">
          This saves a lead. It does not confirm a booking. After saving, send the WhatsApp message yourself.
        </p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm">
          Customer name
          <input required className="mt-1 w-full rounded-md border px-3 py-2" value={form.name} onChange={(e) => setField('name', e.target.value)} />
        </label>
        <label className="text-sm">
          Mobile
          <input required inputMode="numeric" maxLength={10} className="mt-1 w-full rounded-md border px-3 py-2" value={form.mobile} onChange={(e) => setField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
        </label>
        <label className="text-sm">
          Property
          <select className="mt-1 w-full rounded-md border px-3 py-2" value={form.segment} onChange={(e) => setField('segment', e.target.value)}>
            <option>Residential</option>
            <option>Commercial</option>
          </select>
        </label>
        <label className="text-sm">
          Service
          <select className="mt-1 w-full rounded-md border px-3 py-2" value={form.service} onChange={(e) => setField('service', e.target.value)}>
            {DEEP_CLEANING_SERVICES.map((service) => <option key={service}>{service}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Home size
          <select className="mt-1 w-full rounded-md border px-3 py-2" value={form.property_size} onChange={(e) => setField('property_size', e.target.value)}>
            {DEEP_CLEANING_SIZES.map((size) => <option key={size}>{size}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Condition
          <select className="mt-1 w-full rounded-md border px-3 py-2" value={form.property_type} onChange={(e) => setField('property_type', e.target.value)}>
            <option>Furnished</option>
            <option>Empty</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <DeepCleaningRateChoices
            rates={rates}
            segment={form.segment}
            service={form.service}
            propertySize={form.property_size}
            propertyType={form.property_type}
            selectedCode={form.package_id}
            onSelect={(rate) => {
              setForm((prev) => ({
                ...prev,
                estimated_price: deepCleaningRateAmount(rate),
                package_name: rate.package_name,
                package_id: rate.code,
              }));
            }}
          />
        </div>
        <label className="text-sm">
          City
          <select className="mt-1 w-full rounded-md border px-3 py-2" value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value, area: '' }))}>
            {DEEP_CLEANING_CITIES.map((city) => <option key={city}>{city}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Locality
          <select className="mt-1 w-full rounded-md border px-3 py-2" value={areas.includes(form.area) ? form.area : ''} onChange={(e) => setField('area', e.target.value)}>
            <option value="">Select locality</option>
            {areas.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="Or type the locality"
            value={form.area}
            onChange={(e) => setField('area', e.target.value)}
          />
        </label>
        <label className="text-sm">
          Estimated amount (excl. GST)
          <input inputMode="decimal" className="mt-1 w-full rounded-md border px-3 py-2" value={form.estimated_price} onChange={(e) => setField('estimated_price', e.target.value)} />
        </label>
        <label className="text-sm">
          Package
          <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.package_name} onChange={(e) => setField('package_name', e.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2">
          Address
          <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.address} onChange={(e) => setField('address', e.target.value)} />
        </label>
        <label className="text-sm">
          Date
          <input type="date" className="mt-1 w-full rounded-md border px-3 py-2" value={form.preferred_date} onChange={(e) => setField('preferred_date', e.target.value)} />
        </label>
        <label className="text-sm">
          Time
          <select className="mt-1 w-full rounded-md border px-3 py-2" value={form.preferred_time} onChange={(e) => setField('preferred_time', e.target.value)}>
            {DEEP_CLEANING_TIMES.map((slot) => <option key={slot}>{slot}</option>)}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Notes
          <textarea rows={3} className="mt-1 w-full rounded-md border px-3 py-2" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate('/deepcleaning-inquiries')}>Back</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save inquiry'}</Button>
      </div>
    </form>
  );
};

export default DeepCleaningInquiryForm;
