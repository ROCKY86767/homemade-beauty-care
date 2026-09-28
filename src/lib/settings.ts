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
  delivery_inside_dhaka: 60,
  delivery_outside_dhaka: 120,
  free_delivery_threshold: 1000,
  currency: '৳',
  footer_text_bn: 'চুল ও ত্বকের দৈনন্দিন যত্নকে আরও সহজ ও সুন্দর করার জন্য আমাদের যাত্রা।',
  announcement_bn: 'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি | অর্ডার করতে কল করুন: 01999478203',
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

export function clearSettingsCache() {
  cachedSettings = null;
}

export function getDeliveryCharge(settings: SiteSettings, district: string, subtotal: number): number {
  if (subtotal >= settings.free_delivery_threshold) return 0;
  const isDhaka = district === 'ঢাকা' || district.toLowerCase().includes('dhaka');
  return isDhaka ? settings.delivery_inside_dhaka : settings.delivery_outside_dhaka;
}
