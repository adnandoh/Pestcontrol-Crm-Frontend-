import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Save,
  UserPlus,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { enhancedApiService } from '../services/api.enhanced';
import { STAFF_ROLE_OPTIONS, type StaffRoleLabel } from '../constants/staffRoles';
import type { StaffUser } from '../types';
import { cn } from '../utils/cn';
import { showAlert } from '../utils/notify';

const StaffFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const staffId = id ? Number(id) : null;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState<StaffUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    password: '',
    role: 'Staff' as StaffRoleLabel,
    is_active: true,
  });

  useEffect(() => {
    if (window.location.hash === '#password') {
      document.getElementById('reset-password-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [loading]);

  useEffect(() => {
    if (!isEdit || !staffId) return;
    setLoading(true);
    enhancedApiService
      .getStaff({ page_size: 500 })
      .then((res) => {
        const found = res.results.find((s) => s.id === staffId);
        if (!found) {
          navigate('/staff');
          return;
        }
        setMember(found);
        setForm({
          name: found.name || '',
          mobile: found.mobile || '',
          password: '',
          role: (found.role || found.role_display || 'Staff') as StaffRoleLabel,
          is_active: found.is_active,
        });
      })
      .catch(() => navigate('/staff'))
      .finally(() => setLoading(false));
  }, [isEdit, staffId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit && staffId) {
        await enhancedApiService.updateStaff(staffId, {
          name: form.name,
          mobile: form.mobile,
          role: form.role,
          is_active: form.is_active,
        });
      } else {
        await enhancedApiService.createStaff({
          name: form.name,
          mobile: form.mobile,
          password: form.password,
          role: form.role,
          is_active: form.is_active,
        });
      }
      navigate('/staff');
    } catch (error: unknown) {
      const err = error as { details?: Record<string, string[]>; message?: string };
      const d = err.details;
      const msg =
        d?.mobile?.[0] ||
        d?.name?.[0] ||
        d?.password?.[0] ||
        err.message ||
        'Could not save staff member';
      showAlert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!staffId || !newPassword.trim()) return;
    try {
      await enhancedApiService.resetStaffPassword(staffId, newPassword);
      setNewPassword('');
      showAlert('Password updated successfully');
    } catch (error: unknown) {
      const err = error as { message?: string };
      showAlert(err.message || 'Failed to reset password');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1e5a9e]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link
          to="/staff"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-[#1e5a9e]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to staff list
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserPlus className="h-7 w-7 text-[#1e5a9e]" />
          {isEdit ? 'Edit employee' : 'Add employee'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isEdit
            ? 'Update profile, role, and account status'
            : 'Create a new CRM login with the correct access level'}
        </p>
      </div>

      <Card className="p-6 md:p-8 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Full name <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Rajesh Kumar"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Mobile (login ID) <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="10 digit mobile number"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                maxLength={10}
              />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-1.5 max-w-md">
              <label className="text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">User type</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as StaffRoleLabel })}
              className="w-full h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium focus:border-[#1e5a9e] focus:ring-2 focus:ring-[#1e5a9e]/20 outline-none"
            >
              {STAFF_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              {STAFF_ROLE_OPTIONS.find((o) => o.value === form.role)?.description}
            </p>
            {form.role === 'Technician' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <strong>Partner app:</strong> Use the same mobile and password in the Pest 99
                Partner app. After saving, assign jobs via Send to Partner App on pending bookings.
              </div>
            )}
            {isEdit && member?.role_display === 'Technician' && (
              <div
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-medium',
                  member.partner_app_ready
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200',
                )}
              >
                {member.partner_app_ready
                  ? 'Partner app linked — technician can log in on mobile.'
                  : 'Partner app not ready — reset password to link Partner app.'}
              </div>
            )}
          </div>

          {isEdit && member && (
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm">
              <span className="text-gray-500">Current role: </span>
              <span className="font-semibold text-gray-900">{member.role_display}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Account status</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: true })}
                className={cn(
                  'flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors',
                  form.is_active
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 text-gray-500',
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, is_active: false })}
                className={cn(
                  'flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors',
                  !form.is_active
                    ? 'border-red-500 bg-red-50 text-red-800'
                    : 'border-gray-200 text-gray-500',
                )}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#1e5a9e] hover:bg-[#174a82] text-white gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? 'Save changes' : 'Create employee'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/staff')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {isEdit && staffId && (
        <Card id="reset-password-section" className="p-6 border border-amber-100 bg-amber-50/30">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Key className="h-4 w-4 text-amber-600" />
            Reset password
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                type={showResetPassword ? 'text' : 'password'}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10 bg-white"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                onClick={() => setShowResetPassword(!showResetPassword)}
              >
                {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={handleResetPassword}
              disabled={!newPassword.trim()}
            >
              Update password
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default StaffFormPage;
