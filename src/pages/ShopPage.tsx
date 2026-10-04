import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Category } from '@/lib/types';
import ProductCard from '@/components/ProductCard';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Best Rated' },
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
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [minRating, setMinRating] = useState(0);
  const [onlyDiscount, setOnlyDiscount] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let productQuery = supabase.from('products').select('*, category:categories(*)');

      if (categorySlug) {
        const { data: cat } = await supabase.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
        if (cat) productQuery = productQuery.eq('category_id', cat.id);
      }
      if (isOffers) productQuery = productQuery.eq('is_on_sale', true);
      if (isNewArrivals) productQuery = productQuery.eq('is_new', true);
      if (query) productQuery = productQuery.or(`name_bn.ilike.%${query}%,name_en.ilike.%${query}%`);

      const [{ data: productData }, { data: catData }] = await Promise.all([
        productQuery,
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
      ]);

      setProducts(productData || []);
      setCategories(catData || []);
      setLoading(false);
    })();
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
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-base font-semibold text-ink mb-3">Category</h3>
        <div className="space-y-2">
          {categories.map(cat => (
            <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCats.includes(cat.slug)}
                onChange={() => toggleCat(cat.slug)}
                disabled={!!categorySlug}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600 group-hover:text-ink">{cat.name_bn}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-base font-semibold text-ink mb-3">Price Range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={priceRange[0]}
            onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Min"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            value={priceRange[1]}
            onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="Max"
          />
        </div>
      </div>

      <div>
        <h3 className="font-display text-base font-semibold text-ink mb-3">Rating</h3>
        <div className="space-y-2">
          {[4, 3, 0].map(r => (
            <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="rating"
                checked={minRating === r}
                onChange={() => setMinRating(r)}
                className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600 group-hover:text-ink">
                {r === 0 ? 'All Ratings' : `${r}★ & above`}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-base font-semibold text-ink mb-3">Discount</h3>
        <label className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={onlyDiscount}
            onChange={e => setOnlyDiscount(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-600 group-hover:text-ink">Only Discounted Products</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Banner */}
      <div className="bg-cream py-7 sm:py-10">
        <div className="section-padding text-center">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-dark">{pageTitle}</h1>
          {pageDesc && <p className="mt-2 text-gray-500 max-w-xl mx-auto">{pageDesc}</p>}
        </div>
      </div>

      <div className="section-padding py-6 sm:py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-44">
              <h2 className="font-display text-lg font-semibold text-ink mb-5 flex items-center gap-2">
                <SlidersHorizontal size={18} /> Filters
              </h2>
              <FilterContent />
            </div>
          </aside>

          {/* Main */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5 sm:mb-6">
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
              <FilterContent />
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
