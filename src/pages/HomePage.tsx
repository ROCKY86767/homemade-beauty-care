import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  CreditCard,
  Leaf,
  Headphones,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Banner, Product, Category, Review, SiteSettings } from '@/lib/types';
import { getSettings } from '@/lib/settings';
import ProductCard from '@/components/ProductCard';
import StarRating from '@/components/StarRating';
import SEO from '@/components/SEO';

const TRUST_FEATURES = [
  {
    icon: Truck,
    title: 'Nationwide Delivery',
    desc: 'Delivery across Bangladesh',
  },
  {
    icon: CreditCard,
    title: 'Cash on Delivery',
    desc: 'Pay after receiving your order',
  },
  {
    icon: Leaf,
    title: 'Carefully Made Products',
    desc: 'Made with natural ingredients',
  },
  {
    icon: Headphones,
    title: 'Customer Support',
    desc: 'Here when you need us',
  },
];

const WHY_CHOOSE_US = [
  {
    title: 'For Everyday Care',
    desc: 'আপনার beauty routine সহজ করার লক্ষ্য নিয়ে আমাদের পণ্য নির্বাচন করা হয়।',
  },
  {
    title: 'Quality You Can Trust',
    desc: 'পণ্যের মান ও ব্যবহারকারীর অভিজ্ঞতাকে গুরুত্ব দেওয়া হয়।',
  },
  {
    title: 'Easy Ordering',
    desc: 'সহজে অর্ডার করুন এবং বাসায় বসেই পণ্য গ্রহণ করুন।',
  },
  {
    title: 'Nationwide Delivery',
    desc: 'বাংলাদেশের বিভিন্ন প্রান্তে পণ্য পৌঁছে দেওয়ার ব্যবস্থা।',
  },
  {
    title: 'Customer Support',
    desc: 'পণ্য নির্বাচন ও অর্ডার সংক্রান্ত সহযোগিতার জন্য আমাদের সাথে যোগাযোগ করুন।',
  },
];

const HOW_TO_ORDER = [
  { num: '01', title: 'Choose Your Products' },
  { num: '02', title: 'Add to Cart' },
  { num: '03', title: 'Enter Your Details' },
  { num: '04', title: 'Confirm Your Order' },
];

