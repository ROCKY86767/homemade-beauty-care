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
import type { Banner, Product, Category, Review } from '@/lib/types';
import ProductCard from '@/components/ProductCard';
import StarRating from '@/components/StarRating';

const TRUST_FEATURES = [
  {
    icon: Truck,
    title: 'সারা বাংলাদেশে ডেলিভারি',
    desc: 'দেশের যেকোনো প্রান্তে',
  },
  {
    icon: CreditCard,
    title: 'ক্যাশ অন ডেলিভারি',
    desc: 'পণ্য হাতে পেয়ে টাকা দিন',
  },
  {
    icon: Leaf,
    title: 'যত্নে তৈরি পণ্য',
    desc: 'প্রাকৃতিক উপাদানে',
  },
  {
    icon: Headphones,
    title: 'কাস্টমার সাপোর্ট',
    desc: 'যেকোনো প্রয়োজনে',
  },
];

const WHY_CHOOSE_US = [
  {
    title: 'প্রতিদিনের যত্নের জন্য',
    desc: 'আপনার beauty routine সহজ করার লক্ষ্য নিয়ে আমাদের পণ্য নির্বাচন করা হয়।',
  },
  {
    title: 'গুণগত মানের প্রতি যত্ন',
    desc: 'পণ্যের মান ও ব্যবহারকারীর অভিজ্ঞতাকে গুরুত্ব দেওয়া হয়।',
  },
  {
    title: 'সহজ অর্ডার',
    desc: 'সহজে অর্ডার করুন এবং বাসায় বসেই পণ্য গ্রহণ করুন।',
  },
  {
    title: 'সারা বাংলাদেশে ডেলিভারি',
    desc: 'বাংলাদেশের বিভিন্ন প্রান্তে পণ্য পৌঁছে দেওয়ার ব্যবস্থা।',
  },
  {
    title: 'কাস্টমার সাপোর্ট',
    desc: 'পণ্য নির্বাচন ও অর্ডার সংক্রান্ত সহযোগিতার জন্য আমাদের সাথে যোগাযোগ করুন।',
  },
];

const HOW_TO_ORDER = [
  { num: '01', title: 'পছন্দের পণ্য বেছে নিন' },
  { num: '02', title: 'কার্টে যোগ করুন' },
  { num: '03', title: 'আপনার তথ্য দিন' },
  { num: '04', title: 'অর্ডার কনফার্ম করুন' },
];

