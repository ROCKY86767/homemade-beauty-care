import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type IntegrationSettings = {
  pathao_enabled: boolean;
  pathao_store_id: string;
  pathao_client_id: string;
  pathao_client_secret_set: boolean;
  pathao_access_token_set: boolean;
  meta_capi_enabled: boolean;
  meta_pixel_id: string;
  meta_dataset_id: string;
  meta_capi_access_token_set: boolean;
  updated_at?: string;
};

const EMPTY: IntegrationSettings = {
  pathao_enabled: false,
  pathao_store_id: '',
  pathao_client_id: '',
  pathao_client_secret_set: false,
  pathao_access_token_set: false,
  meta_capi_enabled: false,
  meta_pixel_id: '',
  meta_dataset_id: '',
  meta_capi_access_token_set: false,
};

function SecretField({
  label,
  value,
  onChange,
  onSave,
  saved,
  saving,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  saved: boolean;
  saving: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-1.5">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={saved ? 'Already saved — enter a new value to replace' : 'Enter secret'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
            aria-label={show ? 'Hide secret' : 'Show secret'}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          type="button"
          disabled={!value.trim() || saving}
          onClick={onSave}
          className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>
      {saved && !value && (
        <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Secret saved securely
        </p>
      )}
    </div>
  );
}

export default function AdminIntegrationCenter() {
  const [settings, setSettings] = useState<IntegrationSettings>(EMPTY);
  const [pathaoSecret, setPathaoSecret] = useState('');
  const [pathaoToken, setPathaoToken] = useState('');
  const [metaToken, setMetaToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSecret, setSavingSecret] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('get_admin_integration_settings');
    if (rpcError) {
      setError(rpcError.message || 'Integration settings load failed.');
    } else {
      setSettings({ ...EMPTY, ...(data || {}) });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    const { data, error: rpcError } = await supabase.rpc(
      'save_admin_integration_settings',
      { p_settings: settings }
    );

    if (rpcError) {
      setError(rpcError.message || 'Settings save failed.');
    } else {
      setSettings({ ...EMPTY, ...(data || settings) });
      setMessage('Integration settings saved.');
    }

    setSaving(false);
  };

  const saveSecret = async (name: string, value: string) => {
    setSavingSecret(name);
    setError('');
    setMessage('');

    const { error: rpcError } = await supabase.rpc(
      'save_admin_integration_secret',
      { p_name: name, p_secret: value }
    );

    if (rpcError) {
      setError(rpcError.message || 'Secret save failed.');
    } else {
      if (name === 'PATHAO_CLIENT_SECRET') setPathaoSecret('');
      if (name === 'PATHAO_ACCESS_TOKEN') setPathaoToken('');
      if (name === 'META_CAPI_ACCESS_TOKEN') setMetaToken('');
      await load();
      setMessage('Secret saved securely.');
    }

    setSavingSecret('');
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  const pathaoReady =
    Boolean(settings.pathao_store_id.trim()) &&
    Boolean(settings.pathao_client_id.trim()) &&
    settings.pathao_client_secret_set &&
    settings.pathao_access_token_set;

  const metaReady =
    Boolean(settings.meta_pixel_id.trim() || settings.meta_dataset_id.trim()) &&
    settings.meta_capi_access_token_set;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pathao + Meta CAPI</h1>
          <p className="text-sm text-gray-500 mt-1">
            এখান থেকেই পরে integration credentials ও settings manage করতে পারবে।
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-lg border bg-white flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {message && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {message}
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-5">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-lg text-gray-900">Pathao Courier</h2>
              <p className="text-sm text-gray-500 mt-1">
                Confirmed order → Pathao order creation → tracking/status sync.
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${pathaoReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {pathaoReady ? 'Credentials Ready' : 'Setup Pending'}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <label className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-3">
              <span className="text-sm font-medium">Automatic Pathao order</span>
              <input
                type="checkbox"
                checked={settings.pathao_enabled}
                onChange={(e) => setSettings({ ...settings, pathao_enabled: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Store ID</label>
                <input
                  value={settings.pathao_store_id}
                  onChange={(e) => setSettings({ ...settings, pathao_store_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Pathao Store ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Client ID</label>
                <input
                  value={settings.pathao_client_id}
                  onChange={(e) => setSettings({ ...settings, pathao_client_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Pathao Client ID"
                />
              </div>
            </div>

            <SecretField
              label="Client Secret"
              value={pathaoSecret}
              onChange={setPathaoSecret}
              onSave={() => saveSecret('PATHAO_CLIENT_SECRET', pathaoSecret)}
              saved={settings.pathao_client_secret_set}
              saving={savingSecret === 'PATHAO_CLIENT_SECRET'}
            />

            <SecretField
              label="Access Token"
              value={pathaoToken}
              onChange={setPathaoToken}
              onSave={() => saveSecret('PATHAO_ACCESS_TOKEN', pathaoToken)}
              saved={settings.pathao_access_token_set}
              saving={savingSecret === 'PATHAO_ACCESS_TOKEN'}
            />
          </div>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="mt-5 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Pathao Settings
          </button>

          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 flex gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            Secret values are stored through Supabase Vault; they are never saved in React state after saving, GitHub, or a normal settings table.
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-lg text-gray-900">Meta Conversion API</h2>
              <p className="text-sm text-gray-500 mt-1">
                Browser Pixel + server-side CAPI with event_id deduplication.
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${metaReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {metaReady ? 'Credentials Ready' : 'Setup Pending'}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <label className="flex items-center justify-between rounded-lg border bg-gray-50 px-3 py-3">
              <span className="text-sm font-medium">Enable Meta CAPI</span>
              <input
                type="checkbox"
                checked={settings.meta_capi_enabled}
                onChange={(e) => setSettings({ ...settings, meta_capi_enabled: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Pixel ID</label>
                <input
                  value={settings.meta_pixel_id}
                  onChange={(e) => setSettings({ ...settings, meta_pixel_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Meta Pixel ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Dataset ID</label>
                <input
                  value={settings.meta_dataset_id}
                  onChange={(e) => setSettings({ ...settings, meta_dataset_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Dataset ID"
                />
              </div>
            </div>

            <SecretField
              label="CAPI Access Token"
              value={metaToken}
              onChange={setMetaToken}
              onSave={() => saveSecret('META_CAPI_ACCESS_TOKEN', metaToken)}
              saved={settings.meta_capi_access_token_set}
              saving={savingSecret === 'META_CAPI_ACCESS_TOKEN'}
            />
          </div>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="mt-5 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Meta Settings
          </button>

          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800 flex gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            CAPI token is encrypted in Supabase Vault and is never exposed back to the browser.
          </div>
        </section>
      </div>

      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="font-bold text-gray-900">পরের ধাপে কী হবে</h3>
        <div className="grid md:grid-cols-3 gap-3 mt-4 text-sm text-gray-700">
          <div className="rounded-lg bg-gray-50 p-3">1. Credentials save → secure storage</div>
          <div className="rounded-lg bg-gray-50 p-3">2. Pathao API connect/test → automatic courier order</div>
          <div className="rounded-lg bg-gray-50 p-3">3. Meta event send/test → Purchase/CAPI tracking</div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          এখনো কোনো real Pathao shipment বা Meta Purchase event পাঠানো হচ্ছে না। Credentials save করার UI ও secure storage প্রস্তুত করা হয়েছে; actual API connection পরের ধাপে চালু করা যাবে।
        </p>
      </div>
    </div>
  );
}
