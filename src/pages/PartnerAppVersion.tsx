import React, { useEffect, useState } from 'react';
import { Smartphone, Save, AlertTriangle } from 'lucide-react';
import { Button, Input, PageLoading } from '../components/ui';
import { Card } from '../components/ui/Card';
import { enhancedApiService } from '../services/api.enhanced';
import type { PartnerAppVersionConfig } from '../types';
import { showAlert } from '../utils/notify';

const PartnerAppVersion: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PartnerAppVersionConfig | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await enhancedApiService.getPartnerAppVersion();
      setForm(data);
    } catch (e) {
      console.error(e);
      showAlert('Could not load partner app version settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!form) return;
    try {
      setSaving(true);
      const updated = await enhancedApiService.updatePartnerAppVersion({
        latest_version: form.latest_version.trim(),
        minimum_supported_version: form.minimum_supported_version.trim(),
        force_update: form.force_update,
        update_title: form.update_title.trim(),
        update_message: form.update_message.trim(),
      });
      setForm(updated);
      showAlert('Partner app version settings saved');
    } catch (e) {
      console.error(e);
      showAlert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Smartphone className="h-7 w-7 text-[#1e5a9e]" />
          Partner app — force update
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Control when technicians must install a new APK. Share the APK manually (WhatsApp/CRM); no download link is shown in the app.
        </p>
      </div>

      {form.force_update && (
        <div className="flex gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            Force update is <strong>ON</strong>. Partner apps below minimum version{' '}
            <strong>v{form.minimum_supported_version}</strong> will be blocked on next open.
          </p>
        </div>
      )}

      <Card className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">
              Latest version
            </label>
            <Input
              value={form.latest_version}
              onChange={(e) => setForm({ ...form, latest_version: e.target.value })}
              placeholder="2.0.0"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">
              Minimum supported version
            </label>
            <Input
              value={form.minimum_supported_version}
              onChange={(e) =>
                setForm({ ...form, minimum_supported_version: e.target.value })
              }
              placeholder="2.0.0"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.force_update}
            onChange={(e) => setForm({ ...form, force_update: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[#1e5a9e]"
          />
          <span className="text-sm font-semibold text-gray-800">Enable force update</span>
        </label>

        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">
            Update screen title
          </label>
          <Input
            value={form.update_title}
            onChange={(e) => setForm({ ...form, update_title: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1">
            Update message
          </label>
          <textarea
            value={form.update_message}
            onChange={(e) => setForm({ ...form, update_message: e.target.value })}
            rows={5}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5a9e] focus:ring-1 focus:ring-[#1e5a9e] outline-none"
          />
        </div>

        {form.updated_at && (
          <p className="text-xs text-gray-400">Last updated: {new Date(form.updated_at).toLocaleString()}</p>
        )}

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </Card>

      <Card className="p-4 bg-slate-50 text-sm text-gray-600 space-y-2">
        <p className="font-semibold text-gray-800">Public API (partner app)</p>
        <code className="block text-xs bg-white p-2 rounded border">GET /api/app/version/</code>
        <p>
          After changing settings, deploy backend and run migration{' '}
          <code className="text-xs">0076_partnerappversionconfig</code> on Railway if not done yet.
        </p>
      </Card>
    </div>
  );
};

export default PartnerAppVersion;
