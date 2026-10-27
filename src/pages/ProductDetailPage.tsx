import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Heart, Minus, Plus, ShoppingCart, Zap, Truck, CreditCard, ShieldCheck, ChevronRight, MessageCircle, ZoomIn, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Product, Review, SiteSettings } from '@/lib/types';
import { useCart } from '@/lib/cart-context';
import { getSettings } from '@/lib/settings';
import { verifyCustomerPurchasedProduct } from '@/lib/reviewVerification';
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
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [cartMessage, setCartMessage] = useState('');
  const [reviewForm, setReviewForm] = useState({ name: '', phone: '', rating: 5, text: '' });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);
  
  useEffect(() => {
    if (location.hash === '#reviews') setActiveTab('reviews');
  }, [location.hash, slug]);

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

    if (!reviewForm.name.trim() || !reviewForm.phone.trim() || !reviewForm.text.trim()) {
      setReviewError('নাম, অর্ডারের মোবাইল নম্বর ও রিভিউ লিখুন।');
      return;
    }

    const normalizedPhone = reviewForm.phone.replace(/[\s()-]/g, '');
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(normalizedPhone)) {
      setReviewError('অর্ডারে ব্যবহৃত সঠিক বাংলাদেশি মোবাইল নম্বর দিন।');
      return;
    }

    try {
      const purchased = await verifyCustomerPurchasedProduct(product.id, normalizedPhone);
      if (!purchased) {
        setReviewError('এই নম্বর দিয়ে এই পণ্যের Delivered অর্ডার পাওয়া যায়নি। অর্ডারে ব্যবহৃত নম্বর দিন।');
        return;
      }

      const privatePhone = normalizedPhone.replace(/\\D/g, '').replace(/^88/, '');
      const reviewId = crypto.randomUUID();
      const { error } = await supabase.from('reviews').insert({
        id: reviewId,
        product_id: product.id,
        customer_name: reviewForm.name.trim(),
        rating: reviewForm.rating,
        review_bn: reviewForm.text.trim(),
        is_approved: false,
        is_verified: true,
      });

      if (error) throw error;

      const { error: detailsError } = await supabase.from('review_customer_details').insert({
        review_id: reviewId,
        customer_phone: privatePhone,
      });
      if (detailsError) throw detailsError;

      setReviewSubmitted(true);
      setReviewForm({ name: '', phone: '', rating: 5, text: '' });
      setTimeout(() => setReviewSubmitted(false), 5000);
    } catch (error: any) {
      console.error('Review submission error:', error);
      setReviewError(error?.message || 'Reviews জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
    }
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
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                fetchPriority="high"
              />
              <button type="button" onClick={() => setImageZoomOpen(true)} aria-label="পণ্যের ছবি বড় করে দেখুন" title="ছবি বড় করে দেখুন" className="absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-ink shadow-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <ZoomIn size={20} />
              </button>
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
                    <img src={img} alt={product.name_bn + " ছবি " + (idx + 1)} loading="lazy" className="h-full w-full object-cover" />
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
                    <Minus size={16} />
                  </button>
                  <span className="w-10 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                    className="flex h-10 w-10 items-center justify-center text-ink hover:text-primary"
                    aria-label="Increase quantity"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button onClick={handleAddToCart} disabled={outOfStock} className="btn-primary flex-1 min-w-[180px] justify-center disabled:opacity-50">
                <ShoppingCart size={18} /> Add to Cart
              </button>
              <button onClick={handleBuyNow} disabled={outOfStock} className="btn-secondary flex-1 min-w-[180px] justify-center disabled:opacity-50">
                <Zap size={18} /> Buy Now
              </button>
              <button onClick={() => toggleWishlist(product.id)} className="h-12 w-12 rounded-xl border border-gray-200 flex items-center justify-center hover:border-primary hover:text-primary" aria-label="Wishlist">
                <Heart size={19} fill={inWishlist ? 'currentColor' : 'none'} />
              </button>
            </div>

            {cartMessage && <p className="mt-3 text-sm text-primary font-medium">{cartMessage}</p>}

            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-cream p-4"><Truck className="text-primary mb-2" size={20} /><p className="text-xs font-semibold">Fast Delivery</p><p className="text-[11px] text-gray-500">ঢাকা ও সারা বাংলাদেশ</p></div>
              <div className="rounded-2xl bg-cream p-4"><CreditCard className="text-primary mb-2" size={20} /><p className="text-xs font-semibold">Cash on Delivery</p><p className="text-[11px] text-gray-500">সহজ ও নিরাপদ</p></div>
              <div className="rounded-2xl bg-cream p-4"><ShieldCheck className="text-primary mb-2" size={20} /><p className="text-xs font-semibold">Quality Care</p><p className="text-[11px] text-gray-500">প্রকৃতির যত্নে</p></div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${activeTab === tab.id ? 'bg-primary text-white' : 'bg-cream text-gray-600 hover:text-primary'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === 'reviews' ? (
              <div className="grid lg:grid-cols-[1fr_420px] gap-8">
                <div>
                  <h2 className="text-xl font-bold text-ink">Customer Reviews</h2>
                  {reviews.length ? (
                    <div className="mt-5 space-y-4">
                      {reviews.map(review => (
                        <div key={review.id} className="rounded-2xl border border-gray-100 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-ink">{review.customer_name}</p>
                              <div className="mt-1 flex items-center gap-2"><StarRating rating={review.rating} size={14} />{review.is_verified && <span className="text-xs text-primary">Verified purchase</span>}</div>
                            </div>
                            <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString('bn-BD')}</span>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-gray-600">{review.review_bn}</p>
                          {Array.isArray(review.media_urls) && review.media_urls.length > 0 && <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">{review.media_urls.map((url: string, mediaIndex: number) => /\.(mp4|webm|mov)(\?|$)/i.test(url) ? <video key={`${url}-${mediaIndex}`} src={url} controls preload="metadata" playsInline className="aspect-[4/5] w-full rounded-xl bg-black object-cover" /> : <a key={`${url}-${mediaIndex}`} href={url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-xl bg-gray-50"><img src={url} alt={`Customer review media ${mediaIndex + 1}`} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.03]" /></a>)}</div>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="mt-4 text-sm text-gray-500">এখনও কোনো approved review নেই।</p>}
                </div>

                <div className="rounded-2xl border border-gray-100 bg-cream/50 p-5">
                  <h3 className="font-bold text-lg">Review দিন</h3>
                  <p className="mt-1 text-xs text-gray-500">শুধু এই পণ্যের Delivered অর্ডার করা কাস্টমাররা review দিতে পারবেন।</p>
                  {reviewSubmitted ? (
                    <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700">আপনার review জমা হয়েছে। Admin approval-এর পর এটি প্রকাশিত হবে।</div>
                  ) : (
                    <form onSubmit={handleReviewSubmit} className="mt-5 space-y-3">
                      <input value={reviewForm.name} onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))} placeholder="আপনার নাম" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
                      <input value={reviewForm.phone} onChange={e => setReviewForm(f => ({ ...f, phone: e.target.value }))} placeholder="অর্ডারে ব্যবহৃত মোবাইল নম্বর" inputMode="tel" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
                      <select value={reviewForm.rating} onChange={e => setReviewForm(f => ({ ...f, rating: Number(e.target.value) }))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"><option value={5}>5 Stars</option><option value={4}>4 Stars</option><option value={3}>3 Stars</option><option value={2}>2 Stars</option><option value={1}>1 Star</option></select>
                      <textarea value={reviewForm.text} onChange={e => setReviewForm(f => ({ ...f, text: e.target.value }))} placeholder="আপনার অভিজ্ঞতা লিখুন" rows={5} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
                      <div className="rounded-xl border border-dashed border-primary/30 bg-white p-4">
                        

                      </div>
                      {reviewError && <p className="text-xs text-red-600">{reviewError}</p>}
                      <button type="submit" className="btn-primary w-full justify-center">Submit Review</button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              <div className="prose max-w-none text-gray-600 leading-8">
                {activeTab === 'description' && <p>{product.description_bn || product.short_description_bn}</p>}
                {activeTab === 'benefits' && <p>{product.benefits_bn || 'তথ্য শীঘ্রই যোগ করা হবে।'}</p>}
                {activeTab === 'how-to-use' && <p>{product.how_to_use_bn || 'তথ্য শীঘ্রই যোগ করা হবে।'}</p>}
                {activeTab === 'ingredients' && <p>{product.ingredients_bn || 'তথ্য শীঘ্রই যোগ করা হবে।'}</p>}
                {activeTab === 'delivery' && <p>ঢাকার ভিতরে ও সারা বাংলাদেশে ডেলিভারি সুবিধা রয়েছে।</p>}
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-14">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">You may also like</p><h2 className="mt-1 text-2xl font-bold text-ink">Related Products</h2></div>
              <Link to={`/category/${product.category?.slug || ''}`} className="text-sm font-medium text-primary">View all</Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {related.map(item => <ProductCard key={item.id} product={item} />)}
            </div>
          </section>
        )}
      </div>

      {imageZoomOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 p-4 flex items-center justify-center" onClick={() => setImageZoomOpen(false)}>
          <button type="button" onClick={() => setImageZoomOpen(false)} className="absolute top-4 right-4 h-11 w-11 rounded-full bg-white/95 flex items-center justify-center text-ink" aria-label="Close image"><X size={22} /></button>
          <img src={gallery[activeImage]} alt={product.name_bn} className="max-h-[90vh] max-w-[94vw] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