export default function HomePage() { // centralized storefront settings
  const [banners, setBanners] = useState<Banner[]>([]);

  // সব Active Product
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [hairCare, setHairCare] = useState<Product[]>([]);
  const [skinCare, setSkinCare] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [onSale, setOnSale] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editorialReviews, setEditorialReviews] = useState<any[]>([]);
  const [fullscreenReviewMedia, setFullscreenReviewMedia] = useState<{ url: string; isVideo: boolean } | null>(null);
  const reviewMarqueeRef = useRef<HTMLDivElement>(null);
  const reviewDragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number; moved: boolean } | null>(null);
  const [reviewManualMode, setReviewManualMode] = useState(false);

  const handleReviewPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const container = reviewMarqueeRef.current;
    if (!container) return;
    reviewDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startScrollLeft: container.scrollLeft, moved: false };
    setReviewManualMode(true);
    if (event.pointerType === 'mouse') {
      container.setPointerCapture(event.pointerId);
      container.style.cursor = 'grabbing';
    }
  };

  const handleReviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = reviewDragRef.current;
    const container = reviewMarqueeRef.current;
    if (!drag || !container || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4) drag.moved = true;
    if (drag.moved) {
      container.scrollLeft = drag.startScrollLeft - distance;
      if (event.pointerType === 'mouse') event.preventDefault();
    }
  };

  const handleReviewPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = reviewMarqueeRef.current;
    if (container && event.pointerType === 'mouse') {
      if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
      container.style.cursor = 'grab';
    }
    // Keep the drag flag until click-capture suppresses the accidental
    // click that browsers may fire immediately after a swipe.
    if (!reviewDragRef.current?.moved) reviewDragRef.current = null;
  };

  // Use a lightweight history entry for the review viewer so the phone's
  // Back button closes the image and keeps the page at the reviews section.
  const openReviewMedia = (url: string, isVideo: boolean) => {
    window.history.pushState({ reviewMediaViewer: true }, '');
    setFullscreenReviewMedia({ url, isVideo });
  };

  const closeReviewMedia = () => {
    if (window.history.state?.reviewMediaViewer) {
      window.history.back();
    } else {
      setFullscreenReviewMedia(null);
    }
  };

  useEffect(() => {
    const handleReviewViewerBack = () => setFullscreenReviewMedia(null);
    window.addEventListener('popstate', handleReviewViewerBack);
    return () => window.removeEventListener('popstate', handleReviewViewerBack);
  }, []);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  // Scroll reveal: wait for homepage data so the target sections are mounted.
  // IntersectionObserver works even without CSS scroll-driven animation support.
  useEffect(() => {
    if (loading) return;
    const targets = document.querySelectorAll(
      'main section:not(.hero-premium) .section-padding > *, main section:not(.hero-premium) .grid > *'
    );
    if (!('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('hbc-scroll-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('hbc-scroll-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    targets.forEach((target) => {
      target.classList.add('hbc-scroll-reveal');
      observer.observe(target);
    });
    return () => observer.disconnect();
  }, [loading]);

  useEffect(() => {
    getSettings().then(setSettings);

    const loadHomePageData = async () => {
      try {
        /*
         * প্রথমে categories এবং সব active products আনা হচ্ছে।
         * এরপর category ID ব্যবহার করে Hair Care / Skin Care
         * আলাদা section-এর products বের করা হচ্ছে।
         */

        const [
          bannersResult,
          allProductsResult,
          categoriesResult,
          reviewsResult,
        ] = await Promise.all([
          supabase
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .order('sort_order'),

          // ⭐ Homepage-এর একটিমাত্র মূল product query
          // Best Seller / New Arrival / Sale section এখান থেকেই তৈরি হবে।
          supabase
            .from('products')
            .select('id,name_en,name_bn,slug,short_description_bn,description_bn,benefits_bn,how_to_use_bn,ingredients_bn,who_is_it_for_bn,storage_bn,notes_bn,category_id,subcategory,price,old_price,stock,sku,rating,review_count,is_best_seller,is_new,is_on_sale,is_featured,image_url,gallery,size_bn,created_at,updated_at,is_active')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),

          supabase
            .from('categories')
            .select('*')
            .eq('is_active', true)
            .order('sort_order'),

          supabase
            .from('reviews')
            .select('*')
            .eq('is_approved', true)
            .order('sort_order')
            .limit(6),
        ]);

        /*
         * Error থাকলে console-এ দেখাবে।
         * এতে ভবিষ্যতে Supabase query সমস্যা হলে
         * browser console থেকে সহজে বোঝা যাবে।
         */

        if (bannersResult.error) {
          console.error('Banners load error:', bannersResult.error);
        }

        if (allProductsResult.error) {
          console.error(
            'All products load error:',
            allProductsResult.error
          );
        }

        if (categoriesResult.error) {
          console.error(
            'Categories load error:',
            categoriesResult.error
          );
        }

        if (reviewsResult.error) {
          console.error('Reviews load error:', reviewsResult.error);
        }

        const loadedCategories = categoriesResult.data || [];

        /*
         * Hair Care category IDs
         *
         * Slug অনুযায়ী category খোঁজা হচ্ছে।
         */
        const hairCategoryIds = loadedCategories
          .filter(category =>
            [
              'hair-care',
              'hair-oil',
              'hair-pack',
            ].includes(category.slug)
          )
          .map(category => category.id);

        /*
         * Skin Care category IDs
         */
        const skinCategoryIds = loadedCategories
          .filter(category =>
            [
              'skin-care',
              'face-care',
              'face-pack',
            ].includes(category.slug)
          )
          .map(category => category.id);

        /*
         * সব Active Product থেকে Hair Care এবং Skin Care
         * আলাদা করা হচ্ছে।
         *
         * এতে category query fail করলেও Homepage-এর
         * মূল product section বন্ধ হবে না।
         */

        const loadedProducts = allProductsResult.data || [];

        const loadedHairCare = loadedProducts.filter(product =>
          hairCategoryIds.includes(product.category_id)
        );

        const loadedSkinCare = loadedProducts.filter(product =>
          skinCategoryIds.includes(product.category_id)
        );

        const now = new Date();
        const scheduledBanners = (bannersResult.data || []).filter((banner: Banner) => {
          const start = banner.start_at ? new Date(banner.start_at) : null;
          const end = banner.end_at ? new Date(banner.end_at) : null;
          return (!start || start <= now) && (!end || end >= now);
        });

        setBanners(scheduledBanners);

        // ⭐ সব active products
        setAllProducts(loadedProducts);

        // একই product dataset থেকে homepage-এর আলাদা section তৈরি করি।
        setBestSellers(loadedProducts.filter(product => product.is_best_seller).slice(0, 4));
        setHairCare(loadedHairCare);
        setSkinCare(loadedSkinCare);
        setNewArrivals(loadedProducts.filter(product => product.is_new).slice(0, 4));
        setOnSale(loadedProducts.filter(product => product.is_on_sale).slice(0, 4));
        setCategories(loadedCategories);
        setReviews(reviewsResult.data || []);
        const editorialResult = await supabase.from('homepage_editorial_reviews').select('*').eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: false });
        if (editorialResult.error) console.error('Homepage editorial reviews load error:', editorialResult.error);
        const editorialRows = editorialResult.data || [];
        const seenEditorialReviews = new Set<string>();
        const uniqueEditorialReviews = editorialRows.filter((item: any) => {
          const signature = [
            item.customer_name || '',
            item.location || '',
            item.title || '',
            item.review_text || '',
            Number(item.rating || 5),
            ...(Array.isArray(item.media_urls) ? item.media_urls : []),
          ].map(value => String(value).trim().toLowerCase()).join('|');
          if (seenEditorialReviews.has(signature)) return false;
          seenEditorialReviews.add(signature);
          return true;
        });
        setEditorialReviews(uniqueEditorialReviews);
      } catch (error) {
        console.error('Homepage data loading error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHomePageData();
  }, []);

  useEffect(() => {
    if (banners.length <= 1 || settings?.homepage_banner_autoplay === false) return;

    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, Math.max(1000, Number(settings?.homepage_banner_interval || 5000)));

    return () => clearInterval(timer);
  }, [banners.length, settings?.homepage_banner_autoplay, settings?.homepage_banner_interval]);

  const nextBanner = () => {
    setCurrentBanner(prev => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentBanner(
      prev => (prev - 1 + banners.length) % banners.length
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <SEO title={settings?.seo_site_title || settings?.brand_name || 'Homemade Beauty Care'} />
      {/* Hero Slider */}
      {banners.length > 0 ? (
        <section className="relative hero-premium mx-3 my-3 h-[520px] overflow-hidden rounded-[1.5rem] shadow-[0_24px_70px_rgba(38,58,45,.16)] sm:mx-6 sm:my-6 sm:h-[560px] sm:rounded-[2rem] lg:mx-auto lg:my-8 lg:h-[590px] lg:w-[calc(100%-3rem)] lg:max-w-[1440px]">
          {banners.map((banner, idx) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                idx === currentBanner
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="absolute inset-0 bg-[#e9e7dc]">
                {idx === currentBanner && (
                  <picture>
                    <source media="(max-width: 639px)" srcSet={banner.mobile_image_url || banner.desktop_image_url || banner.image_url || ''} />
                    <img
                      src={banner.desktop_image_url || banner.image_url || banner.mobile_image_url || ''}
                      alt={banner.title_bn}
                      fetchPriority="high"
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover animate-slow-zoom"
                    />
                  </picture>
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-[#17291f]/80 via-[#17291f]/42 to-[#17291f]/5" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#17291f]/35 via-transparent to-white/5" />
              </div>

              <div className="relative z-10 flex h-full items-center px-5 py-8 sm:px-10 lg:px-16">
                <div className="max-w-xl text-white">
                  {banner.small_text_bn && (
                    <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[.18em] text-white backdrop-blur-md animate-fade-in-up">
                      {banner.small_text_bn}
                    </p>
                  )}

                  <h1 className="mb-5 max-w-[620px] font-display text-3xl font-bold leading-[1.15] tracking-tight drop-shadow-sm sm:text-5xl lg:text-6xl xl:text-7xl animate-fade-in-up">
                    {banner.title_bn}
                  </h1>

                  {banner.description_bn && (
                    <p className="mb-7 max-w-lg text-sm leading-7 text-white/90 sm:text-lg sm:leading-8 animate-fade-in-up">
                      {banner.description_bn}
                    </p>
                  )}

                  <div className="relative z-20 flex flex-wrap gap-3 animate-fade-in-up">
                    {banner.button_text_bn && (
                      <Link
                        to={banner.button_link || '/shop'}
                        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F7F4EA] px-7 py-3.5 font-semibold text-[#263A2D] shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-xl active:scale-95 click-feedback-soft"
                      >
                        {banner.button_text_bn}
                      </Link>
                    )}

                    {idx === 0 && (
                      <Link
                        to="/shop"
                        className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/60 bg-white/10 px-7 py-3.5 font-semibold text-white backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 active:scale-95 click-feedback-soft"
                      >
                        View Collection
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {banners.length > 1 && (
            <>
              <button
                onClick={prevBanner}
                className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-black/35 click-feedback-soft sm:left-5 sm:h-12 sm:w-12"
                aria-label="Previous banner"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                onClick={nextBanner}
                className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/20 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-black/35 click-feedback-soft sm:right-5 sm:h-12 sm:w-12"
                aria-label="Next banner"
              >
                <ChevronRight size={24} />
              </button>

              <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-2 backdrop-blur-md sm:bottom-7">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBanner(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentBanner
                        ? 'w-8 bg-white'
                        : 'w-2 bg-white/50'
                    }`}
                    aria-label={`Go to banner ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="relative overflow-hidden brand-gradient text-white">
          <div className="absolute inset-0 opacity-10" aria-hidden="true">
            <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[36px] border-white" />
            <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full border-[42px] border-white" />
          </div>
          <div className="section-padding relative z-10 grid min-h-[390px] items-center gap-8 py-12 sm:min-h-[460px] sm:grid-cols-[1.2fr_.8fr] sm:py-16 lg:min-h-[520px]">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/75">Homemade Beauty Care</p>
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
                আপনার চুল ও ত্বকের দৈনন্দিন যত্নে বেছে নিন যত্ন করে তৈরি পণ্য। সহজ অর্ডার, নির্ভরযোগ্য সহায়তা এবং ঘরে বসেই ডেলিভারি।
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/shop" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3 font-semibold text-dark transition hover:bg-cream">
                  সব পণ্য দেখুন <ArrowRight size={18} className="ml-2" />
                </Link>
                <Link to="/category/hair-care" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/60 px-7 py-3 font-semibold text-white transition hover:bg-white/10">
                  Hair Care
                </Link>
              </div>
            </div>
            <div className="mx-auto flex w-full max-w-[260px] items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-sm sm:max-w-[300px]">
              <img src="/new-homemade-logo.png" alt="Homemade Beauty Care logo" width="300" height="300" loading="eager" decoding="async" className="aspect-square w-full rounded-2xl object-contain" />
            </div>
          </div>
        </section>
      )}

      {/* Trust Strip */}
      <section className="relative z-10 -mt-1 border-y border-[#DDE3D7] bg-[#F7F4EA] py-5 sm:py-7">
        <div className="section-padding">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TRUST_FEATURES.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-2xl border border-[#DDE3D7] bg-white/75 p-3 shadow-[0_4px_18px_rgba(38,58,45,.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#8FA36F] hover:bg-white hover:shadow-[0_12px_30px_rgba(38,58,45,.09)] animate-reveal-scale"
                style={{ animationDelay: `${idx * 90}ms` }}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <feature.icon size={24} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {feature.title}
                  </h3>

                  <p className="text-xs text-gray-500">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      {settings?.homepage_show_categories !== false && <section className="bg-white py-12 sm:py-20">
        <div className="section-padding">
          <div className="mx-auto mb-9 max-w-2xl text-center sm:mb-12">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-[#8A9A70]">Discover your routine</p>
            <h2 className="font-display section-heading-premium text-3xl font-bold tracking-tight text-dark sm:text-4xl lg:text-5xl">
              Shop by Category
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-500 sm:text-base">
              Choose the right category for your hair & skin care
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group relative aspect-[4/5] overflow-hidden rounded-[1.35rem] border border-[#DDE3D7] bg-[#E8EEDF] shadow-[0_8px_28px_rgba(38,58,45,.07)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_45px_rgba(38,58,45,.15)] click-feedback-soft"
              >
                <img
                  src={cat.image_url || ''}
                  alt={cat.name_bn}
                  width="480"
                  height="360"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#17291f]/90 via-[#17291f]/12 to-transparent transition-opacity duration-300 group-hover:from-[#17291f]/95" />

                <div className="absolute inset-x-0 bottom-0 p-4 text-left sm:p-5">
                  <h3 className="font-display text-base font-semibold leading-snug text-white drop-shadow-sm sm:text-xl">
                    {cat.name_bn}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>}

      {/* Separately managed Homepage Reviews; not customer-submitted reviews */}
      {editorialReviews.length > 0 && (
        <section className="overflow-hidden bg-[#F7F4EA] py-8 sm:py-12">
          <div className="section-padding">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#8A9A70]">Featured stories</p>
                <h2 className="font-display text-2xl font-bold text-[#263A2D] sm:text-3xl">রিভিউ ও অভিজ্ঞতা</h2>
                <p className="mt-2 text-sm text-gray-500">আমাদের বেছে নেওয়া অভিজ্ঞতার ঝলক</p>
              </div>
              <span className="hidden text-xs font-medium text-[#8A9A70] sm:block">Swipe to explore →</span>
            </div>
            <div
              ref={reviewMarqueeRef}
              className={`homepage-review-marquee relative -mx-4 px-4 sm:-mx-6 sm:px-6 ${reviewManualMode ? 'homepage-review-manual' : ''}`}
              onPointerDown={handleReviewPointerDown}
              onPointerMove={handleReviewPointerMove}
              onPointerUp={handleReviewPointerEnd}
              onPointerCancel={handleReviewPointerEnd}
              onClickCapture={(event) => {
                if (reviewDragRef.current?.moved) {
                  event.preventDefault();
                  event.stopPropagation();
                  reviewDragRef.current = null;
                }
              }}
              aria-label="রিভিউ দেখতে ডানে বা বামে টানুন"
            >
              <div className="homepage-review-track flex w-max py-3">
                {[0, 1].map((copy) => (
                  <div key={copy} className="homepage-review-group flex shrink-0 gap-4 pr-4 sm:gap-5 sm:pr-5" aria-hidden={copy === 1 ? true : undefined} inert={copy === 1}>
                    {editorialReviews.map((item) => (
                  <article key={`${copy}-${item.id}`} className="w-[58vw] max-w-[220px] shrink-0 overflow-hidden rounded-2xl border border-[#E3E5D9] bg-white shadow-md shadow-[#263A2D]/5 sm:w-[220px]">
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#E9E8DD]">
                      {item.media_urls?.[0] && (/\.(mp4|webm|mov)(\?|$)/i.test(item.media_urls[0])
                        ? <><video src={item.media_urls[0]} controls preload="metadata" playsInline className="h-full w-full object-contain" /><button type="button" onClick={() => openReviewMedia(item.media_urls[0], true)} className="absolute right-3 top-3 rounded-full bg-black/65 px-3 py-2 text-xs font-semibold text-white shadow" aria-label="ভিডিও পূর্ণ পর্দায় দেখুন">⛶ Full screen</button></>
                        : <button type="button" onClick={() => openReviewMedia(item.media_urls[0], false)} className="absolute inset-0 flex h-full w-full items-center justify-center bg-[#E9E8DD]" aria-label="ছবি পূর্ণ পর্দায় দেখুন"><img src={item.media_urls[0]} alt={item.title || 'Homepage review'} loading="lazy" className="h-full w-full object-contain" /></button>)}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                        <div className="mb-1 text-sm text-[#F3C98B]">{'★'.repeat(Number(item.rating || 5))}{'☆'.repeat(5-Number(item.rating || 5))}</div>
                        <p className="font-semibold">{item.customer_name}</p>
                        {item.location && <p className="mt-0.5 text-xs text-white/80">{item.location}</p>}
                      </div>
                    </div>
                    <div className="p-3">
                      {item.title && <h3 className="mb-1 text-sm font-semibold text-[#263A2D]">{item.title}</h3>}
                      {item.review_text && <p className="text-sm leading-6 text-gray-600" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.review_text}</p>}
                    </div>
                  </article>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}


      {/* ⭐ ALL ACTIVE PRODUCTS */}
      {settings?.homepage_show_all_products !== false && allProducts.length > 0 && (
        <section className="py-10 sm:py-16 bg-cream">
          <div className="section-padding">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark">
                  Our Products
                </h2>

                <p className="mt-2 text-gray-500">
                  Explore our products for your everyday beauty & care.
                </p>
              </div>

              <Link
                to="/shop"
                className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all click-feedback-soft"
              >
                View All Products
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {allProducts.slice(0, 8).map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  compactActions
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Best Sellers */}
      {settings?.homepage_show_best_sellers !== false && bestSellers.length > 0 && (
        <section className="py-10 sm:py-16">
          <div className="section-padding">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark">
                Best Sellers
              </h2>

              <p className="mt-2 text-gray-500">
                Our most popular products, all in one place
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {bestSellers.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  compactActions
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hair Care Section */}
      {settings?.homepage_show_hair_care !== false && hairCare.length > 0 && (
        <section className="py-10 sm:py-16">
          <div className="section-padding">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark">
                  Hair Care Collection
                </h2>

                <p className="mt-2 text-gray-500 max-w-lg">
                  চুলের দৈনন্দিন যত্নকে সহজ ও সুন্দর করতে বেছে নিন আমাদের Hair
                  Care Collection।
                </p>
              </div>

              <Link
                to="/category/hair-care"
                className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all click-feedback-soft"
              >
                View Hair Care
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {hairCare.slice(0, 4).map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  compactActions
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Skin Care Section */}
      {settings?.homepage_show_skin_care !== false && skinCare.length > 0 && (
        <section className="py-10 sm:py-16 bg-light-green/40">
          <div className="section-padding">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark">
                  ত্বকের যত্নে প্রতিদিনের ভালোবাসা
                </h2>

                <p className="mt-2 text-gray-500 max-w-lg">
                  আপনার skincare routine-এর জন্য প্রয়োজনীয় পণ্যগুলো খুঁজে নিন।
                </p>
              </div>

              <Link
                to="/category/skin-care"
                className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all click-feedback-soft"
              >
                View Skin Care
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {skinCare.slice(0, 4).map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  compactActions
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Special Combo Banner */}
      {settings?.combo_offer_enabled !== false && (
      <section className="py-10 sm:py-16">
        <div className="section-padding">
          <div className="relative overflow-hidden rounded-3xl bg-dark">
            <div className="grid md:grid-cols-2 items-center">
              <div className="p-8 lg:p-12 text-white">
                <span className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-semibold uppercase tracking-wider mb-4">
                  {settings?.combo_offer_badge || 'Combo Offer'}
                </span>

                <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">
                  {settings?.combo_offer_title || 'একসাথে যত্ন, একসাথে সাশ্রয়'}
                </h2>

                <p className="text-white/70 mb-6 max-w-md">
                  {settings?.combo_offer_description || 'চুল ও ত্বকের যত্নের জন্য বেছে নিন আমাদের বিশেষ Combo Collection।'}
                </p>

                <div className="flex flex-wrap gap-4 mb-6">
                  <div>
                    <p className="text-sm text-white/50">
                      Original Price
                    </p>
                    <p className="text-lg text-white/60 line-through">
                      ৳{Number(settings?.combo_offer_original_price || 1600).toLocaleString('en-US')}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-white/50">
                      Combo Price
                    </p>
                    <p className="text-2xl font-bold text-primary-light">
                      ৳{Number(settings?.combo_offer_price || 1200).toLocaleString('en-US')}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-white/50">
                      You Save
                    </p>
                    <p className="text-2xl font-bold text-accent-light">
                      ৳{Math.max(0, Number(settings?.combo_offer_original_price || 1600) - Number(settings?.combo_offer_price || 1200)).toLocaleString('en-US')}
                    </p>
                  </div>
                </div>

                <Link
                  to={settings?.combo_offer_button_link || '/shop'}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 font-medium text-white transition-all hover:bg-accent-light active:scale-95 click-feedback-soft"
                >
                  {settings?.combo_offer_button_text || 'Combo Collection দেখুন'}
                </Link>
              </div>

              <div className="relative h-64 md:h-full min-h-[300px]">
                <img
                  src={settings?.combo_offer_image_url || "https://images.pexels.com/photos/17307534/pexels-photo-17307534.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"}
                  alt="Combo Collection"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* New Arrivals */}
      {settings?.homepage_show_new_arrivals !== false && newArrivals.length > 0 && (
        <section className="py-10 sm:py-16 bg-cream">
          <div className="section-padding">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark">
                নতুন এসেছে
              </h2>

              <p className="mt-2 text-gray-500">
                আপনার জন্য আমাদের নতুন সংগ্রহ
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {newArrivals.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  compactActions
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Offer Section */}
      {settings?.homepage_show_sale !== false && onSale.length > 0 && (
        <section className="py-10 sm:py-16">
          <div className="section-padding">
            <div className="text-center mb-10">
              <span className="inline-block rounded-full bg-accent/10 text-accent px-4 py-1 text-sm font-semibold mb-2">
                Special Offers
              </span>

              <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark">
                নিজের যত্নে আজই কিছু একটা বেছে নিন
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {onSale.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  compactActions
                />
              ))}
            </div>
          </div>
        </section>
      )}



      {/* Why Choose Us */}
      {settings?.homepage_show_why_choose_us !== false && (
      <section className="py-10 sm:py-16 bg-dark text-white">
        <div className="section-padding">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
              কেন Homemade Beauty Care?
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_CHOOSE_US.map((item, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white/5 p-6 border border-white/10 transition-all hover:bg-white/10 hover:border-primary/30"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary-light mb-4">
                  <Leaf size={24} />
                </div>

                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  {item.title}
                </h3>

                <p className="text-sm text-white/60 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* How to Order */}
      {settings?.homepage_show_how_to_order !== false && (
      <section className="py-10 sm:py-16">
        <div className="section-padding">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark">
              How to Order?
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_TO_ORDER.map((step, idx) => (
              <div
                key={idx}
                className="text-center"
              >
                <div className="relative inline-flex">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary font-display text-2xl font-bold">
                    {step.num}
                  </div>

                  {idx < HOW_TO_ORDER.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 left-full w-full h-0.5 bg-primary/20 -translate-y-1/2" />
                  )}
                </div>

                <h3 className="mt-4 font-medium text-ink">
                  {step.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}


      {/* Customer Reviews */}
      {settings?.homepage_show_reviews !== false && (
      <section className="py-10 sm:py-16 bg-cream">
        <div className="section-padding">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark">
              আমাদের কাস্টমাররা কী বলছেন?
            </h2>
          </div>

          {reviews.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {reviews.slice(0, 3).map((review, idx) => (
              <div
                key={idx}
                className="card p-6 border border-gray-50"
              >
                <div className="flex items-center gap-3 mb-4">
                  {review.image_url && (
                    <img
                      src={review.image_url}
                      alt={review.customer_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  )}

                  <div>
                    <h4 className="font-semibold text-ink">
                      {review.customer_name}
                    </h4>

                    <p className="text-xs text-gray-400">
                      {review.location}
                    </p>
                  </div>
                </div>

                <StarRating
                  rating={review.rating}
                  size={16}
                  className="mb-3"
                />

                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  "{review.review_bn}"
                </p>

                {Array.isArray(review.media_urls) && review.media_urls.length > 0 && <div className="mb-4 grid grid-cols-2 gap-2">{review.media_urls.map((url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url) ? <div key={url} className="relative overflow-hidden rounded-xl bg-black"><video src={url} controls preload="metadata" playsInline className="aspect-[4/5] w-full object-cover" /><button type="button" onClick={() => openReviewMedia(url, true)} className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-1 text-xs text-white" aria-label="ভিডিও পূর্ণ পর্দায় দেখুন">⛶</button></div> : <button key={url} type="button" onClick={() => openReviewMedia(url, false)} className="block overflow-hidden rounded-xl bg-white text-left"><img src={url} alt="Customer review" loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-300 hover:scale-[1.03]" /></button>)}</div>}

                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 12l2 2 4-4" />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                    />
                  </svg>

                  Verified Purchase
                </span>
              </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">
              এখনো কোনো কাস্টমার রিভিউ প্রকাশ করা হয়নি।
            </div>
          )}
        </div>
      </section>
      )}

      {fullscreenReviewMedia && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Review media full screen" onClick={closeReviewMedia}>
          <button type="button" onClick={() => setFullscreenReviewMedia(null)} className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25" aria-label="বন্ধ করুন">×</button>
          {fullscreenReviewMedia.isVideo
            ? <video src={fullscreenReviewMedia.url} controls autoPlay playsInline className="max-h-[92vh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
            : <img src={fullscreenReviewMedia.url} alt="Review full screen" className="max-h-[92vh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} />}
        </div>
      )}


      {/* Social Section */}
      {[
        { name: 'Facebook', url: settings?.facebook_url, icon: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z', color: 'bg-[#1877F2]' },
        { name: 'Instagram', url: settings?.instagram_url, icon: 'M16 11.37A4 4 0 1 1 7.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M3 11.37A8.37 8.37 0 0 1 11.37 3h1.26A8.37 8.37 0 0 1 21 11.37v1.26A8.37 8.37 0 0 1 12.63 21h-1.26A8.37 8.37 0 0 1 3 12.63z', color: 'bg-gradient-to-br from-[#E4405F] to-[#F77737]' },
        { name: 'TikTok', url: settings?.tiktok_url, icon: 'M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5', color: 'bg-dark' },
      ].filter(social => social.url).length > 0 && (
        <section className="py-10 sm:py-16">
          <div className="section-padding">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-dark">
                আমাদের সাথে যুক্ত থাকুন
              </h2>
              <p className="mt-2 text-gray-500">
                New Arrivals, beauty tips এবং special offers পেতে আমাদের follow করুন।
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                { name: 'Facebook', url: settings?.facebook_url, icon: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z', color: 'bg-[#1877F2]' },
                { name: 'Instagram', url: settings?.instagram_url, icon: 'M16 11.37A4 4 0 1 1 7.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M3 11.37A8.37 8.37 0 0 1 11.37 3h1.26A8.37 8.37 0 0 1 21 11.37v1.26A8.37 8.37 0 0 1 12.63 21h-1.26A8.37 8.37 0 0 1 3 12.63z', color: 'bg-gradient-to-br from-[#E4405F] to-[#F77737]' },
                { name: 'TikTok', url: settings?.tiktok_url, icon: 'M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5', color: 'bg-dark' },
              ].filter(social => social.url).map(social => (
                <a
                  key={social.name}
                  href={social.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex flex-col items-center gap-3 rounded-2xl ${social.color} p-8 text-white transition-all hover:scale-105 hover:shadow-xl`}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={social.icon} />
                  </svg>
                  <span className="font-display text-lg font-semibold">{social.name}</span>
                  <span className="text-sm text-white/80">Follow Us</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}