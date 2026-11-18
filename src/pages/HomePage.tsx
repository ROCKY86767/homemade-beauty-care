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
import { getSettings, subscribeToSettings } from '@/lib/settings';
import ProductCard from '@/components/ProductCard';
import StarRating from '@/components/StarRating';
import SEO from '@/components/SEO';


const toWebPImageUrl = (imageUrl: string | null | undefined, width: number) => {
  if (!imageUrl) return '';
  try {
    const url = new URL(imageUrl);
    const publicStoragePrefix = '/storage/v1/object/public/';
    if (!url.pathname.includes(publicStoragePrefix)) return imageUrl;
    url.pathname = url.pathname.replace(publicStoragePrefix, '/storage/v1/render/image/public/');
    url.searchParams.set('format', 'webp');
    url.searchParams.set('quality', '80');
    url.searchParams.set('width', String(width));
    return url.toString();
  } catch {
    return imageUrl;
  }
};

const toWebPImageSrcSet = (imageUrl: string | null | undefined) =>
  [480, 828, 1280].map((width) => `${toWebPImageUrl(imageUrl, width)} ${width}w`).join(', ');

const INITIAL_HERO_BANNER: Banner = {
  id: '28a807e0-305f-49a0-84ce-3c2afa52b63d',
  title_bn: 'Homemade Beauty Care',
  small_text_bn: null,
  description_bn: null,
  button_text_bn: null,
  button_link: null,
  image_url: 'https://ccowyndqzlkpilygpepx.supabase.co/storage/v1/object/public/product-images/banners/1791435015419-ddlob4-Gemini_Generated_Image_4rjnfh4rjnfh4rjn.jpg',
  desktop_image_url: 'https://ccowyndqzlkpilygpepx.supabase.co/storage/v1/object/public/product-images/banners/1791435015419-ddlob4-Gemini_Generated_Image_4rjnfh4rjnfh4rjn.jpg',
  mobile_image_url: 'https://ccowyndqzlkpilygpepx.supabase.co/storage/v1/object/public/product-images/banners/1791435030581-5b2u92-Gemini_Generated_Image_wua0t2wua0t2wua0.jpg',
  sort_order: 1,
  is_active: true,
};

