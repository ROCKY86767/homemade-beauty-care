import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, EyeOff, Loader2, Plus, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Integration = {
  id?: string;
  name: string;
  provider: string;
  enabled: boolean;
  base_url: string;
  create_order_path: string;
  create_order_method: string;
  status_path: string;
  invoice_path: string;
  auth_type: string;
  auth_header: string;
  api_key_label: string;
  request_headers: Record<string, any>;
  create_order_template: Record<string, any>;
  status_response_path: string;
  external_order_id_path: string;
  external_invoice_url_path: string;
  status_request_method: string;
  status_request_template: Record<string, any>;
  webhook_order_id_path: string;
  webhook_status_path: string;
  webhook_payment_status_path: string;
  webhook_secret_header: string;
  cancel_order_path: string;
  cancel_order_method: string;
  tracking_response_path: string;
  status_mapping: Record<string, any>;
  webhook_enabled: boolean;
  provider_settings?: Record<string, unknown>;
  webhook_secret_set?: boolean;
  api_key_set?: boolean;
  api_secret_set?: boolean;
  username_set?: boolean;
  password_set?: boolean;
  last_tested_at?: string;
  last_test_status?: string;
  last_test_message?: string;
};

const blank = (): Integration => ({
  name: 'Order Management',
  provider: 'custom_rest',
  enabled: false,
  base_url: '',
  create_order_path: '',
  create_order_method: 'POST',
  status_path: '',
  invoice_path: '',
  auth_type: 'bearer',
  auth_header: 'Authorization',
  api_key_label: 'API Key',
  request_headers: {},
  create_order_template: {
    order_number: '{{order.order_number}}',
    customer_name: '{{order.customer_name}}',
    mobile: '{{order.mobile}}',
    alt_mobile: '{{order.alt_phone}}',
    email: '{{order.email}}',
    district: '{{order.district}}',
    area: '{{order.area}}',
    address: '{{order.address}}',
    note: '{{order.order_note}}',
    payment_method: '{{order.payment_method}}',
    subtotal: '{{totals.subtotal}}',
    delivery_charge: '{{totals.delivery_charge}}',
    discount: '{{totals.discount}}',
    grand_total: '{{totals.grand_total}}',
    items: '{{items}}'
  },
  status_response_path: '',
  external_order_id_path: '',
  external_invoice_url_path: '',
  status_request_method: 'GET',
  status_request_template: {},
  webhook_order_id_path: '',
  webhook_status_path: '',
  webhook_payment_status_path: '',
  webhook_secret_header: 'x-webhook-secret',
  cancel_order_path: '',
  cancel_order_method: 'POST',
  tracking_response_path: '',
  status_mapping: {
    pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled'
  },
  webhook_enabled: true,
  provider_settings: {}
});

function Secret({ label, value, setValue, saved, save, busy }: any) {
  const [show, setShow] = useState(false);
  return <div>
    <label className="block text-sm font-medium mb-1.5">{label}</label>
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input type={show ? 'text' : 'password'} value={value} onChange={e => setValue(e.target.value)}
          placeholder={saved ? 'Already saved — enter new value to replace' : 'Enter secret'}
          autoComplete="new-password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm" />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <button type="button" disabled={!value.trim() || busy} onClick={save}
        className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm disabled:opacity-40">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      </button>
    </div>
    {saved && !value && <p className="mt-1 text-xs text-emerald-600">✓ Saved securely</p>}
  </div>;
}

