export type BangladeshLocation = {
  id: string;
  name: string;
  bn_name: string;
};

const API_BASE = 'https://bdapis.pro.bd/geo/v2.0';

const FALLBACK_DISTRICTS: BangladeshLocation[] = [
  ['1','চট্টগ্রাম'],['2','রাজশাহী'],['3','খুলনা'],['4','বরিশাল'],['5','সিলেট'],
  ['6','ঢাকা'],['7','রংপুর'],['8','ময়মনসিংহ'],['9','বাগেরহাট'],['10','চুয়াডাঙ্গা'],
  ['11','যশোর'],['12','ঝিনাইদহ'],['13','কুষ্টিয়া'],['14','মাগুরা'],['15','মেহেরপুর'],
  ['16','নড়াইল'],['17','সাতক্ষীরা'],['18','বান্দরবান'],['19','ব্রাহ্মণবাড়িয়া'],
  ['20','চাঁদপুর'],['21','চট্টগ্রাম'],['22','কুমিল্লা'],['23','কক্সবাজার'],['24','ফেনী'],
  ['25','খাগড়াছড়ি'],['26','লক্ষ্মীপুর'],['27','নোয়াখালী'],['28','রাঙ্গামাটি'],
  ['29','জয়পুরহাট'],['30','নওগাঁ'],['31','নাটোর'],['32','চাঁপাইনবাবগঞ্জ'],
  ['33','পাবনা'],['34','রাজশাহী'],['35','সিরাজগঞ্জ'],['36','হবিগঞ্জ'],['37','মৌলভীবাজার'],
  ['38','সুনামগঞ্জ'],['39','সিলেট'],['40','দিনাজপুর'],['41','গাইবান্ধা'],['42','কুড়িগ্রাম'],
  ['43','লালমনিরহাট'],['44','নীলফামারী'],['45','পঞ্চগড়'],['46','রংপুর'],['47','ঠাকুরগাঁও'],
  ['48','জামালপুর'],['49','ময়মনসিংহ'],['50','নেত্রকোণা'],['51','শেরপুর'],['52','বরগুনা'],
  ['53','বরিশাল'],['54','ভোলা'],['55','ঝালকাঠি'],['56','পটুয়াখালী'],['57','পিরোজপুর'],
  ['58','ফরিদপুর'],['59','গোপালগঞ্জ'],['60','কিশোরগঞ্জ'],['61','মাদারীপুর'],
  ['62','মানিকগঞ্জ'],['63','মুন্সীগঞ্জ'],['64','নারায়ণগঞ্জ'],['65','নরসিংদী'],
  ['66','রাজবাড়ী'],['67','শরীয়তপুর'],['68','টাঙ্গাইল'],['69','গাজীপুর'],['70','ঢাকা'],
].map(([id,bn_name]) => ({ id, name: bn_name, bn_name }));

const DHAKA_CITY_THANAS = new Set([
  'আদাবর','এয়ারপোর্ট','বাড্ডা','বনানী','বংশাল','ক্যান্টনমেন্ট','চকবাজার','দারুস সালাম',
  'দক্ষিণখান','ডেমরা','ধানমন্ডি','গুলশান','হাজারীবাগ','যাত্রাবাড়ী','কদমতলী','কাফরুল',
  'কলাবাগান','কামরাঙ্গীরচর','খিলগাঁও','খিলক্ষেত','কোতোয়ালি','লালবাগ','মিরপুর','মোহাম্মদপুর',
  'মতিঝিল','মুগদা','নিউমার্কেট','পল্লবী','পল্টন','রমনা','রামপুরা','সবুজবাগ','শাহ আলী',
  'শাহবাগ','শ্যামপুর','শেরেবাংলা নগর','সূত্রাপুর','তেজগাঁও','তেজগাঁও শিল্পাঞ্চল','তুরাগ',
  'উত্তরা পূর্ব','উত্তরা পশ্চিম','ভাটারা','ওয়ারী'
]);

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
  return DHAKA_CITY_THANAS.has(thana.trim());
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
