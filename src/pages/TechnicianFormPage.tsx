import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { enhancedApiService } from '../services/api.enhanced';
import type { Technician } from '../types';
import { useRevenueModelV2 } from '../hooks/useRevenueModelV2';
import { showAlert } from '../utils/notify';

const fieldClass =
  'w-full h-11 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';
const selectClass = fieldClass;

type FormState = {
  name: string;
  mobile: string;
  age: string;
  alternative_mobile: string;
  service_area: string;
  city: string;
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
  service_area: '',
  city: '',
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

  useEffect(() => {
    if (!isEdit || !techId) return;
    setLoading(true);
    enhancedApiService
      .getTechnician(techId)
      .then((tech) => {
        setForm({
          name: tech.name || '',
          mobile: tech.mobile || '',
          age: tech.age?.toString() || '',
          alternative_mobile: tech.alternative_mobile || '',
          service_area: tech.service_area || '',
          city: tech.city || '',
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
        service_area: form.service_area.trim(),
        city: form.city.trim(),
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
      } else {
        await enhancedApiService.createTechnician(payload);
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
            <div>
              <label className={labelClass}>Service Area</label>
              <Input
                value={form.service_area}
                onChange={(e) => setField('service_area', e.target.value)}
                placeholder="e.g. Bandra"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <Input
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                placeholder="e.g. Mumbai"
                className={fieldClass}
              />
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
                  <option value="on_service">On service</option>
                  <option value="on_leave">On leave</option>
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
                  placeholder="0"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Aadhaar (optional)</label>
                <Input
                  value={form.aadhaar}
                  onChange={(e) => setField('aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="12 digit Aadhaar"
                  maxLength={12}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>PAN (optional)</label>
                <Input
                  value={form.pan}
                  onChange={(e) => setField('pan', e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className={fieldClass}
                />
              </div>
            </div>
          </section>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/technicians')}
            disabled={saving}
            className="h-11 min-w-[120px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="h-11 min-w-[160px] bg-blue-700 hover:bg-blue-800"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEdit ? 'Update Technician' : 'Save Technician'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TechnicianFormPage;
