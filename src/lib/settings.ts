import { supabase } from '@/lib/supabase';
import type { SiteSettings } from '@/lib/types';

const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  brand_name: 'Homemade Beauty Care',
  brand_tagline_bn: 'প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া',
  logo_url: null,
  favicon_url: null,
  phone: '01999478203',
  whatsapp_number: '01999478203',
  email: 'support.ghrcha@gmail.com',
  address_bn: 'ঢাকা, বাংলাদেশ',
  facebook_url: '',
  instagram_url: '',
  tiktok_url: '',
  youtube_url: '',
  delivery_inside_dhaka: 70,
  delivery_outside_dhaka: 120,
  free_delivery_threshold: 0,
  currency: '৳',
  footer_text_bn: 'চুল ও ত্বকের দৈনন্দিন যত্নকে আরও সহজ ও সুন্দর করার জন্য আমাদের যাত্রা।',
  announcement_bn: 'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি | অর্ডার করতে কল করুন: 01999478203',
  combo_offer_enabled: true,
  combo_offer_badge: 'Combo Offer',
  combo_offer_title: 'একসাথে যত্ন, একসাথে সাশ্রয়',
  combo_offer_description: 'চুল ও ত্বকের যত্নের জন্য বেছে নিন আমাদের বিশেষ Combo Collection।',
  combo_offer_original_price: 1600,
  combo_offer_price: 1200,
  combo_offer_image_url: null,
  combo_offer_button_text: 'Combo Collection দেখুন',
  combo_offer_button_link: '/shop',
  site_language: 'bn',
  timezone: 'Asia/Dhaka',
  maintenance_mode: false,
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
  meta_pixel_enabled: false,
  google_analytics_enabled: false,
  google_analytics_id: '',
  google_search_console_code: '',
  seo_site_title: 'Homemade Beauty Care',
  seo_meta_description: 'Natural hair and skin care products in Bangladesh.',
  seo_canonical_url: '',
  seo_og_image_url: '',
  seo_noindex: false,
  contact_whatsapp_enabled: true,
  contact_phone_enabled: true,
};

let cachedSettings: SiteSettings | null = null;

export async function getSettings(): Promise<SiteSettings> {
  if (cachedSettings) return cachedSettings;
  const { data } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  cachedSettings = data || DEFAULT_SETTINGS;
  return cachedSettings;
}

export async function updateSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .update(updates)
    .eq('id', 1)
    .select()
    .single();
  if (error) throw error;
  cachedSettings = data;
  return data;
}

export function getDefaultSettings(): SiteSettings {
  return { ...DEFAULT_SETTINGS };
}

export function clearSettingsCache() {
  cachedSettings = null;
}

export function getDeliveryCharge(_settings: SiteSettings, district: string, _subtotal: number, thana = ''): number {
  if (district === 'ঢাকা') {
    const cityThanas = new Set([
      'আদাবর','এয়ারপোর্ট','বাড্ডা','বনানী','বংশাল','ক্যান্টনমেন্ট','চকবাজার','দারুস সালাম',
      'দক্ষিণখান','ডেমরা','ধানমন্ডি','গুলশান','হাজারীবাগ','যাত্রাবাড়ী','কদমতলী','কাফরুল',
      'কলাবাগান','কামরাঙ্গীরচর','খিলগাঁও','খিলক্ষেত','কোতোয়ালি','লালবাগ','মিরপুর','মোহাম্মদপুর',
      'মতিঝিল','মুগদা','নিউমার্কেট','পল্লবী','পল্টন','রমনা','রামপুরা','সবুজবাগ','শাহ আলী',
      'শাহবাগ','শ্যামপুর','শেরেবাংলা নগর','সূত্রাপুর','তেজগাঁও','তেজগাঁও শিল্পাঞ্চল','তুরাগ',
      'উত্তরা পূর্ব','উত্তরা পশ্চিম','ভাটারা','ওয়ারী'
    ]);
    if (cityThanas.has(thana.trim())) return _settings.delivery_inside_dhaka;

    if (['সাভার','নবাবগঞ্জ','দোহার','কেরাণীগঞ্জ','কেরানীগঞ্জ'].includes(thana.trim())) return 100;
  }
  if (district === 'গাজীপুর' || district === 'নারায়ণগঞ্জ') return Math.min(100, _settings.delivery_outside_dhaka);
  if (['সাভার','নবাবগঞ্জ','দোহার','কেরাণীগঞ্জ','কেরানীগঞ্জ'].includes(thana.trim())) return 100;
  return _settings.delivery_outside_dhaka;
}
