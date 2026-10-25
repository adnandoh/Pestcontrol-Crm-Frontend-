import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { deepCleaningBookingWhatsAppItems } from '../utils/deepCleaningWhatsApp';
import { bestDeepCleaningRate, deepCleaningRateAmount, ratesForBooking } from '../utils/deepCleaningRates';
import { loadDeepCleaningLocalities } from '../utils/deepCleaningLocalities';
import type { DeepCleaningBooking, DeepCleaningRate } from '../types';

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
  price: string;
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
  price: '',
  package_name: '',
  package_id: '',
  notes: '',
});

function fromBooking(row: DeepCleaningBooking): FormState {
  return {
    name: row.name,
    mobile: row.mobile,
    segment: row.segment || 'Residential',
    service: row.service,
    property_size: row.property_size || '1BHK',
    property_type: row.property_type || 'Furnished',
    city: row.city,
    area: row.area || '',
    address: row.address || '',
    preferred_date: row.preferred_date || '',
    preferred_time: row.preferred_time || DEEP_CLEANING_TIMES[0],
    price: row.price === null || row.price === undefined || row.price === '' ? '' : String(row.price),
    package_name: row.package_name || '',
    package_id: row.package_id || '',
    notes: row.notes || '',
  };
}

const DeepCleaningBookingForm: React.FC = () => {
  const { id } = useParams();
  const bookingId = id ? Number(id) : null;
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saved, setSaved] = useState<DeepCleaningBooking | null>(null);
  const [rates, setRates] = useState<DeepCleaningRate[]>([]);
  const [places, setPlaces] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const skipRateFill = useRef(Boolean(bookingId));
  const locked = status === 'Done' || status === 'Cancelled';

  useEffect(() => {
    let active = true;
    const bookingRequest = bookingId
      ? enhancedApiService.getDeepCleaningBooking(bookingId)
      : Promise.resolve(null);
    Promise.all([
      bookingRequest,
      enhancedApiService.getDeepCleaningRates().catch(() => [] as DeepCleaningRate[]),
      loadDeepCleaningLocalities().catch(() => ({})),
    ]).then(([row, rateRows, locationRows]) => {
      if (!active) return;
      if (row) {
        setForm(fromBooking(row));
        setStatus(row.status);
        setSaved(row);
      }
      setRates(rateRows.filter((rate) => rate.is_active));
      setPlaces(locationRows || {});
      setLoading(false);
    }).catch((err) => {
      if (!active) return;
      setError(deepCleaningApiError(err, 'Could not load this booking.'));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [bookingId]);

  useEffect(() => {
    if (loading || locked) return;
    if (skipRateFill.current) {
      skipRateFill.current = false;
      return;
    }
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
        price: deepCleaningRateAmount(match),
        package_name: match.package_name,
        package_id: match.code,
      }));
      return;
    }
    setForm((prev) => {
      const stillShown = ratesForBooking(rates, choice).some((rate) => rate.code === prev.package_id);
      if (stillShown || !prev.package_id) return prev;
      return { ...prev, price: '', package_name: '', package_id: '' };
    });
  }, [form.segment, form.service, form.property_size, form.property_type, rates, loading, locked]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (locked) return;
    setSaving(true);
    setError('');
    const payload = {
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
      price: form.price === '' ? null : form.price,
      package_name: form.package_name.trim(),
      package_id: form.package_id,
      notes: form.notes.trim(),
    };
    try {
      const row = bookingId
        ? await enhancedApiService.updateDeepCleaningBooking(bookingId, payload)
        : await enhancedApiService.createDeepCleaningBooking(payload);
      setSaved(row);
      setStatus(row.status);
      if (!bookingId) {
        navigate(`/deepcleaning-bookings/edit/${row.id}`, { replace: true });
      }
    } catch (err) {
      setError(deepCleaningApiError(err, 'Could not save this booking.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading text="Loading booking..." />;

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {bookingId ? 'Edit Deep Cleaning booking' : 'Create Deep Cleaning booking'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          A new booking starts in Pending. The price comes from the rate for this service and home size. GST is extra.
        </p>
      </div>
      {saved && saved.status !== 'Cancelled' ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-700">WhatsApp for {saved.code || 'this booking'}</p>
          <DeepCleaningWhatsAppMenu items={deepCleaningBookingWhatsAppItems(saved)} />
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {locked ? <p className="text-sm text-slate-600">This booking is {status} and can no longer be edited.</p> : null}
      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm">
          Customer name
          <input required disabled={locked} className="mt-1 w-full rounded-md border px-3 py-2" value={form.name} onChange={(e) => setField('name', e.target.value)} />
        </label>
        <label className="text-sm">
          Mobile
          <input required disabled={locked} inputMode="numeric" maxLength={10} className="mt-1 w-full rounded-md border px-3 py-2" value={form.mobile} onChange={(e) => setField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
        </label>
        <label className="text-sm">
          Property
          <select disabled={locked} className="mt-1 w-full rounded-md border px-3 py-2" value={form.segment} onChange={(e) => setField('segment', e.target.value)}>
            <option>Residential</option>
            <option>Commercial</option>
          </select>
        </label>
        <label className="text-sm">
          Service
          <select disabled={locked} className="mt-1 w-full rounded-md border px-3 py-2" value={form.service} onChange={(e) => setField('service', e.target.value)}>
            {DEEP_CLEANING_SERVICES.map((service) => <option key={service}>{service}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Home size
          <select disabled={locked} className="mt-1 w-full rounded-md border px-3 py-2" value={form.property_size} onChange={(e) => setField('property_size', e.target.value)}>
            {DEEP_CLEANING_SIZES.map((size) => <option key={size}>{size}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Condition
          <select disabled={locked} className="mt-1 w-full rounded-md border px-3 py-2" value={form.property_type} onChange={(e) => setField('property_type', e.target.value)}>
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
            disabled={locked}
            onSelect={(rate) => {
              setForm((prev) => ({
                ...prev,
                price: deepCleaningRateAmount(rate),
                package_name: rate.package_name,
                package_id: rate.code,
              }));
            }}
          />
        </div>
        <label className="text-sm">
          City
          <select disabled={locked} className="mt-1 w-full rounded-md border px-3 py-2" value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value, area: '' }))}>
            {DEEP_CLEANING_CITIES.map((city) => <option key={city}>{city}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Locality
          <select disabled={locked} className="mt-1 w-full rounded-md border px-3 py-2" value={(places[form.city] || []).includes(form.area) ? form.area : ''} onChange={(e) => setField('area', e.target.value)}>
            <option value="">Select locality</option>
            {(places[form.city] || []).map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
          <input
            disabled={locked}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="Or type the locality"
            value={form.area}
            onChange={(e) => setField('area', e.target.value)}
          />
        </label>
        <label className="text-sm">
          Price (excl. GST)
          <input disabled={locked} inputMode="decimal" className="mt-1 w-full rounded-md border px-3 py-2" value={form.price} onChange={(e) => setField('price', e.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2">
          Address
          <input required disabled={locked} className="mt-1 w-full rounded-md border px-3 py-2" value={form.address} onChange={(e) => setField('address', e.target.value)} />
        </label>
        <label className="text-sm">
          Date
          <input disabled={locked} type="date" className="mt-1 w-full rounded-md border px-3 py-2" value={form.preferred_date} onChange={(e) => setField('preferred_date', e.target.value)} />
        </label>
        <label className="text-sm">
          Time
          <select disabled={locked} className="mt-1 w-full rounded-md border px-3 py-2" value={form.preferred_time} onChange={(e) => setField('preferred_time', e.target.value)}>
            {DEEP_CLEANING_TIMES.map((slot) => <option key={slot}>{slot}</option>)}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          Package
          <input disabled={locked} className="mt-1 w-full rounded-md border px-3 py-2" value={form.package_name} onChange={(e) => setField('package_name', e.target.value)} />
        </label>
        <label className="text-sm sm:col-span-2">
          Notes
          <textarea disabled={locked} rows={3} className="mt-1 w-full rounded-md border px-3 py-2" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => navigate('/deepcleaning-bookings')}>Back</Button>
        {locked ? null : <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save booking'}</Button>}
      </div>
    </form>
  );
};

export default DeepCleaningBookingForm;
