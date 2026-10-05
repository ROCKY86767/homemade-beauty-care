import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingCart, Zap, Truck, CreditCard, ShieldCheck, ChevronRight, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Review, SiteSettings } from '@/lib/types';
import { useCart } from '@/lib/cart-context';
import { getSettings } from '@/lib/settings';
import { formatPrice, calculateDiscount, calculateDiscountPercent } from '@/lib/format';
import StarRating from '@/components/StarRating';
import ProductCard from '@/components/ProductCard';
import SEO from '@/components/SEO';

const TABS = [
  { id: 'description', label: 'পণ্যের বিবরণ' },
  { id: 'benefits', label: 'উপকারিতা' },
  { id: 'how-to-use', label: 'ব্যবহারের নিয়ম' },
  { id: 'ingredients', label: 'উপাদান' },
  { id: 'delivery', label: 'Delivery Information' },
  { id: 'reviews', label: 'Reviews' },
];

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('description');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [cartMessage, setCartMessage] = useState('');
  const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, text: '' });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: prod } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('slug', slug)
        .maybeSingle();

      if (prod) {
        setProduct(prod);
        setActiveImage(0);
        setQuantity(1);

        try {
          const fbq = (window as Window & { fbq?: (...args: any[]) => void }).fbq;
          if (fbq) {
            fbq('track', 'ViewContent', {
              content_ids: [prod.id],
              content_name: prod.name_bn,
              content_type: 'product',
              value: Number(prod.price),
              currency: 'BDT',
            });
          }
        } catch (error) {
          console.error('Meta Pixel ViewContent error:', error);
        }

        const [{ data: reviewData }, { data: relatedData }] = await Promise.all([
          supabase.from('reviews').select('*').eq('product_id', prod.id).eq('is_approved', true).order('sort_order'),
          supabase.from('products').select('*, category:categories(*)')
            .neq('id', prod.id)
            .eq('category_id', prod.category_id || '')
            .eq('is_active', true)
            .limit(4),
        ]);
        setReviews(reviewData || []);
        setRelated(relatedData || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center min-h-[60vh] items-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">পণ্য পাওয়া যায়নি।</p>
        <Link to="/shop" className="mt-4 inline-block text-primary font-medium">শপে ফিরে যান</Link>
      </div>
    );
  }

  const gallery = product.gallery && product.gallery.length > 0 ? product.gallery : [product.image_url];
  const discount = calculateDiscount(product.price, product.old_price);
  const discountPercent = calculateDiscountPercent(product.price, product.old_price);
  const inWishlist = isInWishlist(product.id);
  const outOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    const result = addToCart(product, quantity);
    if (!result.success) {
      setCartMessage(result.message || 'স্টক পর্যাপ্ত নেই');
      setTimeout(() => setCartMessage(''), 3000);
    } else {
      setCartMessage('কার্টে যোগ হয়েছে!');
      setTimeout(() => setCartMessage(''), 2000);
    }
  };

  const handleBuyNow = () => {
    const result = addToCart(product, quantity);
    if (result.success) {
      navigate('/checkout');
    } else {
      setCartMessage(result.message || 'স্টক পর্যাপ্ত নেই');
      setTimeout(() => setCartMessage(''), 3000);
    }
  };

  const handleWhatsAppOrder = () => {
    const waNum = settings?.whatsapp_number?.replace(/[^0-9]/g, '') || '01999478203';
    const message = `আসসালামু আলাইকুম, আমি অর্ডার করতে চাই:%0A%0A*পণ্য:* ${product.name_bn}%0A*দাম:* ${formatPrice(product.price)}%0A*Quantity:* ${quantity}%0A*মোট:* ${formatPrice(product.price * quantity)}`;
    window.open(`https://wa.me/88${waNum}?text=${message}`, '_blank');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');

    if (!reviewForm.name.trim() || !reviewForm.text.trim()) return;

    const { error } = await supabase.from('reviews').insert({
      product_id: product.id,
      customer_name: reviewForm.name.trim(),
      rating: reviewForm.rating,
      review_bn: reviewForm.text.trim(),
      is_approved: false,
      is_verified: false,
    });

    if (error) {
      console.error('Review submission error:', error);
      setReviewError('Reviews জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      return;
    }

    setReviewSubmitted(true);
    setReviewForm({ name: '', rating: 5, text: '' });
    setTimeout(() => setReviewSubmitted(false), 5000);
  };

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={`${product.name_bn} - ${settings?.brand_name || 'Homemade Beauty Care'}`}
        description={product.short_description_bn || product.description_bn || undefined}
        image={product.image_url}
        canonical={window.location.href}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name_bn,
          description: product.description_bn || product.short_description_bn || undefined,
          image: gallery,
          sku: product.sku || undefined,
          category: product.category?.name_en || undefined,
          brand: {
            '@type': 'Brand',
            name: settings?.brand_name || 'Homemade Beauty Care',
          },
          offers: {
            '@type': 'Offer',
            priceCurrency: 'BDT',
            price: Number(product.price),
            availability:
              product.stock > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            url: window.location.href,
          },
          aggregateRating:
            product.review_count > 0
              ? {
                  '@type': 'AggregateRating',
                  ratingValue: Number(product.rating),
                  reviewCount: Number(product.review_count),
                }
              : undefined,
        }}
      />
      {/* Breadcrumb */}
      <div className="bg-cream py-3">
        <div className="section-padding">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Link to="/" className="hover:text-primary">হোম</Link>
            <ChevronRight size={14} />
            <Link to="/shop" className="hover:text-primary">শপ</Link>
            {product.category && (
              <>
                <ChevronRight size={14} />
                <Link to={`/category/${product.category.slug}`} className="hover:text-primary">{product.category.name_bn}</Link>
              </>
            )}
            <ChevronRight size={14} />
            <span className="text-ink font-medium">{product.name_bn}</span>
          </div>
        </div>
      </div>

      <div className="section-padding py-5 sm:py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Images */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-cream group">
              <img
                src={gallery[activeImage]}
                alt={product.name_bn}
                className="h-full w-full object-cover"
              />
              {discountPercent > 0 && (
                <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
                  Save {discountPercent}%
                </span>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="mt-4 flex gap-3">
                {gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(idx)}
                    className={`h-20 w-20 overflow-hidden rounded-xl border-2 transition-all ${
                      idx === activeImage ? 'border-primary' : 'border-transparent hover:border-gray-200'
                    }`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div>
            {product.category && (
              <Link to={`/category/${product.category.slug}`} className="text-sm text-primary font-medium">
                {product.category.name_bn}
              </Link>
            )}
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-dark">{product.name_bn}</h1>

            <div className="mt-3 flex items-center gap-3">
              <StarRating rating={product.rating} size={18} />
              <span className="text-sm text-gray-500">
                {product.rating} | {product.review_count} Reviews
              </span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-bold text-ink">{formatPrice(product.price)}</span>
              {product.old_price && product.old_price > product.price && (
                <>
                  <span className="text-xl text-gray-400 line-through">{formatPrice(product.old_price)}</span>
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
                    Save {formatPrice(discount)}
                  </span>
                </>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${outOfStock ? 'text-red-500' : 'text-primary'}`}>
                <span className={`h-2 w-2 rounded-full ${outOfStock ? 'bg-red-500' : 'bg-primary'}`} />
                {outOfStock ? 'স্টকে নেই' : `In Stock (${product.stock})`}
              </span>
              {product.sku && (
                <span className="text-sm text-gray-400 ml-3">SKU: {product.sku}</span>
              )}
            </div>

            {product.short_description_bn && (
              <p className="mt-4 text-gray-600 leading-relaxed">{product.short_description_bn}</p>
            )}

            {/* Quantity */}
            <div className="mt-6">
              <label className="text-sm font-medium text-ink mb-2 block">Quantity</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-full border border-gray-200">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center text-ink hover:text-primary"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-12 text-center font-semibold text-ink">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                    className="flex h-10 w-10 items-center justify-center text-ink hover:text-primary"
                    aria-label="Increase quantity"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {product.size_bn && (
                  <span className="text-sm text-gray-500">Size: {product.size_bn}</span>
                )}
              </div>
            </div>

            {cartMessage && (
              <p className={`mt-3 text-sm font-medium ${cartMessage.includes('কার্টে') ? 'text-primary' : 'text-red-500'}`}>
                {cartMessage}
              </p>
            )}

            {/* Buttons */}
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <button
                onClick={handleAddToCart}
                disabled={outOfStock}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-medium text-white transition-all hover:bg-primary-dark hover:shadow-lg active:scale-95 disabled:opacity-50"
              >
                <ShoppingCart size={20} /> Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={outOfStock}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 font-medium text-white transition-all hover:bg-accent-dark hover:shadow-lg active:scale-95 disabled:opacity-50"
              >
                <Zap size={20} /> Buy Now
              </button>
            </div>

            <button
              onClick={handleWhatsAppOrder}
              disabled={outOfStock}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 font-medium text-white transition-all hover:bg-[#1da851] hover:shadow-lg active:scale-95 disabled:opacity-50"
            >
              <MessageCircle size={20} /> WhatsApp এ Buy Now
            </button>

            <button
              onClick={() => toggleWishlist(product.id)}
              className={`mt-3 flex items-center gap-2 text-sm font-medium transition-colors ${
                inWishlist ? 'text-accent' : 'text-gray-500 hover:text-accent'
              }`}
            >
              <Heart size={18} className={inWishlist ? 'fill-accent' : ''} />
              {inWishlist ? 'Wishlist-এ আছে' : 'Add to Wishlist'}
            </button>

            {/* Delivery Info */}
            <div className="mt-5 rounded-2xl bg-cream p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Truck size={20} className="text-primary" />
                <span className="text-sm text-ink">সারা বাংলাদেশে ডেলিভারি</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-primary" />
                <span className="text-sm text-ink">Cash on Delivery Available</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-primary" />
                <span className="text-sm text-ink">প্রাকৃতিক উপাদানে তৈরি</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 sm:mt-12">
          <div className="border-b border-gray-100 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-max">
              {TABS.filter(tab => settings?.product_allow_reviews !== false || tab.id !== 'reviews').map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="py-6">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <p className="text-gray-600 leading-relaxed">{product.description_bn || product.short_description_bn}</p>
                {product.who_is_it_for_bn && (
                  <div className="mt-4">
                    <h3 className="font-display text-lg font-semibold text-ink mb-1">যাদের জন্য উপযুক্ত</h3>
                    <p className="text-gray-600">{product.who_is_it_for_bn}</p>
                  </div>
                )}
                {product.storage_bn && (
                  <div className="mt-4">
                    <h3 className="font-display text-lg font-semibold text-ink mb-1">সংরক্ষণ</h3>
                    <p className="text-gray-600">{product.storage_bn}</p>
                  </div>
                )}
                {product.notes_bn && (
                  <div className="mt-4 rounded-xl bg-accent/5 p-4">
                    <h3 className="font-display text-lg font-semibold text-ink mb-1">গুরুত্বপূর্ণ নোট</h3>
                    <p className="text-gray-600 text-sm">{product.notes_bn}</p>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'benefits' && (
              <p className="text-gray-600 leading-relaxed">{product.benefits_bn || 'তথ্য শীঘ্রই আপডেট করা হবে।'}</p>
            )}
            {activeTab === 'how-to-use' && (
              <p className="text-gray-600 leading-relaxed">{product.how_to_use_bn || 'তথ্য শীঘ্রই আপডেট করা হবে।'}</p>
            )}
            {activeTab === 'ingredients' && (
              <p className="text-gray-600 leading-relaxed">{product.ingredients_bn || 'তথ্য শীঘ্রই আপডেট করা হবে।'}</p>
            )}
            {activeTab === 'delivery' && (
              <div className="space-y-3 text-gray-600">
                <p>সারা বাংলাদেশে হোম ডেলিভারি সেবা গ্রহণযোগ্য।</p>
                <p>ঢাকার ভিতরে সাধারণত ১-২ দিনের মধ্যে ডেলিভারি হয়।</p>
                <p>ঢাকার বাইরে ৩-৫ দিন সময় লাগতে পারে।</p>
                <p>ক্যাশ অন ডেলিভারি সেবা গ্রহণযোগ্য।</p>
              </div>
            )}
            {activeTab === 'reviews' && (
              <div>
                <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-100">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-ink">{product.rating}</p>
                    <StarRating rating={product.rating} size={16} className="mt-1" />
                    <p className="text-sm text-gray-400 mt-1">{product.review_count} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5,4,3,2,1].map(star => {
                      const count = reviews.filter(r => Math.round(r.rating) === star).length;
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 w-3">{star}</span>
                          <div className="h-2 flex-1 rounded-full bg-gray-100 overflow-hidden max-w-200">
                            <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review form */}
                {settings?.product_allow_reviews !== false && <div className="mb-6 rounded-xl border border-gray-100 p-5">
                  <h3 className="font-display text-lg font-semibold text-ink mb-3">Reviews লিখুন</h3>
                  {reviewSubmitted ? (
                    <p className="text-sm text-primary">ধন্যবাদ! আপনার Reviews অ্যাডমিন অনুমোদনের পর প্রকাশ করা হবে।</p>
                  ) : (
                    <form onSubmit={handleReviewSubmit} className="space-y-3">
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-sm font-medium text-ink mb-1 block">আপনার নাম</label>
                          <input
                            type="text"
                            required
                            value={reviewForm.name}
                            onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })}
                            className="input-field"
                            placeholder="নাম"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-ink mb-1 block">রেটিং</label>
                          <select
                            value={reviewForm.rating}
                            onChange={e => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                            className="input-field"
                          >
                            {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} ★</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-ink mb-1 block">Reviews</label>
                        <textarea
                          required
                          rows={3}
                          value={reviewForm.text}
                          onChange={e => setReviewForm({ ...reviewForm, text: e.target.value })}
                          className="input-field resize-none"
                          placeholder="আপনার অভিজ্ঞতা Share..."
                        />
                      </div>
                      {reviewError && (
                        <p className="text-sm text-red-500">{reviewError}</p>
                      )}
                      <button type="submit" className="btn-primary text-sm py-2.5 px-6">Reviews জমা দিন</button>
                    </form>
                  )}
                </div>}

                <div className="space-y-4">
                  {reviews.length > 0 ? reviews.map(review => (
                    <div key={review.id} className="rounded-xl border border-gray-50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {review.image_url ? (
                            <img src={review.image_url} alt={review.customer_name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                              {review.customer_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold text-ink text-sm">{review.customer_name}</h4>
                            {review.location && <p className="text-xs text-gray-400">{review.location}</p>}
                          </div>
                        </div>
                        {review.is_verified && (
                          <span className="text-xs font-medium text-primary flex items-center gap-1">
                            <ShieldCheck size={14} /> Verified
                          </span>
                        )}
                      </div>
                      <StarRating rating={review.rating} size={14} className="mb-2" />
                      <p className="text-sm text-gray-600">{review.review_bn}</p>
                    </div>
                  )) : (
                    <p className="text-gray-400 text-center py-8">এই পণ্যের জন্য এখনো কোনো Reviews নেই।</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-10 sm:mt-16">
            <h2 className="font-display text-2xl font-bold text-dark mb-6">Related Products</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Mobile Add to Cart */}
      <div className="fixed bottom-16 left-0 right-0 z-30 lg:hidden bg-white border-t border-gray-100 p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 line-clamp-1">{product.name_bn}</p>
            <p className="text-lg font-bold text-ink">{formatPrice(product.price)}</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            <ShoppingCart size={18} /> Add
          </button>
          <button
            onClick={handleBuyNow}
            disabled={outOfStock}
            className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            <Zap size={18} /> Buy
          </button>
        </div>
      </div>
    </div>
  );
}
