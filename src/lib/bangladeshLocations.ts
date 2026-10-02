export type BangladeshLocation = {
  id: string;
  name: string;
  bn_name: string;
};

const API_BASE = 'https://bdapis.pro.bd/geo/v2.0';

const FALLBACK_DISTRICTS: BangladeshLocation[] = [
  'ঢাকা','ফরিদপুর','গাজীপুর','গোপালগঞ্জ','কিশোরগঞ্জ','মাদারীপুর','মানিকগঞ্জ','মুন্সীগঞ্জ','নারায়ণগঞ্জ','নরসিংদী','রাজবাড়ী','শরীয়তপুর','টাঙ্গাইল',
  'বাগেরহাট','চুয়াডাঙ্গা','যশোর','ঝিনাইদহ','খুলনা','কুষ্টিয়া','মাগুরা','মেহেরপুর','নড়াইল','সাতক্ষীরা',
  'বান্দরবান','ব্রাহ্মণবাড়িয়া','চাঁদপুর','চট্টগ্রাম','কুমিল্লা','কক্সবাজার','ফেনী','খাগড়াছড়ি','লক্ষ্মীপুর','নোয়াখালী','রাঙ্গামাটি',
  'বগুড়া','জয়পুরহাট','নওগাঁ','নাটোর','চাঁপাইনবাবগঞ্জ','পাবনা','রাজশাহী','সিরাজগঞ্জ',
  'হবিগঞ্জ','মৌলভীবাজার','সুনামগঞ্জ','সিলেট',
  'দিনাজপুর','গাইবান্ধা','কুড়িগ্রাম','লালমনিরহাট','নীলফামারী','পঞ্চগড়','রংপুর','ঠাকুরগাঁও',
  'জামালপুর','ময়মনসিংহ','নেত্রকোণা','শেরপুর',
  'বরগুনা','বরিশাল','ভোলা','ঝালকাঠি','পটুয়াখালী','পিরোজপুর'
].map((bn_name, index) => ({
  id: String(index + 1),
  name: bn_name,
  bn_name,
}));

export const DHAKA_CITY_THANAS = [
  'আদাবর','এয়ারপোর্ট','বাড্ডা','বনানী','বংশাল','ক্যান্টনমেন্ট','চকবাজার','দারুস সালাম',
  'দক্ষিণখান','ডেমরা','ধানমন্ডি','গুলশান','হাজারীবাগ','যাত্রাবাড়ী','কদমতলী','কাফরুল',
  'কলাবাগান','কামরাঙ্গীরচর','খিলগাঁও','খিলক্ষেত','কোতোয়ালি','লালবাগ','মিরপুর','মোহাম্মদপুর',
  'মতিঝিল','মুগদা','নিউমার্কেট','পল্লবী','পল্টন','রমনা','রামপুরা','সবুজবাগ','শাহ আলী',
  'শাহবাগ','শ্যামপুর','শেরেবাংলা নগর','সূত্রাপুর','তেজগাঁও','তেজগাঁও শিল্পাঞ্চল','তুরাগ',
  'উত্তরা পূর্ব','উত্তরা পশ্চিম','ভাটারা','ওয়ারী'
];

export async function getDistricts(): Promise<BangladeshLocation[]> {
  try {
    const response = await fetch(API_BASE + '/districts');
    if (!response.ok) throw new Error('District API failed');
    const json = await response.json();
    return (json.data || []).map((item: any) => ({
      id: String(item.id),
      name: item.name,
      bn_name: item.bn_name,
    }));
  } catch {
    return FALLBACK_DISTRICTS;
  }
}

export async function getThanas(districtId: string): Promise<BangladeshLocation[]> {
  try {
    const response = await fetch(API_BASE + '/upazilas/' + districtId);
    if (!response.ok) throw new Error('Upazila API failed');
    const json = await response.json();
    return (json.data || []).map((item: any) => ({
      id: String(item.id),
      name: item.name,
      bn_name: item.bn_name,
    }));
  } catch {
    return [];
  }
}

export function isDhakaCityThana(thana: string): boolean {
  return DHAKA_CITY_THANAS.includes(thana.trim());
}

export function getDeliveryZone(
  district: string,
  thana: string
): 70 | 100 | 120 {
  const d = district.trim();
  const t = thana.trim();

  if (d === 'ঢাকা' && isDhakaCityThana(t)) return 70;

  if (
    d === 'ঢাকা' &&
    ['সাভার','নবাবগঞ্জ','দোহার','কেরাণীগঞ্জ','কেরানীগঞ্জ'].includes(t)
  ) return 100;

  if (d === 'গাজীপুর' || d === 'নারায়ণগঞ্জ') return 100;

  if (t === 'সাভার' || t === 'নবাবগঞ্জ' || t === 'দোহার' || t === 'কেরাণীগঞ্জ' || t === 'কেরানীগঞ্জ') {
    return 100;
  }

  return 120;
}
