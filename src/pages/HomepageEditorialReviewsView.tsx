import { FormEvent, useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

type EditorialReview = { id: string; customer_name: string; title: string | null; review_text: string; location: string | null; rating: number; media_urls: string[]; sort_order: number; is_active: boolean };
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime';

export default function HomepageEditorialReviewsView() {
  const blank = { customer_name: '', title: '', review_text: '', location: '', rating: 5, sort_order: 0, is_active: true };
  const [items, setItems] = useState<EditorialReview[]>([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const result = await supabase.from('homepage_editorial_reviews').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: false });
    if (result.error) setError(result.error.message);
    setItems((result.data || []) as EditorialReview[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const reset = () => { setForm(blank); setEditingId(null); setMediaUrls([]); setError(''); };
  const edit = (item: EditorialReview) => {
    setEditingId(item.id);
    setForm({ customer_name: item.customer_name || '', title: item.title || '', review_text: item.review_text || '', location: item.location || '', rating: Number(item.rating || 5), sort_order: Number(item.sort_order || 0), is_active: Boolean(item.is_active) });
    setMediaUrls(item.media_urls || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const uploadFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true); setError('');
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        if (!ACCEPTED.split(',').includes(file.type)) throw new Error('শুধু JPG, PNG, WEBP, GIF, MP4, WEBM বা MOV ফাইল দিন।');
        if (file.size > 30 * 1024 * 1024) throw new Error('প্রতি ফাইল সর্বোচ্চ ৩০ MB হতে পারবে।');
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = 'homepage-editorial/' + Date.now() + '-' + crypto.randomUUID() + '.' + ext;
        const uploaded = await supabase.storage.from('review-media').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (uploaded.error) throw uploaded.error;
        added.push(supabase.storage.from('review-media').getPublicUrl(path).data.publicUrl);
      }
      setMediaUrls(current => [...current, ...added]);
    } catch (err: any) { setError(err.message || 'মিডিয়া আপলোড করা যায়নি।'); }
    finally { setUploading(false); }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (!form.customer_name.trim()) throw new Error('নাম লিখুন।');
      if (!form.review_text.trim() && mediaUrls.length === 0) throw new Error('রিভিউর লেখা অথবা ছবি/ভিডিও যোগ করুন।');
      const payload = { customer_name: form.customer_name.trim(), title: form.title.trim() || null, review_text: form.review_text.trim(), location: form.location.trim() || null, rating: Number(form.rating), media_urls: mediaUrls, sort_order: Number(form.sort_order || 0), is_active: form.is_active, updated_at: new Date().toISOString() };
      const result = editingId ? await supabase.from('homepage_editorial_reviews').update(payload).eq('id', editingId) : await supabase.from('homepage_editorial_reviews').insert(payload);
      if (result.error) throw result.error;
      reset(); await load();
    } catch (err: any) { setError(err.message || 'রিভিউ সেভ করা যায়নি।'); }
    finally { setSaving(false); }
  };
  const remove = async (item: EditorialReview) => {
    if (!window.confirm('এই Homepage Review মুছে ফেলতে চান?')) return;
    const result = await supabase.from('homepage_editorial_reviews').delete().eq('id', item.id);
    if (result.error) setError(result.error.message); else { if (editingId === item.id) reset(); await load(); }
  };
  const toggle = async (item: EditorialReview) => {
    const result = await supabase.from('homepage_editorial_reviews').update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (result.error) setError(result.error.message); else await load();
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-gray-900">Homepage Reviews</h1><p className="mt-1 text-sm text-gray-500">এখানে যোগ করা রিভিউ Customer Reviews থেকে সম্পূর্ণ আলাদা থাকবে।</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm"><RefreshCw size={16}/> Refresh</button></div>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <form onSubmit={save} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{editingId ? 'Edit Homepage Review' : 'Add Homepage Review'}</h2>{editingId && <button type="button" onClick={reset} className="rounded-lg border px-3 py-2 text-sm">Cancel edit</button>}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">Name *<input required value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" placeholder="নাম / ব্র্যান্ড"/></label>
        <label className="space-y-1 text-sm font-medium">Location<input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" placeholder="যেমন: ঢাকা"/></label>
        <label className="space-y-1 text-sm font-medium sm:col-span-2">Title<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" placeholder="রিভিউর শিরোনাম"/></label>
        <label className="space-y-1 text-sm font-medium sm:col-span-2">Review text<textarea rows={4} value={form.review_text} onChange={e => setForm({ ...form, review_text: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal" placeholder="রিভিউ লিখুন..."/></label>
        <label className="space-y-1 text-sm font-medium">Rating<select value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal">{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}</select></label>
        <label className="space-y-1 text-sm font-medium">Sort order<input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal"/></label>
      </div>
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-gray-800">Photos & Videos</p><p className="text-xs text-gray-500">একসঙ্গে একাধিক ফাইল; প্রতি ফাইল সর্বোচ্চ ৩০ MB</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#263A2D] px-4 py-2.5 text-sm font-medium text-white"><Upload size={16}/> {uploading ? 'Uploading…' : 'Upload media'}<input type="file" accept={ACCEPTED} multiple disabled={uploading} className="hidden" onChange={e => { void uploadFiles(e.target.files); e.currentTarget.value = ''; }}/></label></div>
      {mediaUrls.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{mediaUrls.map(url => <div key={url} className="relative overflow-hidden rounded-lg border bg-white">{/\.(mp4|webm|mov)(\?|$)/i.test(url) ? <video src={url} controls className="h-36 w-full object-cover"/> : <img src={url} alt="Review media" className="h-36 w-full object-cover"/>}<button type="button" onClick={() => setMediaUrls(current => current.filter(x => x !== url))} className="absolute right-2 top-2 rounded-full bg-red-600 p-1.5 text-white" aria-label="Remove media"><Trash2 size={14}/></button></div>)}</div>}</div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}/> Show on homepage</label>
      <button type="submit" disabled={saving || uploading} className="inline-flex items-center gap-2 rounded-lg bg-[#263A2D] px-5 py-3 font-semibold text-white disabled:opacity-60">{saving ? <Loader2 size={17} className="animate-spin"/> : <Save size={17}/>} {editingId ? 'Save changes' : 'Add Homepage Review'}</button>
    </form>
    <div className="space-y-3"><h2 className="text-lg font-semibold">Your Homepage Reviews ({items.length})</h2>{loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin"/></div> : items.length === 0 ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">এখনো কোনো Homepage Review যোগ করা হয়নি।</div> : items.map(item => <article key={item.id} className="flex flex-col gap-4 rounded-xl border bg-white p-4 sm:flex-row sm:items-center">{item.media_urls?.[0] && (/\.(mp4|webm|mov)(\?|$)/i.test(item.media_urls[0]) ? <video src={item.media_urls[0]} className="h-24 w-24 rounded-lg bg-black object-cover"/> : <img src={item.media_urls[0]} alt="" className="h-24 w-24 rounded-lg object-cover"/>)}<div className="min-w-0 flex-1"><div className="font-semibold">{item.title || item.customer_name}</div><p className="mt-1 line-clamp-2 text-sm text-gray-500">{item.review_text || 'Media review'}</p><p className="mt-1 text-xs text-gray-400">{item.media_urls?.length || 0} media · {item.is_active ? 'Visible on homepage' : 'Hidden'}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => edit(item)} className="rounded-lg border px-3 py-2 text-sm">Edit</button><button type="button" onClick={() => void toggle(item)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm">{item.is_active ? <EyeOff size={14}/> : <Eye size={14}/>} {item.is_active ? 'Hide' : 'Show'}</button><button type="button" onClick={() => void remove(item)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600"><Trash2 size={14}/> Delete</button></div></article>)}</div>
  </div>;
}
