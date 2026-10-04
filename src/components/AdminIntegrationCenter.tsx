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
import { getSettings, updateSettings } from '../lib/settings';

type IntegrationSettings = {
  pathao_enabled: boolean;
  pathao_store_id: string;
  pathao_client_id: string;
  pathao_client_secret_set: boolean;
  pathao_access_token_set: boolean;
  pathao_username_set: boolean;
  pathao_password_set: boolean;
  meta_capi_enabled: boolean;
  meta_pixel_id: string;
  meta_dataset_id: string;
  meta_graph_version: string;
  meta_capi_access_token_set: boolean;
  updated_at?: string;
};

const EMPTY: IntegrationSettings = {
  pathao_enabled: false,
  pathao_store_id: '',
  pathao_client_id: '',
  pathao_client_secret_set: false,
  pathao_access_token_set: false,
  pathao_username_set: false,
  pathao_password_set: false,
  meta_capi_enabled: false,
  meta_pixel_id: '',
  meta_dataset_id: '',
  meta_graph_version: 'v26.0',
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
      <label className="block text-sm font-medium text-gray-800 mb-1.5">{label}</label>
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
  const [pathaoUsername, setPathaoUsername] = useState('');
  const [pathaoPassword, setPathaoPassword] = useState('');
  const [metaToken, setMetaToken] = useState('');
  const [socials, setSocials] = useState({
    whatsapp_number: '',
    facebook_url: '',
    instagram_url: '',
    tiktok_url: '',
    youtube_url: '',
  });
  const [socialSaving, setSocialSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSecret, setSavingSecret] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const [integrationResult, siteSettingsResult] = await Promise.all([
      supabase.rpc('get_admin_integration_settings'),
      getSettings(),
    ]);
    const { data, error: rpcError } = integrationResult;
    if (siteSettingsResult) {
      setSocials({
        whatsapp_number: siteSettingsResult.whatsapp_number || '',
        facebook_url: siteSettingsResult.facebook_url || '',
        instagram_url: siteSettingsResult.instagram_url || '',
        tiktok_url: siteSettingsResult.tiktok_url || '',
        youtube_url: siteSettingsResult.youtube_url || '',
      });
    }
    if (rpcError) {
      setError(rpcError.message || 'Integration settings load failed.');
    } else {
      setSettings({ ...EMPTY, ...(data || {}) });
    }
    setLoading(false);
  };

  const saveSocialLinks = async () => {
    setSocialSaving(true);
    setError('');
    setMessage('');
    try {
      await updateSettings({
        whatsapp_number: socials.whatsapp_number.trim(),
        facebook_url: socials.facebook_url.trim(),
        instagram_url: socials.instagram_url.trim(),
        tiktok_url: socials.tiktok_url.trim(),
        youtube_url: socials.youtube_url.trim(),
      });
      setMessage('Social Media links saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Social Media links save failed.');
    } finally {
      setSocialSaving(false);
    }
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
      if (name === 'PATHAO_USERNAME') setPathaoUsername('');
      if (name === 'PATHAO_PASSWORD') setPathaoPassword('');
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
    (settings.pathao_access_token_set ||
      (settings.pathao_username_set && settings.pathao_password_set));

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

      <section className="mb-5 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg text-gray-900">Social Media Links</h2>
            <p className="text-sm text-gray-500 mt-1">
              Update the social media URLs shown in the website footer. Changes apply site-wide.
            </p>
          </div>
          <button
            type="button"
            onClick={saveSocialLinks}
            disabled={socialSaving}
            className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {socialSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Social Links
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">WhatsApp Number</label>
            <input
              type="tel"
              value={socials.whatsapp_number}
              onChange={(e) => setSocials({ ...socials, whatsapp_number: e.target.value.replace(/\D/g, '').slice(0, 13) })}
              placeholder="8801XXXXXXXXX"
              inputMode="numeric"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="mt-1 text-xs text-gray-400">Use international format, e.g. 8801XXXXXXXXX</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Facebook URL</label>
            <input
              type="url"
              value={socials.facebook_url}
              onChange={(e) => setSocials({ ...socials, facebook_url: e.target.value })}
              placeholder="https://www.facebook.com/yourpage"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Instagram URL</label>
            <input
              type="url"
              value={socials.instagram_url}
              onChange={(e) => setSocials({ ...socials, instagram_url: e.target.value })}
              placeholder="https://www.instagram.com/yourprofile"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">TikTok URL</label>
            <input
              type="url"
              value={socials.tiktok_url}
              onChange={(e) => setSocials({ ...socials, tiktok_url: e.target.value })}
              placeholder="https://www.tiktok.com/@yourprofile"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">YouTube URL</label>
            <input
              type="url"
              value={socials.youtube_url}
              onChange={(e) => setSocials({ ...socials, youtube_url: e.target.value })}
              placeholder="https://www.youtube.com/@yourchannel"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Leave a field empty if you do not want that social icon to appear on the website.
        </p>
      </section>

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

            <div className="grid sm:grid-cols-2 gap-4">
              <SecretField
                label="Merchant Username / Email"
                value={pathaoUsername}
                onChange={setPathaoUsername}
                onSave={() => saveSecret('PATHAO_USERNAME', pathaoUsername)}
                saved={settings.pathao_username_set}
                saving={savingSecret === 'PATHAO_USERNAME'}
              />
              <SecretField
                label="Merchant Password"
                value={pathaoPassword}
                onChange={setPathaoPassword}
                onSave={() => saveSecret('PATHAO_PASSWORD', pathaoPassword)}
                saved={settings.pathao_password_set}
                saving={savingSecret === 'PATHAO_PASSWORD'}
              />
            </div>

            <SecretField
              label="Access Token"
              value={pathaoToken}
              onChange={setPathaoToken}
              onSave={() => saveSecret('PATHAO_ACCESS_TOKEN', pathaoToken)}
              saved={settings.pathao_access_token_set}
              saving={savingSecret === 'PATHAO_ACCESS_TOKEN'}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Pathao Settings
            </button>
            <button
              type="button"
              disabled={!pathaoReady || savingSecret === 'PATHAO_TEST'}
              onClick={async () => {
                setSavingSecret('PATHAO_TEST');
                setError('');
                setMessage('');
                const { data, error: fnError } = await supabase.functions.invoke('integrations', { body: { action: 'test_pathao' } });
                if (fnError || !data?.success) setError(fnError?.message || data?.message || 'Pathao connection test failed.');
                else setMessage('Pathao connection successful.');
                setSavingSecret('');
              }}
              className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> Test Pathao Connection
            </button>
          </div>

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

            <div>
              <label className="block text-sm font-medium mb-1.5">Graph API Version</label>
              <input
                value={settings.meta_graph_version}
                onChange={(e) => setSettings({ ...settings, meta_graph_version: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                placeholder="v26.0"
              />
              <p className="mt-1 text-xs text-gray-400">বর্তমান Meta Graph API-এর জন্য v26.0 রাখা আছে।</p>
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
        <h3 className="font-bold text-gray-900">Integration Status</h3>
        <div className="grid md:grid-cols-3 gap-3 mt-4 text-sm text-gray-700">
          <div className="rounded-lg bg-gray-50 p-3">1. Pathao credentials save → secure storage</div>
          <div className="rounded-lg bg-gray-50 p-3">2. Confirmed order → automatic Pathao shipment</div>
          <div className="rounded-lg bg-gray-50 p-3">3. Successful order → Meta Purchase CAPI</div>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Credentials একবার Admin থেকে save করলে automation code আলাদাভাবে edit করার দরকার নেই। Pathao shipment status customer tracking-এ sync হবে এবং Meta Purchase event server-side পাঠানো হবে।
        </p>
      </div>
    </div>
  );
}
