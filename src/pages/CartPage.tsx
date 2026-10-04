import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { formatPrice } from '@/lib/format';
import { getSettings, getDeliveryCharge } from '@/lib/settings';
import type { SiteSettings } from '@/lib/types';
import { useEffect, useState } from 'react';
import SEO from '@/components/SEO';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, subtotal } = useCart();
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const deliveryCharge = settings
    ? getDeliveryCharge(settings, 'ঢাকা', subtotal)
    : (subtotal > 1000 ? 0 : 60);
  const grandTotal = subtotal + deliveryCharge;

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <SEO title="কার্ট - Homemade Beauty Care" />
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-cream mb-6">
          <ShoppingBag size={40} className="text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold text-dark mb-2">Your Cart খালি</h2>
        <p className="text-gray-500 mb-6">এখনো কোনো পণ্য কার্টে যোগ করেননি।</p>
        <Link to="/shop" className="btn-primary">শপ করুন</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <SEO title="কার্ট - Homemade Beauty Care" />
      <div className="section-padding py-8">
        <h1 className="font-display text-3xl font-bold text-dark mb-8">Your Cart</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => (
              <div key={item.product.id} className="card p-4 flex gap-4 border border-gray-50">
                <Link to={`/product/${item.product.slug}`} className="shrink-0">
                  <img
                    src={item.product.image_url}
                    alt={item.product.name_bn}
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${item.product.slug}`}>
                    <h3 className="font-display text-base font-semibold text-ink hover:text-primary line-clamp-1">
                      {item.product.name_bn}
                    </h3>
                  </Link>
                  {item.product.short_description_bn && (
                    <p className="text-sm text-gray-400 line-clamp-1 mt-0.5">
                      {item.product.short_description_bn}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-ink">{formatPrice(item.product.price)}</span>
                    {item.product.old_price && item.product.old_price > item.product.price && (
                      <span className="text-sm text-gray-400 line-through">{formatPrice(item.product.old_price)}</span>
                    )}
                  </div>
                  {item.quantity >= item.product.stock && (
                    <p className="text-xs text-accent mt-1">সর্বোচ্চ স্টক পর্যন্ত যোগ করা হয়েছে</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center rounded-full border border-gray-200">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center text-ink hover:text-primary"
                        aria-label="Decrease"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, Math.min(item.product.stock, item.quantity + 1))}
                        disabled={item.quantity >= item.product.stock}
                        className="flex h-8 w-8 items-center justify-center text-ink hover:text-primary disabled:opacity-30"
                        aria-label="Increase"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      aria-label="Remove"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-gray-400">Subtotal</p>
                  <p className="text-lg font-bold text-ink">{formatPrice(item.product.price * item.quantity)}</p>
                </div>
              </div>
            ))}

            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:gap-3 transition-all"
            >
              <ArrowRight size={16} className="rotate-180" /> Continue Shopping
            </Link>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 border border-gray-50 sticky top-44">
              <h2 className="font-display text-lg font-semibold text-ink mb-4">Order Summary</h2>
              <div className="space-y-3 pb-4 border-b border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-ink">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery Charge</span>
                  <span className="font-medium text-ink">
                    {deliveryCharge === 0 ? 'Free' : formatPrice(deliveryCharge)}
                  </span>
                </div>
                {deliveryCharge === 0 && subtotal > 0 && settings && (
                  <p className="text-xs text-primary">৳{settings.free_delivery_threshold.toLocaleString('en-US')}+ অর্ডারে ফ্রি ডেলিভারি!</p>
                )}
              </div>
              <div className="flex justify-between pt-4 mb-6">
                <span className="font-display text-lg font-semibold text-ink">Grand Total</span>
                <span className="font-display text-2xl font-bold text-primary">{formatPrice(grandTotal)}</span>
              </div>
              <Link to="/checkout" className="btn-primary w-full">
                Checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
