import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, CheckCircle2, Leaf, Minus, Plus, ShieldCheck, ShoppingBag, Sparkles, Truck, Star, PackageCheck, Flower2, HeartHandshake, CircleHelp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Review, SiteSettings } from '@/lib/types';
import { useCart } from '@/lib/cart-context';
import { getSettings } from '@/lib/settings';
import { formatPrice, calculateDiscountPercent } from '@/lib/format';
import SEO from '@/components/SEO';

const fallbackBenefits = [
  'ঘরোয়া রূপচর্চার রুটিনে সহজে যোগ করা যায়',
  'ব্যবহারের নিয়ম মেনে চুলের যত্ন নিতে সহায়ক',
  'নিজের নিয়মিত হেয়ার কেয়ার রুটিনের সঙ্গে মানানসই',
];

export default function HairPackLandingPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('products').select('*, category:categories(*)').eq('slug', 'ghorowa-hairpack').maybeSingle(),
      getSettings(),
    ]).then(([{ data }, siteSettings]) => {
      if (!active) return;
      if (data) {
        setProduct(data as Product);
        const { data: reviewData } = await supabase.from('reviews').select('*').eq('product_id', data.id).eq('is_approved', true).order('sort_order').limit(8);
        setReviews((reviewData || []) as Review[]);
      }
      setSettings(siteSettings);
      setLoading(false);
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const benefits = useMemo(() => {
    const source = product?.benefits_bn?.trim();
    if (!source) return fallbackBenefits;
    return source.split(/\n|•|।(?=\s)|,(?=\s)/).map((item) => item.trim()).filter(Boolean).slice(0, 6);
  }, [product?.benefits_bn]);

  const howToUse = useMemo(() => product?.how_to_use_bn?.trim(), [product?.how_to_use_bn]);

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

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /></div>;

  if (!product) return <section className="section-padding py-20 text-center"><h1 className="font-display text-3xl font-bold text-dark">ঘরোয়া হেয়ার প্যাক</h1><p className="mt-3 text-gray-600">এই মুহূর্তে পণ্যটির তথ্য লোড করা যাচ্ছে না।</p><Link to="/shop" className="btn-primary mt-6 inline-flex">সব পণ্য দেখুন</Link></section>;

  const gallery = product.gallery?.filter(Boolean).length ? product.gallery.filter(Boolean) : [product.image_url];
  const outOfStock = product.stock < 1;
  const discount = calculateDiscountPercent(product.price, product.old_price);
  const productName = product.name_bn || 'ঘরোয়া হেয়ার প্যাক';

  return (
    <div className="overflow-hidden bg-[#fbf8f0] pb-20 text-[#243b2c] selection:bg-[#dce6d6]">
      <SEO
        title="ঘরোয়া হেয়ার প্যাক | Homemade Beauty Care"
        description={product.short_description_bn || 'Homemade Beauty Care-এর ঘরোয়া হেয়ার প্যাক সম্পর্কে জানুন, ব্যবহারের নিয়ম দেখুন এবং অনলাইনে অর্ডার করুন।'}
        image={product.image_url}
        canonical={window.location.origin + '/hairpack'}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: productName,
          description: product.description_bn || product.short_description_bn || undefined,
          image: gallery,
          brand: { '@type': 'Brand', name: settings?.brand_name || 'Homemade Beauty Care' },
          offers: { '@type': 'Offer', priceCurrency: 'BDT', price: Number(product.price), availability: outOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url: window.location.origin + '/hairpack' },
        }}
      />

      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(195,151,103,0.22),transparent_35%),linear-gradient(135deg,#f8f3e7_0%,#eef0e5_55%,#e3e9dc_100%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-6 sm:px-6 sm:py-9 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:py-12">
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#45664d]/20 bg-white/75 px-4 py-2 text-xs font-semibold tracking-wide text-[#45664d] sm:text-sm"><Leaf size={15} /> ঘরোয়া যত্ন, নিজের রুটিনে</div>
            <p className="mt-3 text-xs font-semibold tracking-[0.18em] text-[#8c6a45]">GHOROYA ROOPCHARCHA</p>
            <h1 className="mt-3 max-w-xl font-display text-4xl font-bold leading-[1.14] text-[#233d2c] sm:text-5xl lg:text-[3.7rem] tracking-tight">{productName}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#526354] sm:text-base">{product.short_description_bn || 'আপনার নিয়মিত চুলের যত্নের রুটিনে যোগ করুন ঘরোয়া রূপচর্চার সহজ একটি ধাপ।'}</p>
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-[#294c34] sm:text-4xl">{formatPrice(product.price)}</span>
              {product.old_price && product.old_price > product.price && <><span className="text-lg text-gray-500 line-through">{formatPrice(product.old_price)}</span><span className="rounded-full bg-[#9b6943] px-3 py-1 text-xs font-bold text-white">-{discount}%</span></>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 sm:flex-row">
              <button type="button" onClick={buyNow} disabled={outOfStock} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#2f5238] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#2f5238]/15 transition hover:-translate-y-0.5 hover:bg-[#243f2b] disabled:cursor-not-allowed disabled:opacity-50"><ShoppingBag size={19} /> {outOfStock ? 'স্টকে নেই' : 'এখনই অর্ডার করুন'} <ArrowRight size={18} /></button>
              <a href="#details" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-[#2f5238]/25 bg-white/70 px-5 py-3 text-sm font-semibold text-[#2f5238] transition hover:bg-white">বিস্তারিত জানুন <ArrowDown size={16} /></a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#526354]"><span className="inline-flex items-center gap-2"><Truck size={17} /> সারা বাংলাদেশে ডেলিভারি</span><span className="inline-flex items-center gap-2"><ShieldCheck size={17} /> নিরাপদ অর্ডার</span></div>
          </div>
          <div className="order-1 mx-auto w-full max-w-[520px] lg:order-2">
            <div className="relative rounded-3xl border border-white/80 bg-white/55 p-2 shadow-[0_18px_50px_rgba(39,65,43,0.12)] backdrop-blur-sm sm:p-3">
              <div className="absolute -left-2 top-8 z-10 hidden rounded-2xl bg-white px-4 py-3 shadow-lg sm:block"><p className="text-xs text-[#718070]">আপনার যত্নের রুটিনে</p><p className="mt-1 font-semibold text-[#294c34]">প্রকৃতির অনুপ্রেরণা</p></div>
              <img src={gallery[0]} alt={productName} fetchPriority="high" className="aspect-[4/3.8] w-full rounded-2xl object-cover" />
              {gallery.length > 1 && <div className="mt-3 grid grid-cols-3 gap-3">{gallery.slice(1, 4).map((src, i) => <img key={src + i} src={src} alt={productName + ' ' + (i + 2)} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />)}</div>}
              <div className="absolute -bottom-3 -right-1 flex items-center gap-2 rounded-full bg-[#2f5238] px-4 py-3 text-sm font-semibold text-white shadow-xl sm:-right-3"><Sparkles size={17} /> ঘরোয়া রূপচর্চা</div>
            </div>
          </div>
        </div>
      </section>

      <section id="details" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold tracking-[0.2em] text-[#98734d]">WHY MAKE IT PART OF YOUR ROUTINE?</p><h2 className="mt-3 font-display text-3xl font-bold text-[#243b2c] sm:text-4xl">চুলের যত্ন হোক নিয়মিত ও সহজ</h2><p className="mt-4 leading-7 text-[#657265]">পণ্যের বিবরণ ও ব্যবহারের নির্দেশনা দেখে আপনার রুটিনে মানানসই হলে বেছে নিন।</p></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{benefits.map((benefit, i) => <div key={benefit} className="rounded-xl border border-[#dce4d6] bg-white/80 p-4"><div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#e8eee3] text-[#365b3e]"><CheckCircle2 size={20} /></div><p className="text-sm leading-6 text-[#435347]">{benefit}</p></div>)}</div>
      </section>


      {(product.who_is_it_for_bn || product.storage_bn || product.notes_bn || product.ingredients_bn) && <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 sm:pb-10 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2">
          {product.who_is_it_for_bn && <article className="rounded-2xl border border-[#dfe6d9] bg-[#f0f2e9] p-4 sm:p-5"><HeartHandshake size={22}/><h3 className="mt-4 font-display text-xl font-bold">কার জন্য উপযোগী?</h3><p className="mt-3 whitespace-pre-line leading-8 text-[#5f6e60]">{product.who_is_it_for_bn}</p></article>}
          {product.ingredients_bn && <article className="rounded-2xl border border-[#e8dfd1] bg-[#f7f0e5] p-4 sm:p-5"><Flower2 size={22}/><h3 className="mt-4 font-display text-xl font-bold">উপাদান সম্পর্কে</h3><p className="mt-3 whitespace-pre-line leading-8 text-[#756858]">{product.ingredients_bn}</p></article>}
          {product.storage_bn && <article className="rounded-2xl border border-[#dfe6d9] bg-white p-4 sm:p-5"><PackageCheck size={22}/><h3 className="mt-4 font-display text-xl font-bold">সংরক্ষণের নিয়ম</h3><p className="mt-3 whitespace-pre-line leading-8 text-[#5f6e60]">{product.storage_bn}</p></article>}
          {product.notes_bn && <article className="rounded-2xl border border-[#e5e3d8] bg-white p-4 sm:p-5"><CircleHelp size={22}/><h3 className="mt-4 font-display text-xl font-bold">বিশেষভাবে মনে রাখুন</h3><p className="mt-3 whitespace-pre-line leading-8 text-[#5f6e60]">{product.notes_bn}</p></article>}
        </div>
      </section>}

      <section className="bg-[#e9eee3] py-8 sm:py-10">
        <div className="mx-auto grid max-w-7xl items-center gap-5 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div><p className="text-xs font-bold tracking-[0.2em] text-[#98734d]">HOW TO USE</p><h2 className="mt-3 font-display text-3xl font-bold text-[#243b2c] sm:text-4xl">ব্যবহারের নিয়ম</h2><p className="mt-4 leading-7 text-[#657265]">প্যাকেটের নির্দেশনা এবং পণ্যের বিবরণ অনুসরণ করুন। প্রথমবার ব্যবহারের আগে ত্বকে অল্প পরিমাণে পরীক্ষা করে নেওয়া ভালো।</p></div>
          <div className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm sm:p-5"><div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2f5238] font-bold text-white">১</span><div><h3 className="font-semibold text-[#294c34]">প্রস্তুত করুন</h3><p className="mt-1 leading-7 text-[#657265]">{howToUse || 'পণ্যের প্যাকেট ও বিবরণে দেওয়া নির্দেশনা অনুযায়ী ব্যবহার উপযোগী করে নিন।'}</p></div></div><div className="my-5 h-px bg-[#e2e8de]" /><div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2f5238] font-bold text-white">২</span><div><h3 className="font-semibold text-[#294c34]">নিয়ম মেনে ব্যবহার করুন</h3><p className="mt-1 leading-7 text-[#657265]">নির্দেশিত সময় ও পদ্ধতি অনুসরণ করুন। অস্বস্তি বা জ্বালাপোড়া হলে ব্যবহার বন্ধ করুন।</p></div></div></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e4e8de] sm:p-5"><h2 className="font-display text-2xl font-bold text-[#243b2c]">পণ্যের বিবরণ</h2><p className="mt-4 whitespace-pre-line leading-8 text-[#657265]">{product.description_bn || product.short_description_bn || 'ঘরোয়া রূপচর্চার জন্য তৈরি এই পণ্যের বিস্তারিত তথ্য প্যাকেটের নির্দেশনা অনুযায়ী দেখুন।'}</p></div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#e4e8de] sm:p-8"><h2 className="font-display text-2xl font-bold text-[#243b2c]">অর্ডার করতে প্রস্তুত?</h2><p className="mt-3 leading-7 text-[#657265]">আপনার পছন্দের পণ্যটি কার্টে যোগ করে সহজেই অর্ডার সম্পন্ন করুন।</p><div className="mt-6 flex items-center gap-4 rounded-2xl bg-[#f4f5ee] p-4"><img src={gallery[0]} alt="" className="h-20 w-20 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="font-semibold text-[#294c34]">{productName}</p><p className="mt-1 text-lg font-bold text-[#2f5238]">{formatPrice(product.price)}</p><p className="mt-1 text-xs text-[#758174]">{outOfStock ? 'স্টকে নেই' : 'স্টকে আছে'}</p></div></div><div className="mt-5 flex items-center justify-between"><span className="text-sm font-medium text-[#526354]">পরিমাণ</span><div className="flex items-center gap-4 rounded-full border border-[#dce4d6] bg-white px-2 py-1"><button type="button" aria-label="পরিমাণ কমান" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#edf1e8]"><Minus size={16} /></button><span className="min-w-4 text-center font-semibold">{quantity}</span><button type="button" aria-label="পরিমাণ বাড়ান" onClick={() => setQuantity(q => Math.min(Math.max(1, product.stock), q + 1))} disabled={outOfStock} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#edf1e8] disabled:opacity-40"><Plus size={16} /></button></div></div><p className="mt-4 flex justify-between border-t border-[#e5e9e0] pt-4 text-sm text-[#657265]"><span>মোট</span><strong className="text-lg text-[#294c34]">{formatPrice(product.price * quantity)}</strong></p><button type="button" onClick={buyNow} disabled={outOfStock} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#2f5238] px-6 py-4 font-bold text-white transition hover:bg-[#243f2b] disabled:opacity-50"><ShoppingBag size={18} /> এখনই অর্ডার করুন</button><button type="button" onClick={addItem} disabled={outOfStock} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[#2f5238]/25 px-6 py-3 font-semibold text-[#2f5238] hover:bg-[#f5f7f0] disabled:opacity-50">কার্টে যোগ করুন</button>{message && <p role="status" className="mt-3 text-center text-sm font-medium text-[#2f5238]">{message}</p>}<p className="mt-4 text-center text-xs leading-6 text-[#7a8577]">অর্ডার দেওয়ার আগে পণ্যের বিবরণ ও ব্যবহারের নিয়ম পড়ে নিন।</p></div>
        </div>
      </section>


      <section id="reviews" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[11px] font-bold tracking-[0.2em] text-[#98734d]">CUSTOMER FEEDBACK</p><h2 className="mt-1 font-display text-2xl font-bold text-[#243b2c] sm:text-3xl">ক্রেতাদের রিভিউ</h2><p className="mt-1 text-sm text-[#657265]">বাস্তব ক্রেতাদের অনুমোদিত মতামত</p></div>
          <Link to={`/product/${product.slug}`} className="inline-flex items-center gap-2 rounded-full border border-[#2f5238]/25 bg-white px-4 py-2.5 text-sm font-semibold text-[#2f5238] transition hover:bg-[#edf1e8]">সব রিভিউ দেখুন <ArrowRight size={16}/></Link>
        </div>
        {reviews.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{reviews.slice(0,6).map(review => <article key={review.id} className="rounded-xl border border-[#dfe5d9] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[#294c34]">{review.customer_name}</p>{review.location && <p className="mt-0.5 text-xs text-[#7a8577]">{review.location}</p>}</div><span className="shrink-0 text-sm font-semibold text-[#98734d]">{'★'.repeat(Math.max(0, Math.min(5, review.rating)))}<span className="text-[#d9ddd4]">{'★'.repeat(5-Math.max(0, Math.min(5, review.rating)))}</span></span></div><p className="mt-2 text-sm leading-6 text-[#657265]">{review.review_bn || 'ক্রেতা এই পণ্যের জন্য রেটিং দিয়েছেন।'}</p>{review.is_verified && <p className="mt-2 text-xs font-medium text-[#426447]">✓ যাচাইকৃত ক্রেতা</p>}</article>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-[#d4ddce] bg-white/70 p-5 text-sm text-[#657265]">এখনও কোনো অনুমোদিত রিভিউ নেই। পণ্য সম্পর্কে আরও তথ্য জানতে বা অর্ডার করতে নিচের বাটন ব্যবহার করুন।</div>}
      </section>

      <section className="bg-[#243f2c] px-4 py-8 text-center text-white sm:py-10"><p className="text-sm font-semibold tracking-[0.18em] text-[#d7c4a6]">HOMEMADE BEAUTY CARE</p><h2 className="mx-auto mt-2 max-w-2xl font-display text-2xl font-bold sm:text-3xl">প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-white/75">আপনার ঘরোয়া রূপচর্চার যাত্রায় সঠিক যত্নের অভ্যাস গড়ে তুলুন।</p><button type="button" onClick={buyNow} disabled={outOfStock} className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#f4e8d3] px-6 py-3 text-sm font-bold text-[#294c34] transition hover:bg-white disabled:opacity-50">অর্ডার করুন <ArrowRight size={18} /></button><p className="mt-4 text-sm text-white/70">প্রশ্ন আছে? ওয়েবসাইটের Live Chat বা WhatsApp-এ যোগাযোগ করুন।</p></section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dce4d6] bg-[#fbf8f0]/95 p-3 shadow-[0_-8px_30px_rgba(30,54,35,0.10)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#526354]">{productName}</p><p className="mt-0.5 text-lg font-bold text-[#294c34]">{formatPrice(product.price)}</p></div>
          <button type="button" onClick={buyNow} disabled={outOfStock} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#2f5238] px-5 text-sm font-bold text-white shadow-lg disabled:opacity-50"><ShoppingBag size={17}/>{outOfStock ? 'স্টকে নেই' : 'অর্ডার করুন'}</button>
        </div>
      </div>
    </div>
  );
}
