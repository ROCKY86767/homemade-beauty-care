import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, ChevronDown, Flower2, Heart, Leaf, MessageCircle, Minus, Plus, ShoppingBag, Sparkles, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, SiteSettings } from '@/lib/types';
import { useCart } from '@/lib/cart-context';
import { getSettings } from '@/lib/settings';
import { formatPrice, calculateDiscountPercent } from '@/lib/format';
import SEO from '@/components/SEO';

const fallbackBenefits = ['চুল পড়া কমাতে সহায়তা করতে পারে', 'চুল নরম ও মসৃণ রাখতে সহায়ক', 'চুলে উজ্জ্বল ও চকচকে ভাব আনতে সহায়তা করে', 'চুলের শুষ্কতা কমাতে সাহায্য করে', 'খুশকি কমাতে সহায়তা করতে পারে', 'চুল সুস্থ ও মজবুত রাখতে সহায়ক', 'চুলের স্বাভাবিক বৃদ্ধির যত্নে সহায়তা করে'];

export default function HairPackLandingPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [editorialReviews, setEditorialReviews] = useState<any[]>([]);
  const [landingSettings, setLandingSettings] = useState<any>(null);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const refreshProduct = async () => {
      const { data, error } = await supabase.from('products').select('*, category:categories(*)').eq('slug', 'ghorowa-hairpack').maybeSingle();
      if (!active) return;
      if (error) { console.error('Hair Pack product refresh error:', error); return; }
      setProduct((data as Product | null) ?? null);
    };
    const load = async () => {
      try {
        const [productResult, siteSettings, reviewsResult, landingResult] = await Promise.all([
          supabase.from('products').select('*, category:categories(*)').eq('slug', 'ghorowa-hairpack').maybeSingle(),
          getSettings(),
          supabase.from('homepage_editorial_reviews').select('*').eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
          supabase.from('hairpack_landing_page_settings').select('*').eq('id', 1).maybeSingle(),
        ]);
        if (!active) return;
        if (productResult.data) setProduct(productResult.data as Product);
        setSettings(siteSettings);
        if (reviewsResult.error) console.error('Hair Pack reviews load error:', reviewsResult.error);
        setEditorialReviews(reviewsResult.data || []);
        setLandingSettings(landingResult.data || {});
      } catch (error) { console.error('Hair Pack landing load error:', error); }
      finally { if (active) setLoading(false); }
    };
    void load();
    const channel = supabase.channel('hairpack-landing-product-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: 'slug=eq.ghorowa-hairpack' }, () => { void refreshProduct(); }).subscribe();
    const refresh = () => { if (document.visibilityState === 'visible') void refreshProduct(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); void supabase.removeChannel(channel); };
  }, []);

  const benefits = useMemo(() => {
    const source = product?.benefits_bn?.trim();
    if (!source) return fallbackBenefits;
    return source
      .split(/\\r?\\n|•|▪|✓|;|(?<=[.!?।])\\s+/)
      .map(item => item.replace(/^[-*\\d.)\\s]+/, '').trim())
      .filter(Boolean);
  }, [product?.benefits_bn]);

  const buyNow = () => {
    if (!product || product.stock < 1) return;
    const result = addToCart(product, quantity);
    if (result.success) navigate('/checkout');
    else { setMessage(result.message || 'এই পরিমাণ পণ্য স্টকে নেই।'); window.setTimeout(() => setMessage(''), 3000); }
  };
  const addItem = () => {
    if (!product || product.stock < 1) return;
    const result = addToCart(product, quantity);
    setMessage(result.success ? 'পণ্যটি কার্টে যোগ হয়েছে।' : (result.message || 'কার্টে যোগ করা যায়নি।'));
    window.setTimeout(() => setMessage(''), 3000);
  };

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center bg-[#f8f6ef]"><div className="h-9 w-9 animate-spin rounded-full border-2 border-[#dce8d5] border-t-[#315b32]" /></div>;
  if (!product) return <section className="bg-[#f8f6ef] px-5 py-20 text-center"><h1 className="text-3xl font-bold text-[#243d29]">ঘরোয়া হেয়ার প্যাক</h1><p className="mt-3 text-[#65745e]">এই মুহূর্তে পণ্যের তথ্য পাওয়া যাচ্ছে না।</p><Link to="/shop" className="mt-6 inline-flex rounded-full bg-[#315b32] px-6 py-3 font-semibold text-white">সব পণ্য দেখুন</Link></section>;
  if (landingSettings?.is_enabled === false) return <section className="min-h-[60vh] bg-[#f8f6ef] px-5 py-20 text-center"><h1 className="text-2xl font-bold text-[#315b32]">এই পেজটি আপাতত বন্ধ আছে</h1><p className="mt-3 text-sm text-[#65745e]">অনুগ্রহ করে পরে আবার দেখুন।</p><Link to="/shop" className="mt-6 inline-flex rounded-full bg-[#315b32] px-6 py-3 font-semibold text-white">সব পণ্য দেখুন</Link></section>;

  const gallery = product.gallery?.filter(Boolean).length ? product.gallery.filter(Boolean) : [product.image_url];
  const heroImage = landingSettings?.hero_image_url?.trim() || gallery[0] || product.image_url;
  const outOfStock = product.stock < 1;
  const productName = product.name_bn || 'ঘরোয়া হেয়ার প্যাক';
  const description = product.short_description_bn || product.description_bn || 'চুলের যত্নের রুটিনে যোগ করুন ঘরোয়া রূপচর্চার একটি সহজ ধাপ।';
  const discount = calculateDiscountPercent(product.price, product.old_price);
  const whatsapp = (settings?.whatsapp_number || '').replace(/\D/g, '').replace(/^0/, '88');

  return (
    <main className="hbc-hairpack min-h-screen overflow-x-clip bg-[#f8f6ef] pb-24 text-[#263b29] sm:pb-0">
      <SEO title={productName + ' | Homemade Beauty Care'} description={description} image={heroImage} canonical={window.location.origin + '/hairpack'}
        structuredData={{ '@context': 'https://schema.org', '@type': 'Product', name: productName, description: product.description_bn || description, image: gallery, brand: { '@type': 'Brand', name: settings?.brand_name || 'Homemade Beauty Care' }, offers: { '@type': 'Offer', priceCurrency: 'BDT', price: Number(product.price), availability: outOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: window.location.origin + '/hairpack' } }} />
      <style>{`
        .hbc-hairpack { font-family: inherit; }
        .hbc-hairpack .hp-serif { font-family: Georgia, 'Noto Serif Bengali', serif; }
        .hbc-hairpack .hp-btn { transition: transform .18s ease, background .18s ease; }
        .hbc-hairpack .hp-btn:active { transform: scale(.98); }
        .hbc-hairpack details[open] .hp-chevron { transform: rotate(180deg); }
        @media (prefers-reduced-motion: reduce) { .hbc-hairpack *, .hbc-hairpack *::before, .hbc-hairpack *::after { animation: none !important; transition: none !important; } }
      `}</style>

      <header className="border-b border-[#e8e0cc] bg-[#fffdf7] px-4 py-2.5">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2.5 sm:justify-start">
          <img src="/new-homemade-logo.png" alt="Homemade Beauty Care" className="h-10 w-10 rounded-xl object-contain sm:h-11 sm:w-11" />
          <div><p className="text-xs font-extrabold tracking-[.12em] text-[#315b32] sm:text-sm">HOMEMADE BEAUTY CARE</p><p className="text-[10px] text-[#77806e] sm:text-xs">প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া</p></div>
        </div>
      </header>

      {landingSettings?.show_sticky_order_bar !== false && <div className="sticky top-0 z-30 border-b border-[#e8e0cc] bg-[#fffdf7]/95 px-3 py-2 shadow-sm backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-[10px] text-[#737d6c] sm:text-xs">{productName}</p><p className="text-lg font-extrabold leading-6 text-[#315b32]">{formatPrice(product.price)}</p></div><a href="#order-hairpack" className="hp-btn inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-[#315b32] px-4 text-xs font-bold text-white shadow sm:px-5 sm:text-sm"><ShoppingBag size={15} />{landingSettings?.primary_button_text || 'এখনই অর্ডার করুন'}</a></div>
      </div>}

      <section className="relative isolate overflow-hidden bg-[#203f29] text-[#fffaf0]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_85%_10%,rgba(201,157,79,.25),transparent_42%),linear-gradient(135deg,#203f29,#315b32_65%,#294b31)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-5 px-4 py-5 sm:px-6 sm:py-9 lg:grid-cols-[.92fr_1.08fr] lg:gap-12 lg:px-8 lg:py-12">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d9b66b]/40 bg-white/5 px-3 py-1.5 text-[10px] font-bold tracking-[.13em] text-[#e6c77f] sm:text-xs"><Sparkles size={13} />{landingSettings?.hero_eyebrow || 'GHOROYA ROOPCHARCHA'}</span>
            <h1 className="hp-serif mt-4 max-w-xl text-[2.15rem] font-semibold leading-[1.2] text-[#fffaf0] sm:text-5xl lg:text-[3.35rem]">{landingSettings?.hero_title?.trim() || productName}</h1>
            <p className="mt-3 max-w-lg text-sm leading-7 text-white/85 sm:text-base sm:leading-8">{landingSettings?.hero_description?.trim() || description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5"><span className="text-3xl font-extrabold text-[#f4d995] sm:text-4xl">{formatPrice(product.price)}</span>{product.old_price && product.old_price > product.price && <><span className="text-sm text-white/55 line-through">{formatPrice(product.old_price)}</span><span className="rounded-full bg-[#e5c477] px-2.5 py-1 text-[11px] font-extrabold text-[#263b29]">{discount}% ছাড়</span></>}</div>
            {product.size_bn && <p className="mt-1 text-xs text-white/70">প্যাকের পরিমাণ: {product.size_bn}</p>}
            <div className="mt-5 flex flex-wrap gap-2.5"><a href="#order-hairpack" className="hp-btn inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e5c477] px-5 text-sm font-extrabold text-[#263b29] shadow-lg hover:bg-[#f0d99e]"><ShoppingBag size={17} />{outOfStock ? 'স্টকে নেই' : (landingSettings?.primary_button_text || 'অর্ডার করতে চাই')}<ArrowRight size={16} /></a><a href="#hairpack-details" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10">বিস্তারিত জানুন</a></div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/75 sm:text-xs"><span className="inline-flex items-center gap-1.5"><Truck size={14} className="text-[#e5c477]" /> সারা বাংলাদেশে ডেলিভারি</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#e5c477]" /> সহজ অর্ডার</span></div>
          </div>
          <div className="order-1 lg:order-2"><div className="relative mx-auto max-w-[520px]"><div className="absolute -inset-2 rotate-2 rounded-[2rem] border border-[#e5c477]/35" /><div className="relative overflow-hidden rounded-[1.6rem] bg-[#e9e2d2] shadow-[0_24px_60px_rgba(0,0,0,.25)] sm:rounded-[2rem]"><img src={heroImage} alt={productName} fetchPriority="high" className="aspect-[1.12/1] w-full object-cover sm:aspect-[1.15/1]" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#17291d]/75 to-transparent px-4 pb-4 pt-14"><p className="hp-serif text-lg font-semibold text-white sm:text-xl">যত্ন হোক নিজের মতো</p></div></div>{product.stock > 0 && <div className="absolute -right-1 -top-3 flex items-center gap-1.5 rounded-full bg-[#fff5d8] px-3 py-2 text-[10px] font-bold text-[#315b32] shadow-lg sm:-right-3 sm:top-4 sm:text-xs"><CheckCircle2 size={14} /> অর্ডার নেওয়া হচ্ছে</div>}</div>
            {gallery.length > 1 && <div className="mx-auto mt-2.5 grid max-w-[520px] grid-cols-4 gap-2">{gallery.slice(0, 4).map((src, i) => <img key={src + i} src={src} alt={productName + ' ছবি ' + (i + 1)} loading="lazy" className="aspect-square w-full rounded-xl border border-white/20 object-cover" />)}</div>}
          </div>
        </div>
      </section>

      {landingSettings?.show_trust_strip !== false && <section className="mx-auto -mt-1 max-w-5xl px-3 sm:-mt-4 sm:px-6"><div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[#e8e0cc] bg-[#fffdf7] shadow-[0_8px_25px_rgba(40,58,39,.07)]">
        <div className="px-2 py-3 text-center sm:px-4"><span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf0e2] text-[#315b32]"><Leaf size={16} /></span><p className="mt-1.5 text-[10px] font-bold text-[#263b29] sm:text-xs">{landingSettings?.trust_one_title || 'ঘরোয়া যত্ন'}</p><p className="text-[9px] text-[#78806f] sm:text-[11px]">{landingSettings?.trust_one_description || 'সহজ রুটিনে'}</p></div>
        <div className="border-x border-[#e8e0cc] px-2 py-3 text-center sm:px-4"><span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#f5edd8] text-[#96733b]"><Heart size={16} /></span><p className="mt-1.5 text-[10px] font-bold text-[#263b29] sm:text-xs">{landingSettings?.trust_two_title || 'নিজের জন্য সময়'}</p><p className="text-[9px] text-[#78806f] sm:text-[11px]">{landingSettings?.trust_two_description || 'নিজের যত্নে'}</p></div>
        <div className="px-2 py-3 text-center sm:px-4"><span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf0e2] text-[#315b32]"><ShoppingBag size={16} /></span><p className="mt-1.5 text-[10px] font-bold text-[#263b29] sm:text-xs">{landingSettings?.trust_three_title || 'সহজ অর্ডার'}</p><p className="text-[9px] text-[#78806f] sm:text-[11px]">{landingSettings?.trust_three_description || 'অনলাইনেই'}</p></div>
      </div></section>}

      {landingSettings?.show_benefits !== false && <section id="hairpack-details" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-11">
        <div className="mx-auto mb-5 max-w-2xl text-center">
          <p className="text-[10px] font-extrabold tracking-[.2em] text-[#a17c39]">WHY CHOOSE US</p>
          <h2 className="hp-serif mt-2 text-2xl font-semibold text-[#263b29] sm:text-3xl">কেনো আমাদেরকে বেছে নেবেন?</h2>
        </div>
        <div className="mx-auto grid max-w-5xl items-stretch gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-[#e3dfce] bg-gradient-to-br from-[#fffdf7] via-[#fffdf7] to-[#edf1e5] p-5 shadow-[0_10px_28px_rgba(40,58,39,.07)] sm:p-7">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e6eddf] text-[#315b32]"><Leaf size={22} /></div>
            <p className="text-[10px] font-extrabold tracking-[.16em] text-[#a17c39]">GHOROYA NATURAL CARE</p>
            <h3 className="hp-serif mt-2 text-xl font-semibold leading-snug text-[#263b29] sm:text-2xl">প্রকৃতির ছোঁয়ায় চুলের যত্ন</h3>
            <p className="mt-3 text-sm leading-7 text-[#586650]">ঘরোয়া পদ্ধতিতে তৈরি প্রাকৃতিক হেয়ার প্যাক, যা চুলকে দেয় পুষ্টি, কোমলতা আর স্বাভাবিক উজ্জ্বলতা। বাংলাদেশের আবহাওয়া আর চুলের কথা মাথায় রেখে বানানো।</p>
            <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-[#e8eee1] px-3 py-1.5 text-[11px] font-semibold text-[#426044]">ঘরোয়া যত্ন</span><span className="rounded-full bg-[#f3ecd9] px-3 py-1.5 text-[11px] font-semibold text-[#8a6a34]">প্রাকৃতিক উপাদান</span></div>
          </div>
          <div className="rounded-2xl border border-[#e3dfce] bg-[#fffdf7] p-5 shadow-[0_10px_28px_rgba(40,58,39,.07)] sm:p-7">
            <div className="mb-3 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf0e2] text-[#315b32]"><Sparkles size={20} /></span><div><h3 className="text-base font-bold text-[#263b29]">হেয়ার প্যাকের উপকারিতা</h3><p className="text-xs text-[#78806f]">Admin Panel-এ দেওয়া সব উপকারিতা</p></div></div>
            <div className="grid gap-2.5 sm:grid-cols-2">{benefits.map((item, index) => <div key={item + index} className="flex items-start gap-2.5 rounded-xl bg-[#f5f6ef] px-3 py-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e2eadb] text-[#315b32]"><Check size={14} /></span><p className="text-sm leading-6 text-[#40523d]">{item}</p></div>)}</div>
          </div>
        </div>
      </section>}

      {landingSettings?.show_product_info !== false && <section className="bg-[#f0f1e7] px-4 py-7 sm:py-9"><div className="mx-auto max-w-4xl"><div className="mb-4 text-center"><p className="text-[10px] font-extrabold tracking-[.2em] text-[#a17c39]">PRODUCT DETAILS</p><h2 className="hp-serif mt-1.5 text-2xl font-semibold text-[#263b29] sm:text-3xl">পণ্য সম্পর্কে জানুন</h2></div><div className="divide-y divide-[#e2e2d5] overflow-hidden rounded-2xl border border-[#e2e2d5] bg-[#fffdf7]">
        {product.ingredients_bn && <details className="px-4 py-3.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#315b32]"><span className="flex items-center gap-2"><Flower2 size={17} /> উপাদান</span><ChevronDown size={17} className="hp-chevron transition-transform" /></summary><p className="whitespace-pre-line pl-7 pt-2 text-sm leading-6 text-[#66715f]">{product.ingredients_bn}</p></details>}
        {product.who_is_it_for_bn && <details className="px-4 py-3.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#315b32]"><span className="flex items-center gap-2"><Heart size={17} /> কার জন্য উপযোগী</span><ChevronDown size={17} className="hp-chevron transition-transform" /></summary><p className="whitespace-pre-line pl-7 pt-2 text-sm leading-6 text-[#66715f]">{product.who_is_it_for_bn}</p></details>}
        {product.storage_bn && <details className="px-4 py-3.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#315b32]"><span className="flex items-center gap-2"><Leaf size={17} /> সংরক্ষণের নিয়ম</span><ChevronDown size={17} className="hp-chevron transition-transform" /></summary><p className="whitespace-pre-line pl-7 pt-2 text-sm leading-6 text-[#66715f]">{product.storage_bn}</p></details>}
        {product.notes_bn && <details className="px-4 py-3.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#315b32]"><span>বিশেষ তথ্য</span><ChevronDown size={17} className="hp-chevron transition-transform" /></summary><p className="whitespace-pre-line pl-7 pt-2 text-sm leading-6 text-[#66715f]">{product.notes_bn}</p></details>}
        <details className="px-4 py-3.5"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#315b32]"><span>সম্পূর্ণ পণ্যের বিবরণ</span><ChevronDown size={17} className="hp-chevron transition-transform" /></summary><p className="whitespace-pre-line pt-2 text-sm leading-6 text-[#66715f]">{product.description_bn || description}</p></details>
      </div></div></section>}

      {landingSettings?.show_editorial_reviews !== false && editorialReviews.length > 0 && <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9"><div className="mb-4"><p className="text-[10px] font-extrabold tracking-[.2em] text-[#a17c39]">CUSTOMER STORIES</p><h2 className="hp-serif mt-1.5 text-2xl font-semibold text-[#263b29] sm:text-3xl">{landingSettings?.reviews_heading || 'রিভিউ ও অভিজ্ঞতা'}</h2><p className="mt-1 text-sm text-[#687461]">{landingSettings?.reviews_description || 'আমাদের নির্বাচিত ছবি ও ভিডিও রিভিউ'}</p></div><div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {editorialReviews.map(item => <article key={item.id} className="w-[72vw] max-w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#e5e3d8] bg-white shadow-sm">{Array.isArray(item.media_urls) && item.media_urls.length > 0 && <div className="bg-[#eeeee6]">{item.media_urls.map((url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url) ? <video key={url} src={url} controls preload="metadata" playsInline className="max-h-[300px] w-full bg-black object-contain" /> : <img key={url} src={url} alt={item.title || item.customer_name || 'Customer review'} loading="lazy" className="max-h-[300px] w-full object-contain" />)}</div>}<div className="p-3.5"><p className="text-sm text-[#b28b48]">{'★'.repeat(Math.min(5, Math.max(1, Number(item.rating || 5))))}{'☆'.repeat(5 - Math.min(5, Math.max(1, Number(item.rating || 5))))}</p><h3 className="mt-1 text-sm font-bold text-[#315b32]">{item.title || item.customer_name}</h3>{item.location && <p className="text-[11px] text-[#899080]">{item.location}</p>}{item.review_text && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#65715e]">{item.review_text}</p>}</div></article>)}
      </div></section>}

      {landingSettings?.show_how_to_use !== false && <section className="bg-[#e9eee2] px-4 py-7 sm:px-6 sm:py-9"><div className="mx-auto grid max-w-5xl items-center gap-5 sm:grid-cols-[1fr_.8fr]"><div><p className="text-[10px] font-extrabold tracking-[.2em] text-[#a17c39]">HOW TO USE</p><h2 className="hp-serif mt-1.5 text-2xl font-semibold text-[#263b29] sm:text-3xl">{landingSettings?.how_to_use_heading || 'ব্যবহারবিধি জেনে নিন'}</h2><p className="mt-2 text-sm leading-6 text-[#687461]">{landingSettings?.how_to_use_description || 'পণ্যের প্যাকেট ও বিবরণে দেওয়া নির্দেশনা অনুসরণ করুন। প্রথমবার ব্যবহারের আগে অল্প জায়গায় পরীক্ষা করে নিন।'}</p>{product.how_to_use_bn && <p className="mt-3 whitespace-pre-line rounded-xl border border-[#dce3d5] bg-white/75 p-3 text-sm leading-6 text-[#40523d]">{product.how_to_use_bn}</p>}</div><div className="rounded-2xl bg-[#294b31] p-5 text-white sm:p-6"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5c477] text-[#294b31]"><Flower2 size={20} /></span><h3 className="hp-serif mt-3 text-xl font-semibold">নিজের যত্নে একটু সময়</h3><p className="mt-2 text-sm leading-6 text-white/75">উপাদান ও ব্যবহারবিধি দেখে আপনার রুটিনের সঙ্গে মানানসই হলে অর্ডার করুন।</p><a href="#order-hairpack" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#e5c477] px-4 py-2.5 text-sm font-bold text-[#263b29]">অর্ডার করতে চাই <ArrowRight size={15} /></a></div></div></section>}

      {landingSettings?.show_faq !== false && <section className="mx-auto max-w-4xl px-4 py-7 sm:px-6 sm:py-9"><div className="mb-4 text-center"><p className="text-[10px] font-extrabold tracking-[.2em] text-[#a17c39]">HELP & INFORMATION</p><h2 className="hp-serif mt-1.5 text-2xl font-semibold text-[#263b29] sm:text-3xl">সাধারণ কিছু প্রশ্ন</h2></div><div className="space-y-2">
        <details className="rounded-xl border border-[#e6e4d9] bg-[#fffdf7] px-4 py-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#315b32]">কীভাবে অর্ডার করব?<ChevronDown size={17} className="hp-chevron transition-transform" /></summary><p className="pt-2 text-sm leading-6 text-[#687461]">অর্ডার বাটনে ক্লিক করে Checkout পেজে নাম, ফোন নম্বর ও ঠিকানা দিয়ে অর্ডার সম্পন্ন করুন।</p></details>
        <details className="rounded-xl border border-[#e6e4d9] bg-[#fffdf7] px-4 py-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#315b32]">ডেলিভারি চার্জ কত?<ChevronDown size={17} className="hp-chevron transition-transform" /></summary><p className="pt-2 text-sm leading-6 text-[#687461]">আপনার ঠিকানা অনুযায়ী সঠিক ডেলিভারি চার্জ Checkout পেজে দেখানো হবে।</p></details>
        <details className="rounded-xl border border-[#e6e4d9] bg-[#fffdf7] px-4 py-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#315b32]">ব্যবহারবিধি কোথায় পাব?<ChevronDown size={17} className="hp-chevron transition-transform" /></summary><p className="pt-2 text-sm leading-6 text-[#687461]">পণ্যের বিবরণ ও ব্যবহারবিধি অংশে দেওয়া তথ্য অনুসরণ করুন। প্রয়োজনে Live Chat-এ প্রশ্ন করতে পারেন।</p></details>
      </div></section>}

      {landingSettings?.show_order_section !== false && <section id="order-hairpack" className="bg-[#203f29] px-4 py-7 text-white sm:px-6 sm:py-10"><div className="mx-auto grid max-w-5xl items-center gap-5 sm:grid-cols-[1fr_.9fr]"><div><p className="text-[10px] font-extrabold tracking-[.2em] text-[#e5c477]">READY TO ORDER?</p><h2 className="hp-serif mt-2 text-2xl font-semibold leading-tight sm:text-3xl">{landingSettings?.order_heading || 'আপনার পছন্দের হেয়ার প্যাক অর্ডার করুন'}</h2><p className="mt-2 max-w-md text-sm leading-6 text-white/75">{landingSettings?.order_description || 'পরিমাণ নির্বাচন করুন, অর্ডার বাটনে ক্লিক করুন এবং Checkout-এ ঠিকানা দিয়ে অর্ডার সম্পন্ন করুন।'}</p><div className="mt-4 flex items-center gap-2 text-xs text-white/75"><Truck size={15} className="text-[#e5c477]" /> ডেলিভারি চার্জ Checkout-এ দেখানো হবে</div></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.08] p-4 backdrop-blur sm:p-5"><div className="flex items-center gap-3"><img src={heroImage} alt="" loading="lazy" className="h-16 w-16 rounded-xl bg-white/10 object-cover sm:h-20 sm:w-20" /><div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-sm font-semibold">{productName}</h3><div className="mt-1 flex items-center gap-2"><span className="text-xl font-extrabold text-[#e5c477]">{formatPrice(product.price)}</span>{product.old_price && product.old_price > product.price && <span className="text-xs text-white/50 line-through">{formatPrice(product.old_price)}</span>}</div>{product.size_bn && <p className="text-[11px] text-white/60">{product.size_bn}</p>}</div></div>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-black/10 px-3 py-2"><span className="text-sm text-white/80">পরিমাণ</span><div className="flex items-center gap-4"><button type="button" aria-label="পরিমাণ কমান" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20"><Minus size={15} /></button><span className="min-w-4 text-center font-bold">{quantity}</span><button type="button" aria-label="পরিমাণ বাড়ান" onClick={() => setQuantity(q => Math.min(Math.max(1, product.stock), q + 1))} disabled={outOfStock} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 disabled:opacity-40"><Plus size={15} /></button></div></div>
          <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3 text-sm text-white/75"><span>মোট পণ্যমূল্য</span><strong className="text-lg text-[#e5c477]">{formatPrice(product.price * quantity)}</strong></div>
          <button type="button" onClick={buyNow} disabled={outOfStock} className="hp-btn mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#e5c477] px-5 text-sm font-extrabold text-[#263b29] hover:bg-[#f0d99e] disabled:opacity-50"><ShoppingBag size={17} />{outOfStock ? 'স্টকে নেই' : 'এখনই অর্ডার করুন'}<ArrowRight size={16} /></button>
          <button type="button" onClick={addItem} disabled={outOfStock} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white disabled:opacity-50">কার্টে যোগ করুন</button>{message && <p role="status" className="mt-2 text-center text-sm font-medium text-[#e5c477]">{message}</p>}
        </div></div></section>}

      {landingSettings?.show_contact_section !== false && <section className="mx-auto max-w-5xl px-4 py-5 sm:px-6"><div className="flex flex-col gap-3 rounded-2xl border border-[#e5e2d6] bg-[#fffdf7] p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold text-[#315b32]">{landingSettings?.contact_heading || 'কোনো প্রশ্ন আছে?'}</h2><p className="mt-1 text-xs leading-5 text-[#687461]">{landingSettings?.contact_description || 'পণ্য সম্পর্কে জানতে আমাদের সঙ্গে কথা বলুন।'}</p></div><div className="flex gap-2">{landingSettings?.show_whatsapp !== false && whatsapp && <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-xs font-bold text-white"><MessageCircle size={15} /> WhatsApp</a>}<button type="button" onClick={() => window.dispatchEvent(new CustomEvent('hbc:open-live-chat'))} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#315b32] px-4 text-xs font-bold text-white"><MessageCircle size={15} /> Live Chat</button></div></div></section>}

      <footer className="bg-[#172d20] px-4 py-4 text-center text-[#e8e8dc]"><p className="text-[10px] font-bold tracking-[.2em] text-[#e5c477]">HOMEMADE BEAUTY CARE</p><p className="hp-serif mt-1 text-base">প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া</p><p className="mt-1 text-[10px] text-white/55">নিজের যত্নের অভ্যাস হোক সহজ ও নিয়মিত।</p></footer>
      {landingSettings?.show_sticky_order_bar !== false && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e4dfd1] bg-[#fffdf7]/95 px-3 pb-[max(.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(25,45,30,.12)] backdrop-blur-xl sm:hidden"><div className="mx-auto flex max-w-xl items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate text-[10px] text-[#687461]">{productName}</p><p className="text-lg font-extrabold leading-6 text-[#315b32]">{formatPrice(product.price)}</p></div><a href="#order-hairpack" className="hp-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#315b32] px-5 text-sm font-bold text-white shadow-lg"><ShoppingBag size={16} /> অর্ডার করুন</a></div></div>}
    </main>
  );
}
