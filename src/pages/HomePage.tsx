import { useState, useEffect } from 'react';
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

export default function HomePage() {
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
  const [currentBanner, setCurrentBanner] = useState(0);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

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
            .select('*, category:categories(*)')
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
      {/* Hero Slider */}
      {banners.length > 0 && (
        <section className="relative hero-premium h-[500px] sm:h-[550px] lg:h-[600px] overflow-hidden">
          {banners.map((banner, idx) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-700 ${
                idx === currentBanner
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="absolute inset-0">
                <picture>
                  <source media="(max-width: 639px)" srcSet={banner.mobile_image_url || banner.desktop_image_url || banner.image_url || ''} />
                  <img
                    src={banner.desktop_image_url || banner.image_url || banner.mobile_image_url || ''}
                    alt={banner.title_bn}
                    className={`h-full w-full object-cover ${idx === currentBanner ? 'animate-slow-zoom' : ''}`}
                  />
                </picture>

                <div className="absolute inset-0 bg-gradient-to-r from-dark/70 via-dark/30 to-transparent" />
              </div>

              <div className="relative z-10 h-full section-padding flex items-center">
                <div className="max-w-xl text-white">
                  {banner.small_text_bn && (
                    <p className="text-sm font-medium text-primary-light mb-3 tracking-wider uppercase animate-fade-in-up">
                      {banner.small_text_bn}
                    </p>
                  )}

                  <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4 animate-fade-in-up">
                    {banner.title_bn}
                  </h1>

                  {banner.description_bn && (
                    <p className="text-sm sm:text-base text-white/80 mb-5 sm:mb-6 max-w-md animate-fade-in-up">
                      {banner.description_bn}
                    </p>
                  )}

                  <div className="relative z-20 flex flex-wrap gap-3 animate-fade-in-up">
                    {banner.button_text_bn && (
                      <Link
                        to={banner.button_link || '/shop'}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 font-medium text-white transition-all hover:bg-primary-light hover:shadow-lg active:scale-95 click-feedback-soft"
                      >
                        {banner.button_text_bn}
                      </Link>
                    )}

                    {idx === 0 && (
                      <Link
                        to="/shop"
                        className="inline-flex items-center gap-2 rounded-full border-2 border-white/80 px-8 py-3.5 font-medium text-white transition-all hover:bg-white hover:text-dark active:scale-95 click-feedback-soft"
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
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/40 click-feedback-soft"
                aria-label="Previous banner"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                onClick={nextBanner}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/40 click-feedback-soft"
                aria-label="Next banner"
              >
                <ChevronRight size={24} />
              </button>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
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
      )}

      {/* Trust Strip */}
      <section className="bg-cream py-6">
        <div className="section-padding">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {TRUST_FEATURES.map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-2xl p-3 premium-hover animate-reveal-scale"
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
      {settings?.homepage_show_categories !== false && <section className="py-10 sm:py-16">
        <div className="section-padding">
          <div className="text-center mb-10">
            <h2 className="font-display section-heading-premium text-2xl sm:text-3xl font-bold text-dark">
              Shop by Category
            </h2>

            <p className="mt-2 text-gray-500">
              Choose the right category for your hair & skin care
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream click-feedback-soft"
              >
                <img
                  src={cat.image_url || ''}
                  alt={cat.name_bn}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-dark/70 via-dark/10 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-4 text-center">
                  <h3 className="font-display text-lg font-semibold text-white">
                    {cat.name_bn}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>}

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