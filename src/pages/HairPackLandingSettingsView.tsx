import { FormEvent, useEffect, useState } from 'react';
import { Save, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

type LandingSettings = {
  id: number; is_enabled: boolean; hero_eyebrow: string; hero_title: string; hero_description: string; hero_image_url: string | null;
  primary_button_text: string; secondary_button_text: string; show_benefits: boolean; show_how_to_use: boolean;
  show_editorial_reviews: boolean; show_faq: boolean; show_whatsapp: boolean; show_sticky_order_bar: boolean;
  reviews_heading: string; reviews_description: string; benefits_heading: string; how_to_use_heading: string;
  show_trust_strip: boolean; show_product_info: boolean; show_contact_section: boolean; show_order_section: boolean;
  benefits_description: string; how_to_use_description: string; order_heading: string; order_description: string; contact_heading: string; contact_description: string;
  trust_one_title: string; trust_one_description: string; trust_two_title: string; trust_two_description: string; trust_three_title: string; trust_three_description: string;
};
const defaults: LandingSettings = {
 id:1,is_enabled:true,hero_eyebrow:'GHOROYA ROOPCHARCHA',hero_title:'ঘরোয়া যত্নে চুলের পরিচর্যা',
 hero_description:'চুলের যত্নের রুটিনে যোগ করুন ঘরোয়া হেয়ার প্যাক।',hero_image_url:null,
 primary_button_text:'অর্ডার করুন',secondary_button_text:'কার্টে যোগ করুন',show_benefits:true,show_how_to_use:true,
 show_editorial_reviews:true,show_faq:true,show_whatsapp:true,show_sticky_order_bar:true,
 reviews_heading:'রিভিউ ও অভিজ্ঞতা',reviews_description:'আমাদের বেছে নেওয়া ছবি ও ভিডিও রিভিউ',
 benefits_heading:'কেন বেছে নেবেন',how_to_use_heading:'ব্যবহার সহজ রাখুন',
 show_trust_strip:true,show_product_info:true,show_contact_section:true,show_order_section:true,
 benefits_description:'প্রতিদিনের ব্যস্ততার মাঝেও নিজের যত্নে রাখুন একটু সময়। আপনার হেয়ার কেয়ার রুটিন শুরু হোক সহজ এক ধাপে.',
 how_to_use_description:'প্যাকেটের নির্দেশনা পড়ে ব্যবহার করুন। প্রথমবার হলে অল্প জায়গায় পরীক্ষা করে নেওয়া ভালো—বিশেষ করে আপনার স্ক্যাল্প সংবেদনশীল হলে।',
 order_heading:'আজই যোগ করুন আপনার যত্নের রুটিনে',order_description:'পছন্দের পণ্যটি বেছে নিন এবং কয়েকটি সহজ ধাপেই অর্ডার সম্পন্ন করুন.',
 contact_heading:'কোনো প্রশ্ন আছে?',contact_description:'পণ্য সম্পর্কে জানতে WhatsApp-এ মেসেজ দিন অথবা সাইটের লাইভ চ্যাটে আমাদের সঙ্গে কথা বলুন.',
 trust_one_title:'ঘরোয়া যত্ন',trust_one_description:'নিজের রুটিনে',trust_two_title:'নিজের জন্য সময়',trust_two_description:'একটি যত্নের ধাপ',trust_three_title:'সহজ অর্ডার',trust_three_description:'অনলাইনেই'
};
const toggles: [keyof LandingSettings,string][] = [
 ['is_enabled','Landing Page চালু রাখুন'],['show_benefits','Benefits section দেখান'],['show_how_to_use','ব্যবহারের নিয়ম দেখান'],
 ['show_trust_strip','Hero-এর নিচের ৩টি তথ্যের বক্স দেখান'],['show_product_info','পণ্যের বিস্তারিত তথ্যের সেকশন দেখান'],['show_contact_section','WhatsApp / Live Chat সেকশন দেখান'],['show_order_section','নিচের Order CTA সেকশন দেখান'],
 ['show_editorial_reviews','Admin-এর ছবি/ভিডিও রিভিউ দেখান'],['show_faq','FAQ section দেখান'],
 ['show_whatsapp','WhatsApp contact button দেখান'],['show_sticky_order_bar','Sticky order bar দেখান']
];
export default function HairPackLandingSettingsView() {
 const [form,setForm]=useState<LandingSettings>(defaults); const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [notice,setNotice]=useState('');
 const load=async()=>{setLoading(true); const {data,error}=await supabase.from('hairpack_landing_page_settings').select('*').eq('id',1).maybeSingle(); if(error) setNotice('সেটিংস লোড হয়নি: '+error.message); else setForm({...defaults,...(data||{})}); setLoading(false);};
 useEffect(()=>{void load();},[]);
 const change=(key:keyof LandingSettings,value:any)=>setForm(prev=>({...prev,[key]:value}));
 const save=async(e:FormEvent)=>{e.preventDefault();setSaving(true);setNotice('');const payload={...form,updated_at:new Date().toISOString()};const {error}=await supabase.from('hairpack_landing_page_settings').upsert(payload,{onConflict:'id'});if(error)setNotice('সেভ করা যায়নি: '+error.message);else setNotice('সেটিংস সেভ হয়েছে। Landing page refresh করলে পরিবর্তন দেখা যাবে।');setSaving(false);};
 if(loading)return <div className="p-8 text-sm text-gray-500">Landing page settings লোড হচ্ছে…</div>;
 const textField=(key:keyof LandingSettings,label:string,multiline=false)=><label className="block space-y-1 text-sm font-medium text-gray-700">{label}{multiline?<textarea rows={3} value={String(form[key]??'')} onChange={e=>change(key,e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 font-normal"/>:<input value={String(form[key]??'')} onChange={e=>change(key,e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 font-normal"/>}</label>;
 return <div className="mx-auto max-w-5xl space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-gray-900">Hair Pack Landing Page Control</h1><p className="mt-1 text-sm text-gray-500">এখান থেকে মূল লেখা, ছবি, বাটন এবং section visibility নিয়ন্ত্রণ করুন। পণ্যের দাম/স্টক Products থেকে নিয়ন্ত্রণ হবে; ছবি-ভিডিও রিভিউ Homepage Reviews থেকে।</p></div><button type="button" onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><RefreshCw size={15}/> Refresh</button></div>
  {notice&&<div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
  <form onSubmit={save} className="space-y-5">
   <section className="space-y-4 rounded-2xl border bg-white p-4 sm:p-6"><h2 className="font-semibold text-gray-900">Hero / প্রথম স্ক্রিন</h2><div className="grid gap-4 sm:grid-cols-2">{textField('hero_eyebrow','উপরের ছোট শিরোনাম')}{textField('hero_title','প্রধান শিরোনাম')}{textField('hero_description','বর্ণনা',true)}{textField('hero_image_url','নিজস্ব Hero image URL (খালি রাখলে Product image ব্যবহার হবে)')}{textField('primary_button_text','প্রধান Order button text')}{textField('secondary_button_text','দ্বিতীয় button text')}{textField('benefits_heading','Benefits heading')}{textField('benefits_description','Benefits description',true)}{textField('how_to_use_heading','How to use heading')}{textField('how_to_use_description','How-to-use description',true)}{textField('reviews_heading','Reviews heading')}{textField('reviews_description','Reviews description',true)}{textField('order_heading','শেষের Order section heading')}{textField('order_description','শেষের Order section description',true)}{textField('contact_heading','Contact section heading')}{textField('contact_description','Contact section description',true)}</div></section>
   <section className="space-y-4 rounded-2xl border bg-white p-4 sm:p-6"><h2 className="font-semibold text-gray-900">Hero-এর নিচের ৩টি তথ্যের বক্স</h2><div className="grid gap-4 sm:grid-cols-2">{textField('trust_one_title','প্রথম বক্সের শিরোনাম')}{textField('trust_one_description','প্রথম বক্সের ছোট লেখা')}{textField('trust_two_title','দ্বিতীয় বক্সের শিরোনাম')}{textField('trust_two_description','দ্বিতীয় বক্সের ছোট লেখা')}{textField('trust_three_title','তৃতীয় বক্সের শিরোনাম')}{textField('trust_three_description','তৃতীয় বক্সের ছোট লেখা')}</div></section>
   <section className="space-y-3 rounded-2xl border bg-white p-4 sm:p-6"><h2 className="font-semibold text-gray-900">Section ও বাটন নিয়ন্ত্রণ</h2>{toggles.map(([key,label])=><label key={key} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 p-3"><span className="text-sm font-medium text-gray-700">{label}</span><input type="checkbox" checked={Boolean(form[key])} onChange={e=>change(key,e.target.checked)} className="h-5 w-5 accent-[#294b37]"/></label>)}</section>
   <div className="flex flex-wrap items-center gap-3"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#294b37] px-5 py-3 font-semibold text-white disabled:opacity-60"><Save size={17}/>{saving?'সেভ হচ্ছে…':'পরিবর্তন সেভ করুন'}</button><a href="/hairpack" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border bg-white px-5 py-3 font-semibold text-gray-700"><Eye size={17}/> Landing page দেখুন</a></div>
  </form>
 </div>;
}
