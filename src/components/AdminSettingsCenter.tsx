import { useEffect, useMemo, useState } from 'react';
import {
  Globe2, Store, Home, Package, ShoppingCart, Truck, CreditCard,
  Users, Bell, Share2, BarChart3, Search, ShieldCheck, PlugZap,
  Save, Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { getSettings, updateSettings } from '../lib/settings';

type SettingsForm = Record<string, string | number | boolean | null>;

const groups = [
  { id: 'general', label: 'General', icon: Globe2, desc: 'Brand, contact, language and store identity' },
  { id: 'store', label: 'Store', icon: Store, desc: 'Delivery, currency and customer contact' },
  { id: 'homepage', label: 'Homepage', icon: Home, desc: 'Control homepage sections and banners' },
  { id: 'products', label: 'Products', icon: Package, desc: 'Product and stock behavior' },
  { id: 'checkout', label: 'Checkout', icon: ShoppingCart, desc: 'Checkout rules and validation' },
  { id: 'shipping', label: 'Shipping', icon: Truck, desc: 'Delivery charges and free shipping' },
  { id: 'payments', label: 'Payments', icon: CreditCard, desc: 'COD and online payment controls' },
  { id: 'customers', label: 'Customers', icon: Users, desc: 'Login and account behavior' },
  { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Email, SMS and WhatsApp switches' },
  { id: 'social', label: 'Social Media', icon: Share2, desc: 'Facebook, Instagram, TikTok, YouTube and WhatsApp' },
  { id: 'marketing', label: 'Marketing & Analytics', icon: BarChart3, desc: 'Meta Pixel, CAPI and Google Analytics' },
  { id: 'seo', label: 'SEO', icon: Search, desc: 'Search title, description and verification' },
  { id: 'security', label: 'Security', icon: ShieldCheck, desc: 'Maintenance and safe storefront controls' },
  { id: 'integrations', label: 'Integrations', icon: PlugZap, desc: 'Pathao and external systems' },
];

const defaults: SettingsForm = {
  brand_name: 'Homemade Beauty Care',
  brand_tagline_bn: 'প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া',
  logo_url: '/new-homemade-logo.png',
  favicon_url: '/homemade-logo.png',
  phone: '',
  whatsapp_number: '',
  email: '',
  address_bn: 'ঢাকা, বাংলাদেশ',
  footer_text_bn: '',
  announcement_bn: '',
  site_language: 'bn',
  timezone: 'Asia/Dhaka',
  currency: '৳',
  delivery_inside_dhaka: 70,
  delivery_outside_dhaka: 120,
  free_delivery_threshold: 0,
  contact_phone_enabled: true,
  contact_whatsapp_enabled: true,
  homepage_show_categories: true,
  homepage_show_all_products: true,
  homepage_show_best_sellers: true,
  homepage_show_new_arrivals: true,
  homepage_show_sale: true,
  homepage_show_hair_care: true,
  homepage_show_skin_care: true,
  homepage_show_reviews: true,
  homepage_show_how_to_order: true,
  homepage_show_why_choose_us: true,
  homepage_banner_autoplay: true,
  homepage_banner_interval: 5000,
  product_low_stock_threshold: 5,
  product_allow_reviews: true,
  checkout_guest_enabled: true,
  checkout_require_email: false,
  checkout_require_terms: true,
  order_duplicate_window_minutes: 5,
  free_delivery_enabled: false,
  free_delivery_minimum: 1000,
  cod_enabled: true,
  online_payment_enabled: false,
  order_auto_dispatch_enabled: false,
  invoice_enabled: true,
  customer_google_login_enabled: false,
  customer_email_login_enabled: true,
  newsletter_enabled: true,
  whatsapp_notifications_enabled: false,
  email_notifications_enabled: false,
  sms_notifications_enabled: false,
  facebook_url: '',
  instagram_url: '',
  tiktok_url: '',
  youtube_url: '',
  meta_pixel_enabled: false,
  google_analytics_enabled: false,
  google_analytics_id: '',
  google_search_console_code: '',
  seo_site_title: 'Homemade Beauty Care',
  seo_meta_description: 'Natural hair and skin care products in Bangladesh.',
  seo_canonical_url: '',
  seo_og_image_url: '',
  seo_noindex: false,
  maintenance_mode: false,
};

const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10';
const cardClass = 'rounded-2xl border border-gray-200 bg-white p-5 sm:p-6';

function Field({ label, value, onChange, type = 'text', help }: { label: string; value: any; onChange: (v: any) => void; type?: string; help?: string }) {
  return <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-800">{label}</label>
    <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} className={inputClass} />
    {help && <p className="mt-1 text-xs text-gray-500">{help}</p>}
  </div>;
}

function Area({ label, value, onChange, help }: { label: string; value: any; onChange: (v: string) => void; help?: string }) {
  return <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-800">{label}</label>
    <textarea rows={3} value={value ?? ''} onChange={e => onChange(e.target.value)} className={inputClass} />
    {help && <p className="mt-1 text-xs text-gray-500">{help}</p>}
  </div>;
}

function Toggle({ label, checked, onChange, help }: { label: string; checked: boolean; onChange: (v: boolean) => void; help?: string }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
    <span><span className="block text-sm font-medium text-gray-800">{label}</span>{help && <span className="mt-0.5 block text-xs text-gray-500">{help}</span>}</span>
    <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-primary" />
  </label>;
}

export default function AdminSettingsCenter() {
  const [active, setActive] = useState('general');
  const [form, setForm] = useState<SettingsForm>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const settings = await getSettings();
      setForm({ ...defaults, ...(settings as any) });
    } catch (e: any) {
      setError(e.message || 'Settings load failed.');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const set = (key: string, value: any) => setForm(current => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true); setMessage(''); setError('');
    try {
      const { id, ...updates } = form as any;
      await updateSettings(updates);
      setMessage('Settings saved. The connected storefront will use the new values.');
    } catch (e: any) {
      setError(e.message || 'Settings save failed.');
    } finally { setSaving(false); }
  };

  const current = useMemo(() => groups.find(g => g.id === active) || groups[0], [active]);
  const GIcon = current.icon;

  if (loading) return <div className="min-h-[400px] flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  return <div>
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">WordPress/WooCommerce-style central settings. Existing admin sections stay intact.</p>
    </div>

    {message && <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{message}</div>}
    {error && <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}

    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-2 lg:sticky lg:top-24">
        {groups.map(item => {
          const Icon = item.icon;
          return <button key={item.id} onClick={() => { setActive(item.id); setMessage(''); }} className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left transition ${active === item.id ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
            <span className="flex items-center gap-3"><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0"><span className="block text-sm font-medium">{item.label}</span><span className={`block truncate text-[11px] ${active === item.id ? 'text-white/70' : 'text-gray-400'}`}>{item.desc}</span></span></span>
          </button>;
        })}
      </aside>

      <section>
        <div className={`${cardClass} mb-5`}>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><GIcon className="h-5 w-5" /></div>
            <div><h2 className="text-lg font-bold text-gray-900">{current.label}</h2><p className="text-sm text-gray-500">{current.desc}</p></div>
          </div>
        </div>

        {active === 'general' && <div className={`grid gap-5 ${cardClass}`}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Site / Brand Name" value={form.brand_name} onChange={v => set('brand_name', v)} />
            <Field label="Tagline" value={form.brand_tagline_bn} onChange={v => set('brand_tagline_bn', v)} />
            <Field label="Logo URL" value={form.logo_url} onChange={v => set('logo_url', v)} />
            <Field label="Favicon URL" value={form.favicon_url} onChange={v => set('favicon_url', v)} />
            <Field label="Admin / Support Email" value={form.email} onChange={v => set('email', v)} type="email" />
            <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} />
            <Field label="Language" value={form.site_language} onChange={v => set('site_language', v)} />
            <Field label="Timezone" value={form.timezone} onChange={v => set('timezone', v)} />
          </div>
          <Area label="Store Address" value={form.address_bn} onChange={v => set('address_bn', v)} />
          <Area label="Footer Description" value={form.footer_text_bn} onChange={v => set('footer_text_bn', v)} />
          <Area label="Announcement Bar Text" value={form.announcement_bn} onChange={v => set('announcement_bn', v)} help="This is the site-wide announcement content." />
        </div>}

        {active === 'store' && <div className={`grid gap-5 ${cardClass}`}>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Currency Symbol" value={form.currency} onChange={v => set('currency', v)} />
            <Field label="Inside Dhaka Delivery" value={form.delivery_inside_dhaka} onChange={v => set('delivery_inside_dhaka', v)} type="number" />
            <Field label="Outside Dhaka Delivery" value={form.delivery_outside_dhaka} onChange={v => set('delivery_outside_dhaka', v)} type="number" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Free Delivery Threshold" value={form.free_delivery_threshold} onChange={v => set('free_delivery_threshold', v)} type="number" />
            <Field label="WhatsApp Number" value={form.whatsapp_number} onChange={v => set('whatsapp_number', v)} help="Use 8801XXXXXXXXX for WhatsApp links." />
          </div>
          <Toggle label="Show phone contact" checked={!!form.contact_phone_enabled} onChange={v => set('contact_phone_enabled', v)} />
          <Toggle label="Show WhatsApp contact" checked={!!form.contact_whatsapp_enabled} onChange={v => set('contact_whatsapp_enabled', v)} />
        </div>}

        {active === 'homepage' && <div className={`grid gap-5 ${cardClass}`}>
          <Area label="Announcement Bar Text" value={form.announcement_bn} onChange={v => set('announcement_bn', v)} />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['homepage_show_categories','Shop by Category'],
              ['homepage_show_all_products','Our Products'],
              ['homepage_show_best_sellers','Best Sellers'],
              ['homepage_show_new_arrivals','New Arrivals'],
              ['homepage_show_sale','On Sale'],
              ['homepage_show_hair_care','Hair Care'],
              ['homepage_show_skin_care','Skin Care'],
              ['homepage_show_reviews','Customer Reviews'],
              ['homepage_show_how_to_order','How to Order'],
              ['homepage_show_why_choose_us','Why Choose Us'],
            ].map(([key,label]) => <Toggle key={key} label={label} checked={!!form[key]} onChange={v => set(key,v)} />)}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Toggle label="Banner autoplay" checked={!!form.homepage_banner_autoplay} onChange={v => set('homepage_banner_autoplay', v)} />
            <Field label="Banner interval (ms)" value={form.homepage_banner_interval} onChange={v => set('homepage_banner_interval', Math.max(1000, Number(v) || 5000))} type="number" />
          </div>
          <p className="text-xs text-gray-500">Banner images/text/buttons are still managed from the existing Banners tab. This setting controls their homepage behavior.</p>
        </div>}

        {active === 'products' && <div className={`grid gap-5 ${cardClass}`}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Low Stock Alert Threshold" value={form.product_low_stock_threshold} onChange={v => set('product_low_stock_threshold', Math.max(0, Number(v) || 0))} type="number" />
          </div>
          <Toggle label="Allow product reviews" checked={!!form.product_allow_reviews} onChange={v => set('product_allow_reviews', v)} />
        </div>}

        {active === 'checkout' && <div className={`grid gap-5 ${cardClass}`}>
          <Toggle label="Allow guest checkout" checked={!!form.checkout_guest_enabled} onChange={v => set('checkout_guest_enabled', v)} />
          <Toggle label="Require customer email" checked={!!form.checkout_require_email} onChange={v => set('checkout_require_email', v)} />
          <Toggle label="Require terms acceptance" checked={!!form.checkout_require_terms} onChange={v => set('checkout_require_terms', v)} />
          <Field label="Duplicate order protection window (minutes)" value={form.order_duplicate_window_minutes} onChange={v => set('order_duplicate_window_minutes', Math.max(1, Number(v) || 5))} type="number" />
        </div>}

        {active === 'shipping' && <div className={`grid gap-5 ${cardClass}`}>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Inside Dhaka" value={form.delivery_inside_dhaka} onChange={v => set('delivery_inside_dhaka', v)} type="number" />
            <Field label="Outside Dhaka" value={form.delivery_outside_dhaka} onChange={v => set('delivery_outside_dhaka', v)} type="number" />
            <Field label="Free Delivery Minimum" value={form.free_delivery_minimum} onChange={v => set('free_delivery_minimum', v)} type="number" />
          </div>
          <Toggle label="Enable free delivery rule" checked={!!form.free_delivery_enabled} onChange={v => set('free_delivery_enabled', v)} />
          <p className="text-xs text-gray-500">Your existing Bangladesh district/thana delivery logic remains active. These settings control the base store-level values.</p>
        </div>}

        {active === 'payments' && <div className={`grid gap-5 ${cardClass}`}>
          <Toggle label="Cash on Delivery" checked={!!form.cod_enabled} onChange={v => set('cod_enabled', v)} />
          <Toggle label="Online payment gateway" checked={!!form.online_payment_enabled} onChange={v => set('online_payment_enabled', v)} />
          <Toggle label="Automatic invoice" checked={!!form.invoice_enabled} onChange={v => set('invoice_enabled', v)} />
          <p className="text-xs text-gray-500">Online gateway credentials should be added later through a secure integration. Never place secret keys in this settings table.</p>
        </div>}

        {active === 'customers' && <div className={`grid gap-5 ${cardClass}`}>
          <Toggle label="Google login" checked={!!form.customer_google_login_enabled} onChange={v => set('customer_google_login_enabled', v)} />
          <Toggle label="Email login" checked={!!form.customer_email_login_enabled} onChange={v => set('customer_email_login_enabled', v)} />
          <Toggle label="Newsletter subscription" checked={!!form.newsletter_enabled} onChange={v => set('newsletter_enabled', v)} />
        </div>}

        {active === 'notifications' && <div className={`grid gap-5 ${cardClass}`}>
          <Toggle label="WhatsApp notifications" checked={!!form.whatsapp_notifications_enabled} onChange={v => set('whatsapp_notifications_enabled', v)} />
          <Toggle label="Email notifications" checked={!!form.email_notifications_enabled} onChange={v => set('email_notifications_enabled', v)} />
          <Toggle label="SMS notifications" checked={!!form.sms_notifications_enabled} onChange={v => set('sms_notifications_enabled', v)} />
        </div>}

        {active === 'social' && <div className={`grid gap-5 ${cardClass}`}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="WhatsApp Number" value={form.whatsapp_number} onChange={v => set('whatsapp_number', String(v).replace(/\\D/g,'').slice(0,13))} />
            <Field label="Facebook URL" value={form.facebook_url} onChange={v => set('facebook_url', v)} />
            <Field label="Instagram URL" value={form.instagram_url} onChange={v => set('instagram_url', v)} />
            <Field label="TikTok URL" value={form.tiktok_url} onChange={v => set('tiktok_url', v)} />
            <Field label="YouTube URL" value={form.youtube_url} onChange={v => set('youtube_url', v)} />
          </div>
        </div>}

        {active === 'marketing' && <div className={`grid gap-5 ${cardClass}`}>
          <Toggle label="Meta Pixel" checked={!!form.meta_pixel_enabled} onChange={v => set('meta_pixel_enabled', v)} />
          <Toggle label="Google Analytics" checked={!!form.google_analytics_enabled} onChange={v => set('google_analytics_enabled', v)} />
          <Field label="Google Analytics / Measurement ID" value={form.google_analytics_id} onChange={v => set('google_analytics_id', v)} />
          <Field label="Google Search Console verification code" value={form.google_search_console_code} onChange={v => set('google_search_console_code', v)} />
          <p className="text-xs text-gray-500">Meta CAPI secret/token stays in the existing secure Integration Center.</p>
        </div>}

        {active === 'seo' && <div className={`grid gap-5 ${cardClass}`}>
          <Field label="Default SEO Site Title" value={form.seo_site_title} onChange={v => set('seo_site_title', v)} />
          <Area label="Default Meta Description" value={form.seo_meta_description} onChange={v => set('seo_meta_description', v)} />
          <Field label="Canonical URL" value={form.seo_canonical_url} onChange={v => set('seo_canonical_url', v)} help="Example: https://yourdomain.com" />
          <Field label="Open Graph Image URL" value={form.seo_og_image_url} onChange={v => set('seo_og_image_url', v)} />
          <Toggle label="Noindex website" checked={!!form.seo_noindex} onChange={v => set('seo_noindex', v)} help="Keep OFF for a public production store." />
        </div>}

        {active === 'security' && <div className={`grid gap-5 ${cardClass}`}>
          <Toggle label="Maintenance mode" checked={!!form.maintenance_mode} onChange={v => set('maintenance_mode', v)} help="Use only when you intentionally want to hide the storefront." />
          <Toggle label="Automatic Pathao dispatch" checked={!!form.order_auto_dispatch_enabled} onChange={v => set('order_auto_dispatch_enabled', v)} />
        </div>}

        {active === 'integrations' && <div className={`grid gap-5 ${cardClass}`}>
          <p className="text-sm text-gray-600">Pathao, Meta CAPI and Universal Order Management keep their existing dedicated admin screens so your current setup is not broken.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border bg-gray-50 p-4 text-sm"><b>Pathao</b><br/>Configure credentials in the existing Integration Center.</div>
            <div className="rounded-xl border bg-gray-50 p-4 text-sm"><b>Universal OMS</b><br/>Configure REST API, webhooks and status mapping in Order Management.</div>
          </div>
        </div>}

        <div className="mt-5 flex justify-end">
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save {current.label}
          </button>
        </div>
      </section>
    </div>
  </div>;
}
