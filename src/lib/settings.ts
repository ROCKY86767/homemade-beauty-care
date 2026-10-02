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
    if (cityThanas.has(thana.trim())) return 70;
    if (['সাভার','নবাবগঞ্জ','দোহার','কেরাণীগঞ্জ','কেরানীগঞ্জ'].includes(thana.trim())) return 100;
  }
  if (district === 'গাজীপুর' || district === 'নারায়ণগঞ্জ') return 100;
  if (['সাভার','নবাবগঞ্জ','দোহার','কেরাণীগঞ্জ','কেরানীগঞ্জ'].includes(thana.trim())) return 100;
  return 120;
}