function HomePageLoadingSkeleton({ banner }: { banner?: Banner }) {
  return (
    <div className="homepage-compact" aria-hidden="true">
      <section className="relative mx-3 my-3 h-[520px] overflow-hidden rounded-[1.5rem] bg-[#e9e7dc] sm:mx-6 sm:my-6 sm:h-[560px] sm:rounded-[2rem] lg:mx-auto lg:my-8 lg:h-[590px] lg:w-[calc(100%-3rem)] lg:max-w-[1440px]">
        {banner ? (
          <>
            <picture>
              <source media="(max-width: 639px)" srcSet={toWebPImageSrcSet(banner.mobile_image_url || banner.desktop_image_url || banner.image_url)} sizes="100vw" />
              <img src={toWebPImageUrl(banner.desktop_image_url || banner.image_url || banner.mobile_image_url, 1280)} srcSet={toWebPImageSrcSet(banner.desktop_image_url || banner.image_url || banner.mobile_image_url)} sizes="100vw" alt={banner.title_bn} width="1920" height="1080" fetchPriority="high" loading="eager" decoding="async" className="absolute inset-0 h-full w-full object-cover animate-slow-zoom" />
            </picture>
            <div className="absolute inset-0 bg-gradient-to-r from-[#17291f]/80 via-[#17291f]/42 to-[#17291f]/5" />
            <div className="relative z-10 flex h-full items-center px-5 py-8 sm:px-10 lg:px-16"><h1 className="max-w-xl font-display text-3xl font-bold leading-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl">{banner.title_bn}</h1></div>
          </>
        ) : <div className="h-full w-full animate-pulse bg-[#e9e7dc]" />}
      </section>
      <section className="bg-white py-12 sm:py-20">
        <div className="section-padding">
          <div className="mx-auto mb-9 h-12 max-w-2xl animate-pulse rounded-xl bg-gray-100 sm:mb-12" />
          <div className="luna-category-grid grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-[1.35rem] bg-[#E8EEDF]" />)}
          </div>
        </div>
      </section>
      {[0, 1, 2].map((section) => (
        <section key={section} className="py-10 sm:py-16">
          <div className="section-padding">
            <div className="mx-auto mb-10 h-10 max-w-xs animate-pulse rounded-xl bg-gray-100" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="overflow-hidden rounded-2xl bg-white"><div className="aspect-square animate-pulse bg-[#E8EEDF]" /><div className="space-y-3 p-3"><div className="h-4 animate-pulse rounded bg-gray-100" /><div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" /></div></div>)}
            </div>
          </div>
        </section>
      ))}
      <section className="overflow-hidden bg-[#F7F4EA] py-8 sm:py-12">
        <div className="section-padding">
          <div className="mb-6 h-8 w-56 animate-pulse rounded bg-gray-100" />
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2].map(index => <div key={index} className="w-[58vw] max-w-[220px] shrink-0 overflow-hidden rounded-2xl bg-white"><div className="aspect-[4/5] animate-pulse bg-[#E8EEDF]" /><div className="h-24 animate-pulse bg-gray-100" /></div>)}
          </div>
        </div>
      </section>
    </div>
  );
}

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
  const [banners, setBanners] = useState<Banner[]>([INITIAL_HERO_BANNER]);

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
    if (event.pointerType === 'mouse') {
      container.style.cursor = 'grabbing';
    }
  };

  const handleReviewPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = reviewDragRef.current;
    const container = reviewMarqueeRef.current;
    if (!drag || !container || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) > 4 && !drag.moved) {
      drag.moved = true;
      setReviewManualMode(true);
    }
    if (drag.moved) {
      container.scrollLeft = drag.startScrollLeft - distance;
      if (event.pointerType === 'mouse') event.preventDefault();
    }
  };

  const handleReviewPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = reviewMarqueeRef.current;
    if (container && event.pointerType === 'mouse') {
      container.style.cursor = 'grab';
    }
    // Keep the drag flag until click-capture suppresses the accidental
    // click that browsers may fire immediately after a swipe.
    if (!reviewDragRef.current?.moved) reviewDragRef.current = null;
    setReviewManualMode(false);
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

  // When arriving from the hair-pack landing page, wait until homepage data has rendered,
  // then scroll specifically to the customer review section (not to a browser hash position).
  useEffect(() => {
    if (loading || sessionStorage.getItem('hbc-scroll-to-home-reviews') !== '1') return;
    sessionStorage.removeItem('hbc-scroll-to-home-reviews');
    const timer = window.setTimeout(() => {
      const section = document.getElementById('customer-reviews');
      if (!section) return;
      const top = section.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top, behavior: 'smooth' });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [loading]);

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
    getSettings().then(setSettings).catch((error) => console.error('Homepage settings load error:', error));
    const unsubscribeSettings = subscribeToSettings(setSettings);

    const loadHomePageData = async () => {
      try {
        /*
         * প্রথমে categories এবং সব active products আনা হচ্ছে।
         * এরপর category ID ব্যবহার করে Hair Care / Skin Care
         * আলাদা section-এর products বের করা হচ্ছে।
         */

        const bannersPromise = Promise.resolve(supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('sort_order'))
          .then((result) => {
            if (result.error) {
              console.error('Banners load error:', result.error);
              return result;
            }
            const now = new Date();
            const scheduled = (result.data || []).filter((banner: Banner) => {
              const startAt = banner.start_at ? new Date(banner.start_at) : null;
              const endAt = banner.end_at ? new Date(banner.end_at) : null;
              return (!startAt || startAt <= now) && (!endAt || endAt >= now);
            });
            setBanners(scheduled);
            return result;
          })
          .catch((error) => {
            console.error('Banners load error:', error);
            return null;
          });

        const [
          allProductsResult,
          categoriesResult,
          reviewsResult,
          editorialResult,
        ] = await Promise.all([
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

          supabase
            .from('homepage_editorial_reviews')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false }),
        ]);


        /*
         * Error থাকলে console-এ দেখাবে।
         * এতে ভবিষ্যতে Supabase query সমস্যা হলে
         * browser console থেকে সহজে বোঝা যাবে।
         */

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
        window.dispatchEvent(new Event('hbc:homepage-ready'));
      }
    };

    loadHomePageData();
    return unsubscribeSettings;
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

  if (loading) return <HomePageLoadingSkeleton banner={banners[0]} />;

  return (
    <div className="homepage-compact">
      <SEO title={settings?.seo_site_title || settings?.brand_name || 'Homemade Beauty Care'} />
      {/* LUNA editorial split hero */}
      {banners.length > 0 ? (
        <section className="luna-home-hero" aria-label="Featured collection">
          <div className="luna-home-hero-copy">
            <span className="luna-eyebrow">HOMEMADE BEAUTY CARE · EVERYDAY RITUALS</span>
            {banners.map((banner, idx) => (
              <div key={banner.id} className={idx === currentBanner ? 'luna-hero-slide is-active' : 'luna-hero-slide'} aria-hidden={idx !== currentBanner}>
                {banner.small_text_bn && <p className="luna-hero-kicker">{banner.small_text_bn}</p>}
                <h1>{banner.title_bn}</h1>
                {banner.description_bn && <p className="luna-hero-description">{banner.description_bn}</p>}
                <div className="luna-hero-actions">
                  <Link to={banner.button_link || '/shop'} className="luna-hero-primary">{banner.button_text_bn || 'Shop the collection'} <ArrowRight size={17} /></Link>
                  <Link to="/category/hair-care" className="luna-hero-secondary">Explore hair care</Link>
                </div>
              </div>
            ))}
            {banners.length > 1 && (
              <div className="luna-hero-pagination" aria-label="Choose featured banner">
                {banners.map((banner, idx) => <button key={banner.id} type="button" onClick={() => setCurrentBanner(idx)} className={idx === currentBanner ? 'is-active' : ''} aria-label={`Show slide ${idx + 1}`} />)}
                <button type="button" className="luna-hero-arrow" onClick={prevBanner} aria-label="Previous banner"><ChevronLeft size={17} /></button>
                <button type="button" className="luna-hero-arrow" onClick={nextBanner} aria-label="Next banner"><ChevronRight size={17} /></button>
              </div>
            )}
          </div>
          <div className="luna-home-hero-media">
            {banners.map((banner, idx) => (
              <picture key={banner.id} className={idx === currentBanner ? 'luna-hero-image is-active' : 'luna-hero-image'}>
                <source media="(max-width: 639px)" srcSet={toWebPImageSrcSet(banner.mobile_image_url || banner.desktop_image_url || banner.image_url)} sizes="100vw" />
                <img src={toWebPImageUrl(banner.desktop_image_url || banner.image_url || banner.mobile_image_url, 1280)} srcSet={toWebPImageSrcSet(banner.desktop_image_url || banner.image_url || banner.mobile_image_url)} sizes="(max-width: 767px) 100vw, 58vw" alt={banner.title_bn} width="1280" height="960" fetchPriority={idx === currentBanner ? 'high' : 'auto'} loading={idx === currentBanner ? 'eager' : 'lazy'} decoding="async" />
              </picture>
            ))}
            <span className="luna-image-caption">NATURAL CARE, THOUGHTFULLY MADE</span>
          </div>
        </section>
      ) : (
        <section className="luna-home-hero luna-home-hero-fallback">
          <div className="luna-home-hero-copy">
            <span className="luna-eyebrow">HOMEMADE BEAUTY CARE</span>
            <h1>প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া</h1>
            <p className="luna-hero-description">আপনার চুল ও ত্বকের দৈনন্দিন যত্নে বেছে নিন যত্ন করে তৈরি পণ্য।</p>
            <div className="luna-hero-actions"><Link to="/shop" className="luna-hero-primary">সব পণ্য দেখুন <ArrowRight size={17} /></Link><Link to="/category/hair-care" className="luna-hero-secondary">Hair Care</Link></div>
          </div>
          <div className="luna-home-hero-media luna-fallback-media"><img src="/new-homemade-logo.png" alt="Homemade Beauty Care" /></div>
        </section>
      )}

      {/* LUNA homepage: featured products, editorial story and one social-proof moment */}
      <section className="luna-featured-section"><div className="section-padding">
        <div className="luna-section-heading"><div><span className="luna-eyebrow">THE EVERYDAY EDIT</span><h2>Featured Products</h2><p>যত্নের প্রতিটি ধাপে আপনার পছন্দের পণ্য</p></div><Link to="/shop" className="luna-text-link">View all products <ArrowRight size={16} /></Link></div>
        {allProducts.length>0?<div className="luna-featured-grid">{(bestSellers.length?bestSellers:allProducts).slice(0,4).map(product=><ProductCard key={product.id} product={product} compactActions />)}</div>:<p className="luna-empty-note">নতুন পণ্য শীঘ্রই যুক্ত হচ্ছে।</p>}
      </div></section>
      {settings?.homepage_show_categories!==false&&categories.length>0&&<section className="luna-category-editorial"><div className="section-padding">
        <div className="luna-section-heading"><div><span className="luna-eyebrow">FIND YOUR RITUAL</span><h2>Explore by Category</h2></div></div>
        <div className="luna-category-links">{categories.slice(0,4).map((cat,idx)=><Link key={cat.id} to={`/category/${cat.slug}`} className="luna-category-link">{cat.image_url&&<img src={cat.image_url} alt={cat.name_bn} loading="lazy" decoding="async" />}<span><small>0{idx+1}</small>{cat.name_bn}<ArrowRight size={16} /></span></Link>)}</div>
      </div></section>}
      {settings?.combo_offer_enabled!==false&&<section className="luna-story-section">
        <div className="luna-story-image"><img src={settings?.combo_offer_image_url||"https://images.pexels.com/photos/17307534/pexels-photo-17307534.jpeg?auto=compress&cs=tinysrgb&h=900&w=1200"} alt="Homemade Beauty Care collection" loading="lazy" decoding="async" /></div>
        <div className="luna-story-copy"><span className="luna-eyebrow">A LITTLE MORE ABOUT US</span><h2>Beauty in simplicity.</h2><p>{settings?.combo_offer_description||'প্রকৃতির অনুপ্রেরণায় তৈরি যত্নের পণ্য, আপনার প্রতিদিনের রূপচর্চাকে সহজ ও সুন্দর করে তুলতে।'}</p><Link to="/about" className="luna-hero-primary">Discover our story <ArrowRight size={16} /></Link></div>
      </section>}
      {settings?.homepage_show_reviews!==false&&reviews.length>0&&<section className="luna-testimonial-section"><div className="section-padding">
        <span className="luna-eyebrow">KIND WORDS</span><h2>প্রিয় ক্রেতাদের অভিজ্ঞতা</h2><div className="luna-testimonial-grid">{reviews.slice(0,3).map(review=><article key={review.id} className="luna-testimonial"><StarRating rating={review.rating} size={15} /><p>“{review.review_bn}”</p><div><strong>{review.customer_name}</strong><span>{review.location}</span></div></article>)}</div>
      </div></section>}
      {fullscreenReviewMedia && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Review media full screen" onClick={closeReviewMedia}>
          <button type="button" onClick={() => setFullscreenReviewMedia(null)} className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25" aria-label="বন্ধ করুন">×</button>
          {fullscreenReviewMedia.isVideo
            ? <video src={fullscreenReviewMedia.url} controls preload="none" playsInline className="aspect-[4/5] max-h-[92vh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
            : <img src={fullscreenReviewMedia.url} alt="Review full screen" width="1200" height="1500" loading="lazy" decoding="async" className="max-h-[92vh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} />}
        </div>
      )}


    </div>
  );
}