import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Category } from '@/lib/types';
import ProductCard from '@/components/ProductCard';

const SORT_OPTIONS = [
  { value: 'newest', label: 'নতুন' },
  { value: 'price-low', label: 'দাম: কম থেকে বেশি' },
  { value: 'price-high', label: 'দাম: বেশি থেকে কম' },
  { value: 'popular', label: 'জনপ্রিয়' },
  { value: 'rating', label: 'ভালো রেটিং' },
];

const PRICE_FILTERS = [
  { label: 'সব দাম', min: 0, max: Number.MAX_SAFE_INTEGER },
  { label: '৳৫০০-এর কম', min: 0, max: 499 },
  { label: '৳৫০০–৳১০০০', min: 500, max: 1000 },
  { label: '৳১০০০-এর বেশি', min: 1001, max: Number.MAX_SAFE_INTEGER },
];

interface ShopPageProps {
  categorySlug?: string;
  isOffers?: boolean;
  isNewArrivals?: boolean;
}

export default function ShopPage({ categorySlug, isOffers, isNewArrivals }: ShopPageProps) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>(categorySlug ? [categorySlug] : []);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, Number.MAX_SAFE_INTEGER]);
  const [minRating, setMinRating] = useState(0);
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [shopPageImage, setShopPageImage] = useState<{ desktop_image_url: string | null; mobile_image_url: string | null } | null>(null);


  useEffect(() => {
    let active = true;

    const loadShopData = async () => {
      setLoading(true);

      try {
        let productQuery = supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('is_active', true);

        if (categorySlug) {
          const { data: category, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', categorySlug)
            .maybeSingle();

          if (categoryError) throw categoryError;
          if (!category) {
            if (active) {
              setProducts([]);
              setCategories([]);
            }
            return;
          }
          productQuery = productQuery.eq('category_id', category.id);
        }

        if (isOffers) productQuery = productQuery.eq('is_on_sale', true);
        if (isNewArrivals) productQuery = productQuery.eq('is_new', true);
        if (query) productQuery = productQuery.or(`name_bn.ilike.%${query}%,name_en.ilike.%${query}%`);

        const [productResult, categoryResult] = await Promise.all([
          productQuery,
          supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        ]);

        if (productResult.error) throw productResult.error;
        if (categoryResult.error) console.error('Shop categories load error:', categoryResult.error);
        if (!active) return;

        setProducts(productResult.data || []);
        setCategories(categoryResult.data || []);
      } catch (error) {
        if (active) {
          console.error('Shop data loading error:', error);
          setProducts([]);
          setCategories([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadShopData();
    return () => {
      active = false;
    };
  }, [categorySlug, isOffers, isNewArrivals, query]);

  useEffect(() => {
    let active = true;
    const isShopAllPage = !categorySlug && !isOffers && !isNewArrivals && !query;
    if (!isShopAllPage) {
      setShopPageImage(null);
      return () => { active = false; };
    }

    supabase
      .from('shop_page_settings')
      .select('desktop_image_url, mobile_image_url')
      .eq('id', 1)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Shop All image load error:', error);
          setShopPageImage(null);
          return;
        }
        setShopPageImage(data || null);
      });

    return () => { active = false; };
  }, [categorySlug, isOffers, isNewArrivals, query]);

  const filtered = useMemo(() => {
    let result = [...products];

    if (selectedCats.length > 0 && !categorySlug) {
      const catIds = categories.filter(c => selectedCats.includes(c.slug)).map(c => c.id);
      result = result.filter(p => p.category_id && catIds.includes(p.category_id));
    }
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (minRating > 0) result = result.filter(p => p.rating >= minRating);
    if (onlyDiscount) result = result.filter(p => p.old_price && p.old_price > p.price);

    switch (sortBy) {
      case 'price-low': result.sort((a, b) => a.price - b.price); break;
      case 'price-high': result.sort((a, b) => b.price - a.price); break;
      case 'popular': result.sort((a, b) => b.review_count - a.review_count); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [products, selectedCats, priceRange, minRating, onlyDiscount, sortBy, categories, categorySlug]);

  const pageTitle = isOffers ? 'Special Offers' : isNewArrivals ? 'New Arrivals' : categorySlug
    ? categories.find(c => c.slug === categorySlug)?.name_bn || 'Shop'
    : 'Shop All';

  const pageDesc = categorySlug
    ? categories.find(c => c.slug === categorySlug)?.description_bn || ''
    : 'আপনার পছন্দের প্রাকৃতিক সৌন্দর্য পণ্য বেছে নিন';

  const toggleCat = (slug: string) => {
    setSelectedCats(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const FilterContent = () => (
    <div className="luna-filter-content space-y-5">
      <div className="luna-filter-group">
        <h3 className="font-display text-sm font-semibold text-ink mb-2.5">ক্যাটাগরি</h3>
        <div className="luna-filter-options flex flex-wrap gap-2">
          {categories.map(cat => {
            const selected = selectedCats.includes(cat.slug);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCat(cat.slug)}
                disabled={!!categorySlug}
                aria-pressed={selected}
                className={`luna-filter-chip inline-flex min-h-9 items-center justify-center whitespace-nowrap leading-none rounded-full border px-3 py-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                {cat.name_bn}
              </button>
            );
          })}
        </div>
      </div>

      <div className="luna-filter-group">
        <h3 className="font-display text-sm font-semibold text-ink mb-2.5">দাম</h3>
        <div className="luna-filter-options flex flex-wrap gap-2">
          {PRICE_FILTERS.map(option => {
            const selected = priceRange[0] === option.min && priceRange[1] === option.max;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() => setPriceRange([option.min, option.max])}
                aria-pressed={selected}
                className={`luna-filter-chip inline-flex min-h-9 items-center justify-center whitespace-nowrap leading-none rounded-full border px-3 py-2 text-xs transition-colors ${
                  selected
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="luna-filter-group">
        <h3 className="font-display text-sm font-semibold text-ink mb-2.5">রেটিং</h3>
        <div className="luna-filter-options flex flex-wrap gap-2">
          {[{ value: 0, label: 'সব রেটিং' }, { value: 3, label: '৩★ ও বেশি' }, { value: 4, label: '৪★ ও বেশি' }].map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMinRating(option.value)}
              aria-pressed={minRating === option.value}
              className={`luna-filter-chip rounded-full border px-3 py-2 text-xs transition-colors ${
                minRating === option.value
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="luna-filter-discount flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-3 cursor-pointer">
        <span className="text-sm font-medium text-ink">শুধু ছাড়ের পণ্য দেখুন</span>
        <input
          type="checkbox"
          checked={onlyDiscount}
          onChange={e => setOnlyDiscount(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
      </label>
    </div>
  );

  return (
    <div className="luna-shop-page min-h-screen bg-white">
      {/* Shop heading with optional Shop All background image */}
      <div className={`luna-shop-heading ${shopPageImage && (shopPageImage.desktop_image_url || shopPageImage.mobile_image_url) ? 'has-shop-image relative isolate overflow-hidden bg-cream' : 'relative isolate overflow-hidden bg-cream py-7 sm:py-10'}`}>
        {shopPageImage && (shopPageImage.desktop_image_url || shopPageImage.mobile_image_url) && (
          <>
            <picture className="relative z-0 block aspect-[900/344] w-full overflow-hidden sm:aspect-[1920/188]">
              {shopPageImage.mobile_image_url && (
                <source media="(max-width: 639px)" srcSet={shopPageImage.mobile_image_url} />
              )}
              <img
                src={shopPageImage.desktop_image_url || shopPageImage.mobile_image_url || ''}
                alt=""
                aria-hidden="true"
                loading="eager"
                decoding="async"
                className="absolute inset-0 block h-full w-full object-cover"
              />
            </picture>
            <div className="absolute inset-0 z-10 bg-black/40" />
          </>
        )}
        <div className={`section-padding z-20 flex items-start justify-center pt-2 pb-0 text-center sm:pt-3 ${shopPageImage && (shopPageImage.desktop_image_url || shopPageImage.mobile_image_url) ? 'absolute inset-0' : 'relative'}`}>
          <div>
            <h1 className={`font-display text-2xl font-bold sm:text-3xl ${shopPageImage && (shopPageImage.desktop_image_url || shopPageImage.mobile_image_url) ? 'text-[#D4AF37] drop-shadow-md' : 'text-dark'}`}>{pageTitle}</h1>
            {pageDesc && <p className={`mx-auto mt-2 max-w-xl ${shopPageImage && (shopPageImage.desktop_image_url || shopPageImage.mobile_image_url) ? 'text-[#F2D58A] drop-shadow-sm' : 'text-gray-500'}`}>{pageDesc}</p>}
          </div>
        </div>
      </div>

      <div className="luna-shop-content section-padding py-6 sm:py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="luna-shop-sidebar hidden">
            <div className="sticky top-44">
              <h2 className="font-display text-lg font-semibold text-ink mb-5 flex items-center gap-2">
                <SlidersHorizontal size={18} /> Filters
              </h2>
              <FilterContent />
            </div>
          </aside>

          {/* Main collection grid */}
          <div className="flex-1 min-w-0">
            <div className="luna-filter-row"><FilterContent /></div>
            <div className="luna-shop-toolbar flex items-center justify-between mb-5 sm:mb-6">
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-ink">{filtered.length}</span> products
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(true)}
                  className="lg:hidden flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs sm:text-sm font-medium text-ink hover:border-primary"
                >
                  <SlidersHorizontal size={16} /> Filter & Sort
                </button>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="appearance-none rounded-full border border-gray-200 pl-3 pr-8 py-2 text-xs sm:text-sm font-medium text-ink outline-none focus:border-primary cursor-pointer"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">No products found.</p>
              </div>
            ) : (
              <div className="luna-shop-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filtered.map(p => <ProductCard key={p.id} product={p} compactActions />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl animate-slide-in overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <span className="font-display text-lg font-bold text-dark">Filter & Sort</span>
              <button onClick={() => setShowFilters(false)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-cream">
                <X size={22} />
              </button>
            </div>
            <div className="p-4">
              <div className="mb-6">
                <h3 className="font-display text-base font-semibold text-ink mb-3">Sort By</h3>
                <div className="space-y-2">
                  {SORT_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="sort"
                        checked={sortBy === opt.value}
                        onChange={() => setSortBy(opt.value)}
                        className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-600">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="luna-filter-drawer-content"><FilterContent /></div>
              <button
                onClick={() => setShowFilters(false)}
                className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-medium text-white"
              >
                Show {filtered.length} Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
