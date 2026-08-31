import React, { useCallback, useEffect, useState } from 'react';
import { Download, Save, Smartphone } from 'lucide-react';
import { Card, Button, Input, PageLoading } from '../components/ui';
import { enhancedApiService } from '../services/api.enhanced';
import { useAuth } from '../hooks/useAuth';
import { showAlert } from '../utils/notify';
import { cn } from '../utils/cn';

type AppKind = 'partner' | 'customer';

type AppVersionConfig = {
  app: AppKind;
  latest_version: string;
  minimum_supported_version: string;
  force_update: boolean;
  update_title: string;
  update_message: string;
  store_url: string;
  updated_at?: string | null;
};

const EMPTY: AppVersionConfig = {
  app: 'partner',
  latest_version: '',
  minimum_supported_version: '',
  force_update: true,
  update_title: 'Update Available',
  update_message:
    'A newer version is available on the Play Store. Please update to continue.',
  store_url: '',
};

const AppUpdates: React.FC = () => {
  const { user } = useAuth();
  const canEdit = Boolean(user?.is_superuser);
  const [tab, setTab] = useState<AppKind>('partner');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AppVersionConfig>(EMPTY);

  const load = useCallback(async (app: AppKind) => {
    setLoading(true);
    try {
      const data = await enhancedApiService.getAppVersionConfig(app);
      setForm({
        app,
        latest_version: data.latest_version || '',
        minimum_supported_version: data.minimum_supported_version || '',
        force_update: Boolean(data.force_update),
        update_title: data.update_title || EMPTY.update_title,
        update_message: data.update_message || EMPTY.update_message,
        store_url: data.store_url || '',
        updated_at: data.updated_at,
      });
    } catch (e) {
      showAlert(e instanceof Error ? e.message : 'Failed to load app version settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [tab, load]);

  const onSave = async () => {
    if (!canEdit) {
      showAlert('Only super admins can publish app update settings.');
      return;
    }
    const latest = form.latest_version.trim();
    if (!latest) {
      showAlert('Enter the Play Store version (e.g. 2.1.3).');
      return;
    }
    setSaving(true);
    try {
      const min = form.minimum_supported_version.trim() || latest;
      const data = await enhancedApiService.updateAppVersionConfig(tab, {
        latest_version: latest,
        minimum_supported_version: min,
        force_update: form.force_update,
        update_title: form.update_title.trim() || EMPTY.update_title,
        update_message: form.update_message.trim() || EMPTY.update_message,
      });
      setForm({
        app: tab,
        latest_version: data.latest_version || latest,
        minimum_supported_version: data.minimum_supported_version || min,
        force_update: Boolean(data.force_update),
        update_title: data.update_title || EMPTY.update_title,
        update_message: data.update_message || EMPTY.update_message,
        store_url: data.store_url || '',
        updated_at: data.updated_at,
      });
      showAlert(
        `${tab === 'partner' ? 'Partner' : 'Customer'} app update published. Users on older versions will see the update popup on next open.`,
      );
    } catch (e) {
      showAlert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">App Updates</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          After a new build goes live on the Play Store, set that version here. Apps check this on
          every launch and show an update popup to users still on older versions.
        </p>
      </div>

      <div className="flex gap-2">
        {(['partner', 'customer'] as AppKind[]).map((app) => (
          <button
            key={app}
            type="button"
            onClick={() => setTab(app)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold capitalize',
              tab === app
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            )}
          >
            {app} app
          </button>
        ))}
      </div>

      <Card className="max-w-2xl space-y-4 p-5">
        <div className="flex items-center gap-2 text-emerald-800">
          <Smartphone className="h-5 w-5" />
          <span className="font-semibold capitalize">{tab} Play Store release</span>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Latest Play Store version</span>
          <Input
            value={form.latest_version}
            onChange={(e) => setForm((f) => ({ ...f, latest_version: e.target.value }))}
            placeholder="e.g. 2.1.3"
            disabled={!canEdit}
          />
          <span className="text-xs text-slate-500">
            Must match the versionName in pubspec / Play Console (not the build number).
          </span>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Minimum supported version</span>
          <Input
            value={form.minimum_supported_version}
            onChange={(e) =>
              setForm((f) => ({ ...f, minimum_supported_version: e.target.value }))
            }
            placeholder="Usually same as latest"
            disabled={!canEdit}
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={form.force_update}
            disabled={!canEdit}
            onChange={(e) => setForm((f) => ({ ...f, force_update: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300"
          />
          Force update (block app until user updates)
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Popup title</span>
          <Input
            value={form.update_title}
            onChange={(e) => setForm((f) => ({ ...f, update_title: e.target.value }))}
            disabled={!canEdit}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Popup message</span>
          <textarea
            value={form.update_message}
            onChange={(e) => setForm((f) => ({ ...f, update_message: e.target.value }))}
            disabled={!canEdit}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        {form.store_url ? (
          <a
            href={form.store_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
          >
            <Download className="h-4 w-4" />
            Open Play Store listing
          </a>
        ) : null}

        {form.updated_at ? (
          <p className="text-xs text-slate-500">
            Last published: {new Date(form.updated_at).toLocaleString()}
          </p>
        ) : null}

        <Button onClick={onSave} disabled={!canEdit || saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Publishing…' : 'Publish update popup'}
        </Button>

        {!canEdit ? (
          <p className="text-sm text-amber-700">Super admin access is required to publish.</p>
        ) : null}
      </Card>
    </div>
  );
};

export default AppUpdates;
