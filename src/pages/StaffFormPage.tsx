import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { enhancedApiService } from '../services/api.enhanced';
import { STAFF_ROLE_OPTIONS, type StaffRoleLabel } from '../constants/staffRoles';
import type { StaffUser } from '../types';
import { cn } from '../utils/cn';
import { showAlert } from '../utils/notify';

const fieldClass =
  'h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#1e5a9e] focus:ring-1 focus:ring-[#1e5a9e]';

const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

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
  const [resetting, setResetting] = useState(false);

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
    setResetting(true);
    try {
      await enhancedApiService.resetStaffPassword(staffId, newPassword);
      setNewPassword('');
      showAlert('Password updated successfully');
    } catch (error: unknown) {
      const err = error as { message?: string };
      showAlert(err.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const roleHint = STAFF_ROLE_OPTIONS.find((o) => o.value === form.role)?.description;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-[#1e5a9e]" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/staff"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#1e5a9e]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to staff list
        </Link>
      </div>

      <div className="w-full border border-gray-200 bg-white px-4 py-4 sm:px-5">
        <h1 className="border-b border-gray-200 pb-2 text-lg font-semibold text-gray-900">
          {isEdit ? 'Edit User' : 'Add User'}
        </h1>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {/* Row 1: Name | Phone */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>
                Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                className={fieldClass}
                placeholder="Enter full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                required
                className={fieldClass}
                placeholder="10 digit mobile"
                value={form.mobile}
                maxLength={10}
                inputMode="numeric"
                onChange={(e) =>
                  setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })
                }
              />
            </div>
          </div>

          {/* Row 2: Usertype | Password (add) or Status (edit) */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Usertype</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as StaffRoleLabel })}
                className={fieldClass}
              >
                {STAFF_ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {roleHint && (
                <p className="mt-0.5 text-xs text-gray-500">{roleHint}</p>
              )}
              {form.role === 'Technician' && (
                <p className="mt-0.5 text-xs text-amber-700">
                  Same phone &amp; password work in the Partner app.
                  {isEdit && member && !member.partner_app_ready
                    ? ' Reset password below if login is not linked yet.'
                    : ''}
                </p>
              )}
            </div>

            {!isEdit ? (
              <div>
                <label className={labelClass}>
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    className={cn(fieldClass, 'pr-10')}
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className={labelClass}>Account status</label>
                <select
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === 'active' })}
                  className={fieldClass}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {member && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    Current role: {member.role_display}
                    {member.partner_app_ready ? ' · Partner app linked' : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {!isEdit && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#1e5a9e] focus:ring-[#1e5a9e]"
              />
              Active account
            </label>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 min-w-[100px] items-center justify-center rounded-md bg-[#1e5a9e] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#174a82] disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/staff')}
              className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>

        {isEdit && staffId && (
          <div
            id="reset-password-section"
            className="mt-4 border-t border-gray-200 pt-4"
          >
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Reset password</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:max-w-xl">
              <div className="relative">
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  className={cn(fieldClass, 'pr-10')}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                disabled={!newPassword.trim() || resetting}
                onClick={handleResetPassword}
                className="inline-flex h-9 items-center justify-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffFormPage;