export default function OrderManagementIntegrationCenter() {
  const [items, setItems] = useState<Integration[]>([]);
  const [current, setCurrent] = useState<Integration | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [secretSaved, setSecretSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busySecret, setBusySecret] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    const { data, error: e } = await supabase.rpc('get_admin_order_management_integrations');
    if (e) return setError(e.message);
    const list = (data || []) as Integration[];
    setItems(list);
    if (current?.id) setCurrent(list.find(x => x.id === current.id) || null);
  };

  useEffect(() => { load(); }, []);

  const edit = (x: Integration) => {
    setCurrent({ ...x, request_headers: x.request_headers || {}, create_order_template: x.create_order_template || {}, provider_settings: x.provider_settings || {} });
    setApiKey(''); setApiSecret(''); setUsername(''); setPassword(''); setWebhookSecret('');
    setSecretSaved(false);
    setMessage('');
    setError('');
  };

  const add = () => {
    setCurrent(blank());
    setApiKey(''); setApiSecret(''); setUsername(''); setPassword(''); setWebhookSecret('');
    setSecretSaved(false);
    setMessage('');
    setError('');
  };

  const save = async () => {
    if (!current) return;
    setBusy(true); setError(''); setMessage('');
    let headers: any = {};
    let template: any = {};
    try {
      headers = typeof current.request_headers === 'string' ? JSON.parse(current.request_headers as any) : current.request_headers;
      template = typeof current.create_order_template === 'string' ? JSON.parse(current.create_order_template as any) : current.create_order_template;
    } catch {
      setError('Request Headers / Order Template must be valid JSON.');
      setBusy(false); return;
    }
    const payload = { ...current, request_headers: headers, create_order_template: template, provider_settings: current.provider_settings || {} };
    const { data, error: e } = await supabase.rpc('save_order_management_integration', { p_integration: payload });
    if (e) setError(e.message);
    else { setCurrent(data); setMessage('Order Management integration saved.'); await load(); }
    setBusy(false);
  };

  const saveSecret = async (name: string, value: string) => {
    if (!current?.id || !value.trim()) return;
    setBusySecret(true); setError(''); setMessage('');
    const { error: e } = await supabase.rpc('save_order_management_secret', {
      p_integration_id: current.id, p_name: name, p_secret: value
    });
    if (e) setError(e.message);
    else { setSecretSaved(true); setMessage('Secret saved securely.'); await load(); }
    setBusySecret(false);
  };

  const remove = async () => {
    if (!current?.id || !confirm('এই integration মুছে ফেলবেন?')) return;
    const { error: e } = await supabase.rpc('delete_order_management_integration', { p_id: current.id });
    if (e) setError(e.message);
    else { setCurrent(null); setMessage('Integration removed.'); await load(); }
  };

  const test = async () => {
    if (!current?.id) return;
    setBusy(true); setError(''); setMessage('');
    const { data, error: e } = await supabase.functions.invoke('order-management', {
      body: { action: 'test', integration_id: current.id }
    });
    if (e || !data?.success) setError(e?.message || data?.message || 'Connection test failed.');
    else { setMessage(data.message || 'Connection successful.'); await load(); }
    setBusy(false);
  };
  
  const syncStatus = async () => {
    if (!current?.id) return;
    setBusy(true); setError(''); setMessage('');
    const { data, error: e } = await supabase.functions.invoke('order-management', {
      body: { action: 'sync', integration_id: current.id }
    });
    if (e || !data?.success) setError(e?.message || data?.message || 'Status sync failed.');
    else { setMessage('External order statuses synced.'); await load(); }
    setBusy(false);
  };

  if (!current) return <div className="rounded-xl border bg-white p-5">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-xl font-bold">Order Management Integrations</h2>
      <p className="text-sm text-gray-500 mt-1">Website order → external order management / invoice software.</p></div>
      <div className="flex gap-2">
        <button onClick={load} className="px-3 py-2 border rounded-lg"><RefreshCw className="w-4 h-4" /></button>
        <button onClick={add} className="px-4 py-2 bg-primary text-white rounded-lg inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Software</button>
      </div>
    </div>
    <div className="mt-5 space-y-3">
      {items.length === 0 && <div className="rounded-lg bg-gray-50 p-5 text-sm text-gray-500">কোনো Order Management Software এখনো connect করা হয়নি।</div>}
      {items.map(x => <button key={x.id} onClick={() => edit(x)} className="w-full text-left border rounded-xl p-4 hover:border-primary/50">
        <div className="flex items-center justify-between"><div><p className="font-semibold">{x.name}</p><p className="text-xs text-gray-500 mt-1">{x.provider} · {x.base_url || 'API URL not set'}</p></div>
        <span className={x.enabled ? 'text-emerald-600 text-xs' : 'text-gray-400 text-xs'}>{x.enabled ? 'Enabled' : 'Disabled'}</span></div>
      </button>)}
    </div>
    <div className="mt-5 rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900">
      Bizmotion, The Invoice বা অন্য software-এ API থাকলে এখানে credentials, endpoint ও field mapping দিয়ে connect করা যাবে। প্রতিটি software-এর API contract আলাদা হতে পারে।
    </div>
  </div>;

  return <div className="rounded-xl border bg-white p-5">
    <div className="flex items-center justify-between gap-3 mb-5">
      <div><h2 className="text-xl font-bold">{current.name || 'Order Management Software'}</h2><p className="text-sm text-gray-500">সব configuration Admin Panel থেকেই।</p></div>
      <button onClick={() => setCurrent(null)} className="px-3 py-2 border rounded-lg">Back</button>
    </div>
    {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
    {message && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{message}</div>}

    <div className="grid xl:grid-cols-2 gap-5">
      <section className="space-y-4">
        <label className="flex items-center justify-between border rounded-lg p-3 bg-gray-50">
          <span className="font-medium text-sm">Enable automatic order transfer</span>
          <input type="checkbox" checked={current.enabled} onChange={e => setCurrent({...current, enabled:e.target.checked})} className="w-4 h-4 accent-primary" />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1.5">Software Name</label><input value={current.name} onChange={e=>setCurrent({...current,name:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. The Invoice / Bizmotion" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Provider Type</label><select value={current.provider} onChange={e=>setCurrent({...current,provider:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm"><option value="custom_rest">Custom REST API</option><option value="pathao">Pathao Courier</option><option value="bizmotion">Bizmotion</option><option value="the_invoice">The Invoice</option><option value="other">Other</option></select></div>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900">Universal REST connector: API documentation অনুযায়ী URL, method, auth, headers, body template ও response mapping সেট করলেই যেকোনো compatible Order Management / OMS / ERP / POS software connect করা যাবে।</div>
        {current.provider === 'pathao' && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 space-y-4">
            <div>
              <p className="font-semibold text-sm text-emerald-900">Pathao Courier Settings</p>
              <p className="text-xs text-emerald-800 mt-1">Pathao Merchant credentials সরাসরি এই Admin Panel-এ দিন। এগুলো website code-এ যাবে না।</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Store ID</label>
                <input
                  value={String(current.provider_settings?.store_id ?? '')}
                  onChange={e => setCurrent({...current, provider_settings: {...(current.provider_settings || {}), store_id: e.target.value}})}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Pathao Store ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Parcel Weight (kg)</label>
                <input
                  type="number" min="0.1" step="0.1"
                  value={String(current.provider_settings?.item_weight ?? '0.5')}
                  onChange={e => setCurrent({...current, provider_settings: {...(current.provider_settings || {}), item_weight: Number(e.target.value) || 0.5}})}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Delivery Type</label>
                <select
                  value={String(current.provider_settings?.delivery_type ?? '48')}
                  onChange={e => setCurrent({...current, provider_settings: {...(current.provider_settings || {}), delivery_type: e.target.value}})}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="48">Normal Delivery (48)</option>
                  <option value="12">On Demand (12)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Item Type</label>
                <select
                  value={String(current.provider_settings?.item_type ?? '2')}
                  onChange={e => setCurrent({...current, provider_settings: {...(current.provider_settings || {}), item_type: e.target.value}})}
                  className="w-full border rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="2">Parcel (2)</option>
                  <option value="1">Document (1)</option>
                </select>
              </div>
            </div>
            <div className="text-xs text-emerald-800">
              <p>Credential mapping: API Key = Client ID · API Secret = Client Secret · Username = Merchant Email · Password = Merchant Password</p>
              <p className="mt-1">Base URL সাধারণত: https://api-hermes.pathao.com</p>
            </div>
          </div>
        )}
        <div><label className="block text-sm font-medium mb-1.5">Base API URL</label><input value={current.base_url} onChange={e=>setCurrent({...current,base_url:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="https://example.com/api" /></div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1.5">Create Order Method</label><select value={current.create_order_method || 'POST'} onChange={e=>setCurrent({...current,create_order_method:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm"><option>POST</option><option>PUT</option><option>PATCH</option></select></div>
          <div><label className="block text-sm font-medium mb-1.5">Create Order Path</label><input value={current.create_order_path} onChange={e=>setCurrent({...current,create_order_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="/orders" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Status Path</label><input value={current.status_path} onChange={e=>setCurrent({...current,status_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="/orders/{id}" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Invoice Path</label><input value={current.invoice_path} onChange={e=>setCurrent({...current,invoice_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="/invoices/{id}" /></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1.5">Auth</label><select value={current.auth_type} onChange={e=>setCurrent({...current,auth_type:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm"><option value="bearer">Bearer API Key</option><option value="api_key">API Key Header</option><option value="basic">Basic Auth</option><option value="none">No Auth</option></select></div>
          <div><label className="block text-sm font-medium mb-1.5">Auth Header</label><input value={current.auth_header} onChange={e=>setCurrent({...current,auth_header:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" /></div>
          <div><label className="block text-sm font-medium mb-1.5">API Key Label</label><input value={current.api_key_label} onChange={e=>setCurrent({...current,api_key_label:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" /></div>
        </div>
        <div><label className="block text-sm font-medium mb-1.5">Extra Request Headers (JSON)</label><textarea rows={4} value={JSON.stringify(current.request_headers || {}, null, 2)} onChange={e=>{try{setCurrent({...current,request_headers:JSON.parse(e.target.value)})}catch{}}} className="w-full border rounded-lg px-3 py-2.5 text-xs font-mono" /></div>
      </section>
      <section className="space-y-4">
        <div><label className="block text-sm font-medium mb-1.5">Order JSON Template</label><textarea rows={18} value={JSON.stringify(current.create_order_template || {}, null, 2)} onChange={e=>{try{setCurrent({...current,create_order_template:JSON.parse(e.target.value)})}catch{}}} className="w-full border rounded-lg px-3 py-2.5 text-xs font-mono" />
          <p className="text-xs text-gray-500 mt-1">Use placeholders like {'{{order.order_number}}'}, {'{{order.customer_name}}'}, {'{{order.mobile}}'}, {'{{order.address}}'}, {'{{totals.grand_total}}'}, {'{{items}}'}.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1.5">Response Order ID Path</label><input value={current.external_order_id_path} onChange={e=>setCurrent({...current,external_order_id_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="data.id" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Invoice URL Path</label><input value={current.external_invoice_url_path} onChange={e=>setCurrent({...current,external_invoice_url_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="data.invoice_url" /></div>
          <div><label className="block text-sm font-medium mb-1.5">Status Response Path</label><input value={current.status_response_path} onChange={e=>setCurrent({...current,status_response_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="data.status" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
  <div><label className="block text-sm font-medium mb-1.5">Status Request Method</label><select value={current.status_request_method || 'GET'} onChange={e=>setCurrent({...current,status_request_method:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm"><option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option></select></div>
  <div><label className="block text-sm font-medium mb-1.5">Status API Path</label><input value={current.status_path} onChange={e=>setCurrent({...current,status_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="/orders/{id}" /></div>
</div>
<div><label className="block text-sm font-medium mb-1.5">Tracking Response Path</label><input value={current.tracking_response_path || ''} onChange={e=>setCurrent({...current,tracking_response_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="data.tracking_url" /></div>
<div><label className="block text-sm font-medium mb-1.5">Status Request Template (JSON, for POST/PUT)</label><textarea rows={4} value={JSON.stringify(current.status_request_template || {}, null, 2)} onChange={e=>{try{setCurrent({...current,status_request_template:JSON.parse(e.target.value)})}catch{}}} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xs font-mono" /></div>
<div><label className="block text-sm font-medium mb-1.5">Status Mapping (JSON)</label><textarea rows={5} value={JSON.stringify(current.status_mapping || {}, null, 2)} onChange={e=>{try{setCurrent({...current,status_mapping:JSON.parse(e.target.value)})}catch{}}} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xs font-mono" /><p className="text-xs text-gray-500 mt-1">Example: delivered → Delivered, cancelled → Cancelled</p></div>
<div className="grid sm:grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1.5">Cancel Order Path</label><input value={current.cancel_order_path || ''} onChange={e=>setCurrent({...current,cancel_order_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="/orders/{id}/cancel" /></div><div><label className="block text-sm font-medium mb-1.5">Cancel Method</label><select value={current.cancel_order_method || 'POST'} onChange={e=>setCurrent({...current,cancel_order_method:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm"><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select></div></div>
<div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
  <p className="font-medium text-sm text-amber-900 mb-2">Two-way status sync / Webhook mapping</p>
  <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={current.webhook_enabled !== false} onChange={e=>setCurrent({...current,webhook_enabled:e.target.checked})} /> Enable webhook status updates</label>
  <div className="grid sm:grid-cols-2 gap-4">
    <div><label className="block text-sm font-medium mb-1.5">Webhook External Order ID Path</label><input value={current.webhook_order_id_path || ''} onChange={e=>setCurrent({...current,webhook_order_id_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="data.order_id" /></div>
    <div><label className="block text-sm font-medium mb-1.5">Webhook Status Path</label><input value={current.webhook_status_path || ''} onChange={e=>setCurrent({...current,webhook_status_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="data.status" /></div>
    <div><label className="block text-sm font-medium mb-1.5">Webhook Payment Status Path</label><input value={current.webhook_payment_status_path || ''} onChange={e=>setCurrent({...current,webhook_payment_status_path:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" placeholder="data.payment_status" /></div>
    <div><label className="block text-sm font-medium mb-1.5">Webhook Secret Header</label><input value={current.webhook_secret_header || 'x-webhook-secret'} onChange={e=>setCurrent({...current,webhook_secret_header:e.target.value})} className="w-full border rounded-lg px-3 py-2.5 text-sm" /></div>
  </div>
  <p className="text-xs text-amber-800 mt-2">Webhook endpoint: /functions/v1/order-management — integration_id query/body এবং saved Webhook Secret ব্যবহার করবে।</p>
</div>
<div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-900">
          API secret কখনো website code-এ যাবে না। Save করলে Supabase Vault-এ থাকবে। Order create হলে external Order ID ও Invoice URL আলাদাভাবে সংরক্ষণ করা হবে।
        </div>
        {current.id && <div className="grid sm:grid-cols-2 gap-4">
          <Secret label="API Key" value={apiKey} setValue={setApiKey} saved={!!current.api_key_set} save={() => saveSecret('API_KEY', apiKey)} busy={busySecret} />
          <Secret label="API Secret" value={apiSecret} setValue={setApiSecret} saved={!!current.api_secret_set} save={() => saveSecret('API_SECRET', apiSecret)} busy={busySecret} />
          <Secret label="Username / Email" value={username} setValue={setUsername} saved={!!current.username_set} save={() => saveSecret('USERNAME', username)} busy={busySecret} />
          <Secret label="Password" value={password} setValue={setPassword} saved={!!current.password_set} save={() => saveSecret('PASSWORD', password)} busy={busySecret} />
          <Secret label="Webhook Secret" value={webhookSecret} setValue={setWebhookSecret} saved={!!current.webhook_secret_set} save={() => saveSecret('WEBHOOK_SECRET', webhookSecret)} busy={busySecret} />
        </div>}      </section>
    </div>

    <div className="mt-5 flex flex-wrap gap-2">
      <button onClick={save} disabled={busy} className="px-4 py-2.5 bg-primary text-white rounded-lg inline-flex items-center gap-2">{busy?<Loader2 className="w-4 h-4 animate-spin"/>:<Save className="w-4 h-4"/>} Save Integration</button>
      {current.id && <>
        <button onClick={test} disabled={busy} className="px-4 py-2.5 border rounded-lg inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Test Connection</button>
        <button onClick={syncStatus} disabled={busy} className="px-4 py-2.5 border rounded-lg inline-flex items-center gap-2"><RefreshCw className="w-4 h-4"/> Sync Status</button>
      </>}
      {current.id && <button onClick={remove} className="px-4 py-2.5 border border-red-200 text-red-600 rounded-lg inline-flex items-center gap-2"><Trash2 className="w-4 h-4"/> Delete</button>}
    </div>
    <div className="mt-5 rounded-lg bg-gray-50 p-4 text-xs text-gray-600 flex gap-2"><ShieldCheck className="w-4 h-4 shrink-0"/> এই connectorটি generic REST API support করে, তাই API documentation/credentials পাওয়া থাকলে software-specific frontend coding না করেই Admin থেকে mapping করা যাবে।</div>
  </div>;
}
