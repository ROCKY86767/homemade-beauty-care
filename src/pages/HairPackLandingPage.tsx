import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, Check, CheckCircle2, ChevronDown, Flower2, Heart, Leaf, MessageCircle, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, SiteSettings } from '@/lib/types';
import { useCart } from '@/lib/cart-context';
import { getSettings } from '@/lib/settings';
import { formatPrice, calculateDiscountPercent } from '@/lib/format';
import SEO from '@/components/SEO';

const fallbackBenefits = [
  'ঘরোয়া চুলের যত্নের রুটিনে সহজেই যোগ করা যায়',
  'চুলের যত্নে নিয়মিত সময় দেওয়ার অভ্যাস গড়ে তুলতে সহায়ক',
  'নিজের পছন্দমতো হেয়ার কেয়ার রুটিন সাজাতে সুবিধাজনক',
  'ব্যবহারের নিয়ম মেনে যত্ন নেওয়ার একটি সহজ ধাপ',
];

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
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('slug', 'ghorowa-hairpack')
        .maybeSingle();
      if (!active) return;
      if (error) {
        console.error('Hair Pack landing product refresh error:', error);
        return;
      }
      setProduct((data as Product | null) ?? null);
    };

    const loadPageData = async () => {
      try {
        const [
          { data },
          siteSettings,
          editorialResult,
          landingResult,
        ] = await Promise.all([
          supabase.from('products').select('*, category:categories(*)').eq('slug', 'ghorowa-hairpack').maybeSingle(),
          getSettings(),
          supabase.from('homepage_editorial_reviews').select('*').eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: false }),
          supabase.from('hairpack_landing_page_settings').select('*').eq('id', 1).maybeSingle(),
        ]);
        if (!active) return;
        if (data) setProduct(data as Product);
        setSettings(siteSettings);
        if (editorialResult.error) console.error('Landing page editorial reviews load error:', editorialResult.error);
        setEditorialReviews(editorialResult.data || []);
        setLandingSettings(landingResult.data || {});
      } catch (error) {
        console.error('Hair Pack landing page load error:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPageData();

    // Reflect admin product edits while the landing page is open.
    const productChannel = supabase
      .channel('hairpack-landing-product-live-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: 'slug=eq.ghorowa-hairpack',
      }, () => {
        void refreshProduct();
      })
      .subscribe();

    // Fallback refresh when a visitor returns to the tab/device.
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshProduct();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      active = false;
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      void supabase.removeChannel(productChannel);
    };
  }, []);

  const benefits = useMemo(() => {
    const source = product?.benefits_bn?.trim();
    if (!source) return fallbackBenefits;
    const parsed = source.split(/\n|•|।(?=\s)|,(?=\s)/).map((item) => item.trim()).filter(Boolean);
    return parsed.length ? parsed : fallbackBenefits;
  }, [product?.benefits_bn]);

  const buyNow = () => {
    if (!product || product.stock < 1) return;
    const result = addToCart(product, quantity);
    if (result.success) navigate('/checkout');
    else {
      setMessage(result.message || 'এই পরিমাণ পণ্য স্টকে নেই।');
      window.setTimeout(() => setMessage(''), 3000);
    }
  };

  const addItem = () => {
    if (!product || product.stock < 1) return;
    const result = addToCart(product, quantity);
    setMessage(result.success ? 'পণ্যটি কার্টে যোগ হয়েছে।' : (result.message || 'কার্টে যোগ করা যায়নি।'));
    window.setTimeout(() => setMessage(''), 3000);
  };

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center bg-[#f7f4eb]"><div className="h-9 w-9 animate-spin rounded-full border-2 border-[#d7dfd1] border-t-[#294b37]" /></div>;
  if (!product) return <section className="section-padding bg-[#f7f4eb] py-20 text-center"><h1 className="font-display text-3xl font-bold text-[#233d2c]">ঘরোয়া হেয়ার প্যাক</h1><p className="mt-3 text-[#657265]">এই মুহূর্তে পণ্যটির তথ্য লোড করা যাচ্ছে না।</p><Link to="/shop" className="mt-6 inline-flex rounded-full bg-[#294b37] px-6 py-3 font-semibold text-white">সব পণ্য দেখুন</Link></section>;

  const gallery = product.gallery?.filter(Boolean).length ? product.gallery.filter(Boolean) : [product.image_url];
  const outOfStock = product.stock < 1;
  if (landingSettings?.is_enabled === false) return <section className="min-h-[60vh] bg-[#f7f4eb] px-5 py-20 text-center"><h1 className="text-2xl font-bold text-[#294b37]">এই পেজটি আপাতত বন্ধ আছে</h1><p className="mt-3 text-sm text-[#73796c]">অনুগ্রহ করে পরে আবার দেখুন।</p><Link to="/shop" className="mt-6 inline-flex rounded-full bg-[#294b37] px-6 py-3 font-semibold text-white">সব পণ্য দেখুন</Link></section>;
  const productName = product.name_bn || 'ঘরোয়া হেয়ার প্যাক';
  const description = product.short_description_bn || 'নিজের চুলের যত্নের রুটিনে যোগ করুন ঘরোয়া রূপচর্চার একটি সুন্দর ধাপ।';
  const landingHeroTitle = productName;
  const landingDescription = landingSettings?.hero_description?.trim() || description;
  const discount = calculateDiscountPercent(product.price, product.old_price);

  return (
    <main className="hbc-ritual-page overflow-x-clip bg-[#f7f4eb] pb-24 text-[#243b2c] selection:bg-[#dce6d6] sm:pb-0">
      <SEO
        title={productName + ' | Homemade Beauty Care'}
        description={description}
        image={product.image_url}
        canonical={window.location.origin + '/hairpack'}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: productName,
          description: product.description_bn || description,
          image: gallery,
          brand: { '@type': 'Brand', name: settings?.brand_name || 'Homemade Beauty Care' },
          offers: { '@type': 'Offer', priceCurrency: 'BDT', price: Number(product.price), availability: outOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: window.location.origin + '/hairpack' },
        }}
      />

      <style>{`
        .hbc-ritual-page { font-family: inherit; }
        .hbc-ritual-page .ritual-serif { font-family: Georgia, 'Noto Serif Bengali', serif; }
        .hbc-ritual-page .ritual-noise { background-image: radial-gradient(rgba(255,255,255,.18) .7px, transparent .7px); background-size: 7px 7px; }
        .hbc-ritual-page .ritual-image { animation: ritualReveal .8s ease-out both; }
        @keyframes ritualReveal { from { opacity: .45; transform: scale(1.025); } to { opacity: 1; transform: scale(1); } }
        .hbc-ritual-page .ritual-cta { transition: transform .2s ease, box-shadow .2s ease, background .2s ease; }
        .hbc-ritual-page .ritual-cta:active { transform: scale(.98); }
        .hbc-ritual-page details[open] .ritual-chevron { transform: rotate(180deg); }
        @media (prefers-reduced-motion: reduce) { .hbc-ritual-page *, .hbc-ritual-page *::before, .hbc-ritual-page *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
      `}</style>

      <div className="border-b border-[#e7e0d2] bg-[#fffdf7] px-4 py-2.5 sm:py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 sm:justify-start sm:px-3">
          <img src="/new-homemade-logo.png" alt="Homemade Beauty Care logo" className="h-11 w-11 shrink-0 rounded-xl object-contain sm:h-14 sm:w-14" />
          <div className="min-w-0">
            <p className="text-xs font-extrabold tracking-[.12em] text-[#294b37] sm:text-sm sm:tracking-[.16em]">HOMEMADE BEAUTY CARE</p>
            <p className="mt-0.5 text-[10px] leading-4 text-[#73796c] sm:text-xs">প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া</p>
          </div>
        </div>
      </div>

      {landingSettings?.show_sticky_order_bar !== false && <div className="sticky top-0 z-30 border-b border-[#e7e0d2] bg-[#fffdf7]/95 px-3 py-2 shadow-[0_4px_16px_rgba(30,50,34,.07)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 sm:px-3">
          <div className="min-w-0"><p className="text-[10px] leading-4 text-[#777d70] sm:text-xs">{productName}</p><p className="text-lg font-extrabold leading-6 text-[#294b37] sm:text-xl">{formatPrice(product.price)}</p></div>
          <a href="#order-hairpack" className="ritual-cta inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-[#294b37] px-4 text-xs font-bold text-white shadow-md sm:px-5 sm:text-sm"><ShoppingBag size={15} /> {landingSettings?.primary_button_text || "এখনই অর্ডার করুন"}</a>
        </div>
      </div>}

      <section className="relative isolate overflow-hidden bg-[#203b2b] text-[#fbf6e9]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_90%_0%,rgba(187,137,92,.32),transparent_42%),linear-gradient(140deg,#203b2b_0%,#2c4b36_60%,#3c5a40_100%)]" />
        <div className="ritual-noise absolute inset-0 -z-10 opacity-20" />
        <div className="mx-auto grid max-w-7xl items-center gap-0 px-4 pb-7 pt-5 sm:px-6 sm:pb-12 sm:pt-9 lg:grid-cols-[.92fr_1.08fr] lg:gap-12 lg:px-8 lg:py-14">
          <div className="order-2 relative z-10 pt-5 lg:order-1 lg:py-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8d9bd]/30 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#e8d9bd] sm:text-xs"><Sparkles size={14} /> YOUR HAIR CARE RITUAL</div>
            <p className="mt-4 text-xs font-semibold tracking-[.24em] text-[#d9b78e]">{landingSettings?.hero_eyebrow || "GHOROYA ROOPCHARCHA"}</p>
            <h1 className="ritual-serif mt-3 max-w-xl text-[2.45rem] font-semibold leading-[1.17] tracking-tight text-[#fff9ed] sm:text-5xl lg:text-[3.7rem]">{landingHeroTitle}</h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-[#e4e8da]/90 sm:text-base sm:leading-8">{landingDescription}</p>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-3xl font-bold tracking-tight text-[#fff5df] sm:text-4xl">{formatPrice(product.price)}</span>
              {product.old_price && product.old_price > product.price && <><span className="text-sm text-white/55 line-through sm:text-base">{formatPrice(product.old_price)}</span><span className="rounded-full bg-[#d5ad7d] px-2.5 py-1 text-[11px] font-extrabold text-[#243b2c]">-{discount}%</span></>}
            </div>
            <div className="mt-5 grid grid-cols-[1fr_auto] gap-2.5 sm:flex sm:flex-wrap">
              <button type="button" onClick={buyNow} disabled={outOfStock} className="ritual-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f0d9b6] px-5 text-sm font-bold text-[#203b2b] shadow-[0_8px_24px_rgba(0,0,0,.15)] hover:bg-[#fff0d5] disabled:opacity-50 sm:px-6"><ShoppingBag size={17} />{outOfStock ? 'স্টকে নেই' : (landingSettings?.primary_button_text || 'অর্ডার করুন')}<ArrowRight size={17} /></button>
              <a href="#ritual-benefits" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10 sm:px-5">{landingSettings?.secondary_button_text || "আরও জানুন"} <ArrowDown size={15} /></a>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-white/75 sm:text-xs"><span className="inline-flex items-center gap-1.5"><Truck size={14} className="text-[#d9b78e]" /> সারা বাংলাদেশে ডেলিভারি</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-[#d9b78e]" /> সহজ অর্ডার প্রক্রিয়া</span></div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative mx-auto max-w-[570px]">
              <div className="absolute -inset-2 rotate-2 rounded-[2rem] border border-[#d8c5a7]/25 sm:-inset-3 sm:rounded-[2.5rem]" />
              <div className="relative overflow-hidden rounded-[1.65rem] bg-[#e9e1cf] shadow-[0_24px_65px_rgba(0,0,0,.22)] sm:rounded-[2.2rem]">
                <img src={landingSettings?.hero_image_url?.trim() || gallery[0]} alt={landingHeroTitle} fetchPriority="high" className="ritual-image aspect-[1/1.02] w-full object-cover sm:aspect-[1.15/1]" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#17291d]/85 via-[#17291d]/25 to-transparent px-4 pb-4 pt-16 sm:px-6 sm:pb-6">
                  <div className="flex items-end justify-between gap-3">
                    <div><p className="text-[10px] font-semibold tracking-[.2em] text-[#e6c69c]">A MOMENT FOR YOU</p><p className="ritual-serif mt-1 text-xl font-semibold text-white sm:text-2xl">যত্ন হোক নিজের মতো</p></div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-[#fff2d7] backdrop-blur"><Flower2 size={22} /></span>
                  </div>
                </div>
              </div>
              {gallery.length > 1 && <div className="mt-3 grid grid-cols-3 gap-2.5">{gallery.slice(1, 4).map((src, i) => <img key={src + i} src={src} alt={productName + ' ছবি ' + (i + 2)} loading="lazy" className="aspect-square w-full rounded-xl border border-white/20 object-cover shadow-sm sm:rounded-2xl" />)}</div>}
              {product.stock > 0 && <div className="absolute -right-1 -top-3 flex items-center gap-2 rounded-full bg-[#f6ead5] px-3 py-2 text-[11px] font-bold text-[#294b37] shadow-lg sm:-right-4 sm:top-5 sm:px-4 sm:text-xs"><CheckCircle2 size={15} /> যত্নের রুটিনে সহজ সংযোজন</div>}
            </div>
          </div>
        </div>
      </section>

      {landingSettings?.show_trust_strip !== false && <section className="relative z-10 mx-auto -mt-1 max-w-6xl px-4 sm:-mt-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-[#e5dfd0] bg-[#fffdf7] shadow-[0_12px_35px_rgba(40,58,39,.07)]">
          <div className="px-2 py-3 text-center sm:px-4 sm:py-4"><span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#e9eee3] text-[#31553c]"><Leaf size={16} /></span><p className="mt-2 text-[10px] font-bold leading-4 text-[#324a37] sm:text-xs">{landingSettings?.trust_one_title || "ঘরোয়া যত্ন"}</p><p className="mt-0.5 text-[9px] text-[#7b8172] sm:text-[11px]">{landingSettings?.trust_one_description || "নিজের রুটিনে"}</p></div>
          <div className="border-x border-[#e9e3d6] px-2 py-3 text-center sm:px-4 sm:py-4"><span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#f4e7d5] text-[#8a6846]"><Heart size={16} /></span><p className="mt-2 text-[10px] font-bold leading-4 text-[#324a37] sm:text-xs">{landingSettings?.trust_two_title || "নিজের জন্য সময়"}</p><p className="mt-0.5 text-[9px] text-[#7b8172] sm:text-[11px]">{landingSettings?.trust_two_description || "একটি যত্নের ধাপ"}</p></div>
          <div className="px-2 py-3 text-center sm:px-4 sm:py-4"><span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#e9eee3] text-[#31553c]"><ShoppingBag size={16} /></span><p className="mt-2 text-[10px] font-bold leading-4 text-[#324a37] sm:text-xs">{landingSettings?.trust_three_title || "সহজ অর্ডার"}</p><p className="mt-0.5 text-[9px] text-[#7b8172] sm:text-[11px]">{landingSettings?.trust_three_description || "অনলাইনেই"}</p></div>
        </div>
      </section>}

      {landingSettings?.show_benefits !== false && <section id="ritual-benefits" className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 sm:pb-9 sm:pt-10 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[10px] font-extrabold tracking-[.24em] text-[#a17950] sm:text-xs">A LITTLE CARE GOES A LONG WAY</p>
          <h2 className="ritual-serif mt-2 text-2xl font-semibold leading-tight text-[#263e2d] sm:text-3xl">{landingSettings?.benefits_heading || "চুলের যত্ন, আরও গোছানোভাবে"}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#6d7568] sm:text-base">{landingSettings?.benefits_description || "প্রতিদিনের ব্যস্ততার মাঝেও নিজের যত্নে রাখুন একটু সময়। আপনার হেয়ার কেয়ার রুটিন শুরু হোক সহজ এক ধাপে।"}</p>
        </div>
        <div className="mx-auto mt-5 max-w-3xl rounded-2xl border border-[#e3e6d9] bg-[#fffdf7] p-4 shadow-[0_8px_24px_rgba(44,63,43,.045)] sm:mt-6 sm:p-5">
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-x-6">
            {benefits.map((benefit) => <li key={benefit} className="flex items-start gap-2.5 text-sm leading-6 text-[#405543]"><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8eee2] text-[#35573e]"><Check size={13} /></span><span>{benefit}</span></li>)}
          </ul>
          <div className="mt-3 border-t border-[#ece8dc] pt-3 text-xs leading-6 text-[#73796c] sm:text-sm">নিজের চুলের যত্নে নিয়মিত সময় দিন এবং পণ্যের নির্দেশনা অনুযায়ী ব্যবহার করুন।</div>
        </div>
      </section>}

      {landingSettings?.show_product_info !== false && <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-9">
        <div className="text-center"><p className="text-[10px] font-extrabold tracking-[.22em] text-[#a17950] sm:text-xs">GOOD TO KNOW</p><h2 className="ritual-serif mt-2 text-3xl font-semibold text-[#263e2d] sm:text-4xl">পণ্যের আরও তথ্য</h2><p className="mt-2 text-sm text-[#73796c]">প্রয়োজনীয় তথ্যগুলো খুলে দেখে নিন</p></div>
        <div className="mt-4 divide-y divide-[#e8e2d6] overflow-hidden rounded-2xl border border-[#e8e2d6] bg-[#fffdf8]">
          {product.ingredients_bn && <details className="group px-4 py-3 sm:px-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#304a35]"><span className="flex items-center gap-3"><Flower2 size={18} className="text-[#9b754e]" /> উপাদান</span><ChevronDown size={18} className="ritual-chevron shrink-0 transition-transform" /></summary><p className="whitespace-pre-line pl-8 pt-3 text-sm leading-7 text-[#6d7568]">{product.ingredients_bn}</p></details>}
          {product.who_is_it_for_bn && <details className="group px-4 py-4 sm:px-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#304a35]"><span className="flex items-center gap-3"><Heart size={18} className="text-[#9b754e]" /> কার জন্য</span><ChevronDown size={18} className="ritual-chevron shrink-0 transition-transform" /></summary><p className="whitespace-pre-line pl-8 pt-3 text-sm leading-7 text-[#6d7568]">{product.who_is_it_for_bn}</p></details>}
          {product.storage_bn && <details className="group px-4 py-4 sm:px-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#304a35]"><span className="flex items-center gap-3"><Leaf size={18} className="text-[#9b754e]" /> সংরক্ষণের নিয়ম</span><ChevronDown size={18} className="ritual-chevron shrink-0 transition-transform" /></summary><p className="whitespace-pre-line pl-8 pt-3 text-sm leading-7 text-[#6d7568]">{product.storage_bn}</p></details>}
          {product.notes_bn && <details className="group px-4 py-4 sm:px-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#304a35]"><span className="flex items-center gap-3"><ShieldCheck size={18} className="text-[#9b754e]" /> বিশেষ তথ্য</span><ChevronDown size={18} className="ritual-chevron shrink-0 transition-transform" /></summary><p className="whitespace-pre-line pl-8 pt-3 text-sm leading-7 text-[#6d7568]">{product.notes_bn}</p></details>}
          <details className="group px-4 py-4 sm:px-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#304a35]"><span className="flex items-center gap-3"><Leaf size={18} className="text-[#9b754e]" /> পণ্যের বিবরণ</span><ChevronDown size={18} className="ritual-chevron shrink-0 transition-transform" /></summary><p className="whitespace-pre-line pl-8 pt-3 text-sm leading-7 text-[#6d7568]">{product.description_bn || description}</p></details>
        </div>
      </section>}

      {landingSettings?.show_contact_section !== false && <section className="mx-auto max-w-6xl px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="rounded-2xl border border-[#e4e4d8] bg-[#eef1e7] p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 sm:p-5">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#31553c]"><Heart size={19} /></span><div><h2 className="text-sm font-bold text-[#304a35] sm:text-base">{landingSettings?.contact_heading || "কোনো প্রশ্ন আছে?"}</h2><p className="mt-1 text-xs leading-5 text-[#6d7568] sm:text-sm">{landingSettings?.contact_description || "পণ্য সম্পর্কে জানতে WhatsApp-এ মেসেজ দিন অথবা সাইটের লাইভ চ্যাটে আমাদের সঙ্গে কথা বলুন।"}</p></div></div>
          <div className="mt-3 flex shrink-0 gap-2 sm:mt-0">
            {landingSettings?.show_whatsapp !== false && <a href={`https://wa.me/${(settings?.whatsapp_number || '01999478203').replace(/\\D/g, '').replace(/^0/, '88').replace(/^88(?!0)/, '880')}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-xs font-bold text-white sm:flex-none sm:text-sm"><MessageCircle size={15} /> WhatsApp</a>}
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('hbc:open-live-chat'))} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full bg-[#294b37] px-4 text-xs font-bold text-white sm:flex-none sm:text-sm"><MessageCircle size={15} /> Live Chat</button>
          </div>
        </div>
      </section>}

      {landingSettings?.show_editorial_reviews !== false && editorialReviews.length > 0 && (
        <section className="overflow-hidden bg-[#fffdf7] px-4 py-7 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5">
              <p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-[#9b754e] sm:text-xs">FEATURED STORIES</p>
              <h2 className="ritual-serif mt-2 text-2xl font-semibold text-[#263e2d] sm:text-3xl">{landingSettings?.reviews_heading || "রিভিউ ও অভিজ্ঞতা"}</h2>
              <p className="mt-2 text-sm text-[#73796c]">{landingSettings?.reviews_description || "আমাদের বেছে নেওয়া ছবি ও ভিডিও রিভিউ"}</p>
            </div>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
              {editorialReviews.map((item) => (
                <article key={item.id} className="w-[72vw] max-w-[270px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#e3e5d9] bg-white shadow-sm sm:w-[250px]">
                  {Array.isArray(item.media_urls) && item.media_urls.length > 0 && (
                    <div className="grid grid-cols-1 gap-1 bg-[#e9e8dd]">
                      {item.media_urls.map((url: string) => (
                        /\.(mp4|webm|mov)(\?|$)/i.test(url)
                          ? <video key={url} src={url} controls preload="metadata" playsInline className="max-h-[340px] w-full bg-black object-contain" />
                          : <img key={url} src={url} alt={item.title || item.customer_name || 'Review'} loading="lazy" className="max-h-[340px] w-full object-contain" />
                      ))}
                    </div>
                  )}
                  <div className="p-4">
                    <div className="mb-1 text-sm text-[#b58a52]">{'★'.repeat(Math.min(5, Math.max(1, Number(item.rating || 5))))}{'☆'.repeat(5 - Math.min(5, Math.max(1, Number(item.rating || 5))))}</div>
                    <h3 className="text-sm font-bold text-[#304a35]">{item.title || item.customer_name}</h3>
                    {item.location && <p className="mt-0.5 text-xs text-[#8a8e80]">{item.location}</p>}
                    {item.review_text && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#687365]">{item.review_text}</p>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {landingSettings?.show_how_to_use !== false && <section className="bg-[#eaeedf]">
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-6 sm:px-6 sm:py-9 lg:grid-cols-2 lg:gap-14 lg:px-8">
          <div>
            <p className="text-[10px] font-extrabold tracking-[.22em] text-[#9b754e] sm:text-xs">YOUR ROUTINE, YOUR WAY</p>
            <h2 className="ritual-serif mt-2 text-3xl font-semibold leading-tight text-[#263e2d] sm:text-4xl">{landingSettings?.how_to_use_heading || "ব্যবহার সহজ রাখুন"}</h2>
            <p className="mt-3 text-sm leading-7 text-[#687365]">{landingSettings?.how_to_use_description || "প্যাকেটের নির্দেশনা পড়ে ব্যবহার করুন। প্রথমবার হলে অল্প জায়গায় পরীক্ষা করে নেওয়া ভালো—বিশেষ করে আপনার স্ক্যাল্প সংবেদনশীল হলে।"}</p>
            <div className="mt-5 flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#294b37] text-sm font-bold text-white">১</span><div><h3 className="text-sm font-bold text-[#304a35]">প্রস্তুতি নিন</h3><p className="mt-1 text-sm leading-6 text-[#687365]">{product.how_to_use_bn?.trim() || 'পণ্যের প্যাকেট বা বিবরণে দেওয়া নির্দেশনা অনুযায়ী ব্যবহার উপযোগী করে নিন।'}</p></div></div>
            <div className="mt-4 flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#294b37] text-sm font-bold text-white">২</span><div><h3 className="text-sm font-bold text-[#304a35]">নির্দেশনা মেনে ব্যবহার করুন</h3><p className="mt-1 text-sm leading-6 text-[#687365]">চুলে সমানভাবে লাগিয়ে প্যাকেটে উল্লেখ করা সময় পর্যন্ত রাখুন, এরপর নির্দেশনা অনুযায়ী ধুয়ে ফেলুন।</p></div></div>
          </div>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-[#294b37] p-5 text-[#fff8e9] sm:p-8">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-white/10" /><div className="absolute -right-6 -top-6 h-28 w-28 rounded-full border border-white/10" />
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e9d3b0] text-[#294b37]"><Flower2 size={22} /></span>
            <h3 className="ritual-serif mt-5 text-2xl font-semibold sm:text-3xl">আপনার যত্ন, আপনার নিয়মে</h3>
            <p className="mt-3 text-sm leading-7 text-white/75">নিজের চুলের যত্নে একটু বাড়তি সময় দিন—আপনার রুটিনে যোগ করুন ঘরোয়া রূপচর্চার এই সুন্দর ধাপটি।</p>
            <a href="#order-hairpack" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#f0d9b6] px-5 py-3 text-sm font-bold text-[#203b2b]">পণ্যটি দেখুন <ArrowDown size={16} /></a>
          </div>
        </div>
      </section>}

      {landingSettings?.show_order_section !== false && <section id="order-hairpack" className="relative isolate overflow-hidden bg-[#203b2b] px-4 py-8 text-[#fff8e9] sm:px-6 sm:py-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_100%_100%,rgba(187,137,92,.22),transparent_42%)]" />
        <div className="mx-auto grid max-w-5xl items-center gap-6 lg:grid-cols-[1fr_.9fr]">
          <div><p className="text-[10px] font-extrabold tracking-[.24em] text-[#d9b78e] sm:text-xs">MAKE ROOM FOR SELF-CARE</p><h2 className="ritual-serif mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{landingSettings?.order_heading || "আজই যোগ করুন আপনার যত্নের রুটিনে"}</h2><p className="mt-3 max-w-lg text-sm leading-7 text-white/75">{landingSettings?.order_description || "পছন্দের পণ্যটি বেছে নিন এবং কয়েকটি সহজ ধাপেই অর্ডার সম্পন্ন করুন।"}</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.07] p-4 backdrop-blur sm:p-5">
            <div className="flex items-center gap-3"><img src={gallery[0]} alt="" loading="lazy" className="h-20 w-20 rounded-xl bg-white/10 object-cover sm:h-24 sm:w-24" /><div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-sm font-semibold sm:text-base">{productName}</h3><div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-xl font-bold text-[#f0d9b6]">{formatPrice(product.price)}</span>{product.old_price && product.old_price > product.price && <span className="text-xs text-white/55 line-through">{formatPrice(product.old_price)}</span>}</div><p className="mt-1 text-[11px] text-white/65">{outOfStock ? 'এই মুহূর্তে স্টকে নেই' : 'পরিমাণ নির্বাচন করে অর্ডার করুন'}</p></div></div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-black/10 px-3 py-2"><span className="text-sm text-white/80">পরিমাণ</span><div className="flex items-center gap-4"><button type="button" aria-label="পরিমাণ কমান" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 hover:bg-white/10"><Minus size={15} /></button><span className="min-w-4 text-center font-bold">{quantity}</span><button type="button" aria-label="পরিমাণ বাড়ান" onClick={() => setQuantity(q => Math.min(Math.max(1, product.stock), q + 1))} disabled={outOfStock} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 hover:bg-white/10 disabled:opacity-40"><Plus size={15} /></button></div></div>
            <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3 text-sm text-white/75"><span>মোট মূল্য</span><strong className="text-lg text-[#f0d9b6]">{formatPrice(product.price * quantity)}</strong></div>
            <button type="button" onClick={buyNow} disabled={outOfStock} className="ritual-cta mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f0d9b6] px-5 text-sm font-extrabold text-[#203b2b] hover:bg-[#fff0d5] disabled:opacity-50"><ShoppingBag size={17} />{outOfStock ? 'স্টকে নেই' : 'অর্ডার সম্পন্ন করুন'}<ArrowRight size={17} /></button>
            <button type="button" onClick={addItem} disabled={outOfStock} className="mt-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50">কার্টে যোগ করুন</button>
            {message && <p role="status" className="mt-3 text-center text-sm font-medium text-[#f0d9b6]">{message}</p>}
          </div>
        </div>
      </section>}

      <footer className="bg-[#182e21] px-4 py-4 text-center text-[#e5e7d9]">
        <p className="text-[10px] font-bold tracking-[.2em] text-[#d9b78e]">HOMEMADE BEAUTY CARE</p>
        <p className="ritual-serif mt-1 text-base">প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া</p>
        <p className="mt-1.5 text-[10px] text-white/55">নিজের যত্নের অভ্যাস হোক সহজ, সুন্দর ও নিয়মিত।</p>
      </footer>

      {landingSettings?.show_sticky_order_bar !== false && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ded8c9] bg-[#fffdf7]/95 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(25,45,30,.12)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-medium text-[#73796c]">{productName}</p><p className="text-lg font-extrabold leading-6 text-[#294b37]">{formatPrice(product.price)}</p></div><button type="button" onClick={buyNow} disabled={outOfStock} className="ritual-cta inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#294b37] px-5 text-sm font-bold text-white shadow-lg disabled:opacity-50"><ShoppingBag size={16} />{outOfStock ? 'স্টকে নেই' : 'অর্ডার করুন'}</button></div>
      </div>}
    </main>
  );
}