const SAMPLE_REVIEWS: Review[] = [
  {
    id: 's1',
    product_id: '',
    customer_name: 'নুসরাত জাহান',
    location: 'ঢাকা',
    rating: 5,
    review_bn:
      'প্রাকৃতিক উপাদানে তৈরি পণ্যগুলো দারুণ! চুল ও ত্বক অনেক ভালো হয়েছে। নিয়মিত ব্যবহার করছি।',
    is_verified: true,
    image_url:
      'https://images.pexels.com/photos/5069474/pexels-photo-5069474.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    sort_order: 0,
  },
  {
    id: 's2',
    product_id: '',
    customer_name: 'সাবরিনা আক্তার',
    location: 'চট্টগ্রাম',
    rating: 5,
    review_bn:
      'হেয়ার অয়েলটা জাদুর মতো কাজ করেছে। চুল পড়া অনেক কমে গেছে। সবাইকে সুপারিশ করছি।',
    is_verified: true,
    image_url:
      'https://images.pexels.com/photos/9774854/pexels-photo-9774854.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    sort_order: 1,
  },
  {
    id: 's3',
    product_id: '',
    customer_name: 'রিয়া হোসেন',
    location: 'ঢাকা',
    rating: 5,
    review_bn:
      'ফেস প্যাকটা অসাধারণ! ত্বক উজ্জ্বল ও মসৃণ হয়েছে। প্যাকেজিংও খুব সুন্দর।',
    is_verified: true,
    image_url:
      'https://images.pexels.com/photos/10159331/pexels-photo-10159331.jpeg?auto=compress&cs=tinysrgb&h=200&w=200',
    sort_order: 2,
  },
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

  useEffect(() => {
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
          bestResult,
          newResult,
          saleResult,
          categoriesResult,
          reviewsResult,
        ] = await Promise.all([
          supabase
            .from('banners')
            .select('*')
            .eq('is_active', true)
            .order('sort_order'),

          // ⭐ Homepage-এর মূল product list
          supabase
            .from('products')
            .select('*, category:categories(*)')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),

          supabase
            .from('products')
            .select('*, category:categories(*)')
            .eq('is_active', true)
            .eq('is_best_seller', true)
            .limit(4),

          supabase
            .from('products')
            .select('*, category:categories(*)')
            .eq('is_active', true)
            .eq('is_new', true)
            .limit(4),

          supabase
            .from('products')
            .select('*, category:categories(*)')
            .eq('is_active', true)
            .eq('is_on_sale', true)
            .limit(4),

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

        if (bestResult.error) {
          console.error('Best sellers load error:', bestResult.error);
        }

        if (newResult.error) {
          console.error('New arrivals load error:', newResult.error);
        }

        if (saleResult.error) {
          console.error('Sale products load error:', saleResult.error);
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

        setBanners(bannersResult.data || []);

        // ⭐ সব active products
        setAllProducts(loadedProducts);

        setBestSellers(bestResult.data || []);
        setHairCare(loadedHairCare);
        setSkinCare(loadedSkinCare);
        setNewArrivals(newResult.data || []);
        setOnSale(saleResult.data || []);
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
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length]);

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
        <section className="relative h-[500px] sm:h-[550px] lg:h-[600px] overflow-hidden">
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
                <img
                  src={banner.image_url || ''}
                  alt={banner.title_bn}
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-dark/70 via-dark/30 to-transparent" />
              </div>

              <div className="relative h-full section-padding flex items-center">
                <div className="max-w-xl text-white">
                  {banner.small_text_bn && (
                    <p className="text-sm font-medium text-primary-light mb-3 tracking-wider uppercase animate-fade-in-up">
                      {banner.small_text_bn}
                    </p>
                  )}

                  <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4 animate-fade-in-up">
                    {banner.title_bn}
                  </h1>

                  {banner.description_bn && (
                    <p className="text-base text-white/80 mb-6 max-w-md animate-fade-in-up">
                      {banner.description_bn}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-3 animate-fade-in-up">
                    {banner.button_text_bn && (
                      <Link
                        to={banner.button_link || '/shop'}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 font-medium text-white transition-all hover:bg-primary-light hover:shadow-lg active:scale-95"
                      >
                        {banner.button_text_bn}
                      </Link>
                    )}

                    {idx === 0 && (
                      <Link
                        to="/category/combo"
                        className="inline-flex items-center gap-2 rounded-full border-2 border-white/80 px-8 py-3.5 font-medium text-white transition-all hover:bg-white hover:text-dark active:scale-95"
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
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/40"
                aria-label="Previous banner"
              >
                <ChevronLeft size={24} />
              </button>

              <button
                onClick={nextBanner}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition-colors hover:bg-white/40"
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
                className="flex items-center gap-3 p-3"
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
      <section className="py-16">
        <div className="section-padding">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-dark">
              আপনার প্রয়োজন অনুযায়ী শপ করুন
            </h2>

            <p className="mt-2 text-gray-500">
              চুল ও ত্বকের যত্নের জন্য বেছে নিন আপনার পছন্দের ক্যাটাগরি
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map(cat => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-cream"
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
      </section>

      {/* ⭐ ALL ACTIVE PRODUCTS */}
      {allProducts.length > 0 && (
        <section className="py-16 bg-cream">
          <div className="section-padding">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="font-display text-3xl font-bold text-dark">
                  আমাদের পণ্যসমূহ
                </h2>

                <p className="mt-2 text-gray-500">
                  আপনার দৈনন্দিন সৌন্দর্য ও যত্নের জন্য আমাদের পণ্যগুলো দেখুন।
                </p>
              </div>

              <Link
                to="/shop"
                className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
              >
                সব পণ্য দেখুন
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {allProducts.slice(0, 8).map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Best Sellers */}
      {bestSellers.length > 0 && (
        <section className="py-16">
          <div className="section-padding">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl font-bold text-dark">
                সবচেয়ে বেশি পছন্দের
              </h2>

              <p className="mt-2 text-gray-500">
                আমাদের জনপ্রিয় পণ্যগুলো এক নজরে দেখুন
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {bestSellers.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hair Care Section */}
      {hairCare.length > 0 && (
        <section className="py-16">
          <div className="section-padding">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="font-display text-3xl font-bold text-dark">
                  চুলের যত্নে আমাদের বিশেষ সংগ্রহ
                </h2>

                <p className="mt-2 text-gray-500 max-w-lg">
                  চুলের দৈনন্দিন যত্নকে সহজ ও সুন্দর করতে বেছে নিন আমাদের Hair
                  Care Collection।
                </p>
              </div>

              <Link
                to="/category/hair-care"
                className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
              >
                সব Hair Care দেখুন
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {hairCare.slice(0, 4).map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Skin Care Section */}
      {skinCare.length > 0 && (
        <section className="py-16 bg-light-green/40">
          <div className="section-padding">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="font-display text-3xl font-bold text-dark">
                  ত্বকের যত্নে প্রতিদিনের ভালোবাসা
                </h2>

                <p className="mt-2 text-gray-500 max-w-lg">
                  আপনার skincare routine-এর জন্য প্রয়োজনীয় পণ্যগুলো খুঁজে নিন।
                </p>
              </div>

              <Link
                to="/category/skin-care"
                className="inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
              >
                সব Skin Care দেখুন
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {skinCare.slice(0, 4).map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Special Combo Banner */}
      <section className="py-16">
        <div className="section-padding">
          <div className="relative overflow-hidden rounded-3xl bg-dark">
            <div className="grid md:grid-cols-2 items-center">
              <div className="p-8 lg:p-12 text-white">
                <span className="inline-block rounded-full bg-accent px-4 py-1 text-xs font-semibold uppercase tracking-wider mb-4">
                  Combo Offer
                </span>

                <h2 className="font-display text-3xl lg:text-4xl font-bold mb-4">
                  একসাথে যত্ন, একসাথে সাশ্রয়
                </h2>

                <p className="text-white/70 mb-6 max-w-md">
                  চুল ও ত্বকের যত্নের জন্য বেছে নিন আমাদের বিশেষ Combo Collection।
                </p>

                <div className="flex flex-wrap gap-4 mb-6">
                  <div>
                    <p className="text-sm text-white/50">
                      Original Price
                    </p>
                    <p className="text-lg text-white/60 line-through">
                      ৳1,600
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-white/50">
                      Combo Price
                    </p>
                    <p className="text-2xl font-bold text-primary-light">
                      ৳1,200
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-white/50">
                      You Save
                    </p>
                    <p className="text-2xl font-bold text-accent-light">
                      ৳400
                    </p>
                  </div>
                </div>

                <Link
                  to="/category/combo"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 font-medium text-white transition-all hover:bg-accent-light active:scale-95"
                >
                  Combo Collection দেখুন
                </Link>
              </div>

              <div className="relative h-64 md:h-full min-h-[300px]">
                <img
                  src="https://images.pexels.com/photos/17307534/pexels-photo-17307534.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                  alt="Combo Collection"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-16 bg-cream">
          <div className="section-padding">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl font-bold text-dark">
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
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Offer Section */}
      {onSale.length > 0 && (
        <section className="py-16">
          <div className="section-padding">
            <div className="text-center mb-10">
              <span className="inline-block rounded-full bg-accent/10 text-accent px-4 py-1 text-sm font-semibold mb-2">
                বিশেষ অফার
              </span>

              <h2 className="font-display text-3xl font-bold text-dark">
                নিজের যত্নে আজই কিছু একটা বেছে নিন
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {onSale.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="py-16 bg-dark text-white">
        <div className="section-padding">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-white">
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

      {/* How to Order */}
      <section className="py-16">
        <div className="section-padding">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-dark">
              কীভাবে অর্ডার করবেন?
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

      {/* Customer Reviews */}
      <section className="py-16 bg-cream">
        <div className="section-padding">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-dark">
              আমাদের কাস্টমাররা কী বলছেন?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {(reviews.length > 0
              ? reviews.slice(0, 3)
              : SAMPLE_REVIEWS
            ).map((review, idx) => (
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
        </div>
      </section>

      {/* Social Section */}
      <section className="py-16">
        <div className="section-padding">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-dark">
              আমাদের সাথে যুক্ত থাকুন
            </h2>

            <p className="mt-2 text-gray-500">
              নতুন পণ্য, beauty tips এবং special offers পেতে আমাদের follow করুন।
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              {
                name: 'Facebook',
                icon: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
                color: 'bg-[#1877F2]',
              },
              {
                name: 'Instagram',
                icon: 'M16 11.37A4 4 0 1 1 7.63 8 4 4 0 0 1 16 11.37z M17.5 6.5h.01 M3 11.37A8.37 8.37 0 0 1 11.37 3h1.26A8.37 8.37 0 0 1 21 11.37v1.26A8.37 8.37 0 0 1 12.63 21h-1.26A8.37 8.37 0 0 1 3 12.63z',
                color: 'bg-gradient-to-br from-[#E4405F] to-[#F77737]',
              },
              {
                name: 'TikTok',
                icon: 'M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5',
                color: 'bg-dark',
              },
            ].map(social => (
              <a
                key={social.name}
                href="#"
                className={`group flex flex-col items-center gap-3 rounded-2xl ${social.color} p-8 text-white transition-all hover:scale-105 hover:shadow-xl`}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={social.icon} />
                </svg>

                <span className="font-display text-lg font-semibold">
                  {social.name}
                </span>

                <span className="text-sm text-white/80">
                  Follow Us
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}