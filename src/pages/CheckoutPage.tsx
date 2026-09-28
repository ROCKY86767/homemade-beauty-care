import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Tag, X, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import { getSettings, getDeliveryCharge } from '@/lib/settings';
import type { SiteSettings, Coupon } from '@/lib/types';
import SEO from '@/components/SEO';

const DISTRICTS = [
  'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'বরিশাল', 'সিলেট', 'রংপুর', 'ময়মনসিংহ',
  'গাজীপুর', 'নারায়ণগঞ্জ', 'কুমিল্লা', 'নোয়াখালী', 'জামালপুর', 'শেরপুর', 'নেত্রকোনা',
  'বগুড়া', 'দিনাজপুর', 'পাবনা', 'যশোর', 'কুষ্টিয়া', 'মাগুরা', 'ফরিদপুর',
  'মাদারীপুর', 'গোপালগঞ্জ', 'ব্রাহ্মণবাড়িয়া', 'চাঁদপুর', 'লক্ষ্মীপুর', 'ফেনী',
  'খাগড়াছড়ি', 'রাঙ্গামাটি', 'বান্দরবান', 'সাতক্ষীরা', 'মেহেরপুর', 'চুয়াডাঙ্গা',
  'ঝিনাইদহ', 'নড়াইল', 'পিরোজপুর', 'ঝালকাঠি', 'পটুয়াখালী', 'ভোলা', 'বরগুনা',
  'সিরাজগঞ্জ', 'নাটোর', 'চাঁপাইনবাবগঞ্জ', 'পাবনা', 'জয়পুরহাট', 'কুড়িগ্রাম',
  'লালমনিরহাট', 'নীলফামারী', 'গাইবান্ধা', 'ঠাকুরগাঁও', 'পঞ্চগড়', 'হবিগঞ্জ',
  'মৌলভীবাজার', 'সুনামগঞ্জ', 'টাঙ্গাইল', 'কিশোরগঞ্জ', 'মানিকগঞ্জ', 'মুন্সিগঞ্জ',
];

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [form, setForm] = useState({
    name: '', mobile: '', altMobile: '', email: '', district: 'ঢাকা', area: '', address: '', note: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const deliveryCharge = settings
    ? getDeliveryCharge(settings, form.district, subtotal)
    : (subtotal > 1000 ? 0 : 60);

  const discount = appliedCoupon ? calculateCouponDiscount(appliedCoupon, subtotal) : 0;
  const grandTotal = Math.max(0, subtotal + deliveryCharge - discount);

  function calculateCouponDiscount(coupon: Coupon, sub: number): number {
    if (sub < coupon.min_order) return 0;
    let disc = 0;
    if (coupon.discount_type === 'percentage') {
      disc = (sub * coupon.discount_value) / 100;
      if (coupon.max_discount && disc > coupon.max_discount) {
        disc = coupon.max_discount;
      }
    } else {
      disc = coupon.discount_value;
    }
    return Math.min(disc, sub);
  }

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError('');
    setCouponSuccess('');

    const { data: coupon, error: queryError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (queryError || !coupon) {
      setCouponError('কুপন কোড সঠিক নয় বা নষ্ট হয়ে গেছে।');
      setAppliedCoupon(null);
      return;
    }

    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      setCouponError('এই কুপন কোডের মেয়াদ শেষ হয়ে গেছে।');
      setAppliedCoupon(null);
      return;
    }

    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      setCouponError('এই কুপন কোডের ব্যবহারের সীমা শেষ হয়ে গেছে।');
      setAppliedCoupon(null);
      return;
    }

    if (subtotal < coupon.min_order) {
      setCouponError(`এই কুপনের জন্য সর্বনিম্ন অর্ডার ${formatPrice(coupon.min_order)}।`);
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(coupon);
    setCouponSuccess(`কুপন প্রয়োগ করা হয়েছে! আপনি ${formatPrice(calculateCouponDiscount(coupon, subtotal))} ছাড় পাবেন।`);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setCouponSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.mobile || !form.district || !form.area || !form.address) {
      setError('অনুগ্রহ করে সকল প্রয়োজনীয় তথ্য পূরণ করুন।');
      return;
    }
    if (!/^(01)[0-9]{9}$/.test(form.mobile.replace(/\s/g, ''))) {
      setError('সঠিক মোবাইল নম্বর দিন (যেমন: 01999478203)');
      return;
    }
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    setSubmitting(true);

    try {
      // Generate sequential order ID: HBC-000001
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('order_number')
        .order('order_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNum = 1;
      if (lastOrder?.order_number) {
        const match = lastOrder.order_number.match(/HBC-(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      const orderNumber = `HBC-${String(nextNum).padStart(6, '0')}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_name: form.name,
          mobile: form.mobile,
          alt_phone: form.altMobile || null,
          email: form.email || null,
          district: form.district,
          area: form.area,
          address: form.address,
          order_note: form.note || null,
          payment_method: paymentMethod,
          subtotal,
          delivery_charge: deliveryCharge,
          discount,
          grand_total: grandTotal,
          status: 'Pending',
          payment_status: 'Unpaid',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name_bn,
        price: item.product.price,
        quantity: item.quantity,
        image_url: item.product.image_url,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      // Update coupon usage
      if (appliedCoupon) {
        await supabase
          .from('coupons')
          .update({ times_used: appliedCoupon.times_used + 1 })
          .eq('id', appliedCoupon.id);
      }

      // Decrement stock
      for (const item of items) {
        await supabase.rpc('decrement_stock', {
          product_id: item.product.id,
          qty: item.quantity,
        }).then(() => {
          // Fallback if RPC doesn't exist
        });
        // Also do a direct update as fallback
        const { data: prod } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.product.id)
          .maybeSingle();
        if (prod) {
          await supabase
            .from('products')
            .update({ stock: Math.max(0, prod.stock - item.quantity), updated_at: new Date().toISOString() })
            .eq('id', item.product.id);
        }
      }

      clearCart();
      navigate(`/order-success/${orderNumber}`);
    } catch (err) {
      setError('অর্ডার সম্পন্ন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <SEO title="Checkout - Homemade Beauty Care" />
        <h2 className="font-display text-2xl font-bold text-dark mb-2">আপনার কার্ট খালি</h2>
        <p className="text-gray-500 mb-6">অর্ডার করতে প্রথমে কার্টে পণ্য যোগ করুন।</p>
        <Link to="/shop" className="btn-primary">শপ করুন</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <SEO title="Checkout - Homemade Beauty Care" />
      <div className="section-padding py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
          <Link to="/cart" className="hover:text-primary">কার্ট</Link>
          <ChevronRight size={14} />
          <span className="text-ink font-medium">অর্ডার সম্পন্ন করুন</span>
        </div>

        <h1 className="font-display text-3xl font-bold text-dark mb-8">অর্ডার সম্পন্ন করুন</h1>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="card p-6 border border-gray-50">
              <h2 className="font-display text-lg font-semibold text-ink mb-4">আপনার তথ্য</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">পুরো নাম *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="input-field"
                    placeholder="আপনার নাম"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">মোবাইল নম্বর *</label>
                  <input
                    type="tel"
                    required
                    value={form.mobile}
                    onChange={e => setForm({ ...form, mobile: e.target.value })}
                    className="input-field"
                    placeholder="01999478203"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">বিকল্প নম্বর</label>
                  <input
                    type="tel"
                    value={form.altMobile}
                    onChange={e => setForm({ ...form, altMobile: e.target.value })}
                    className="input-field"
                    placeholder="বিকল্প মোবাইল নম্বর"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">ইমেইল</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="input-field"
                    placeholder="আপনার ইমেইল"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">জেলা *</label>
                  <select
                    required
                    value={form.district}
                    onChange={e => setForm({ ...form, district: e.target.value })}
                    className="input-field"
                  >
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">এলাকা/থানা *</label>
                  <input
                    type="text"
                    required
                    value={form.area}
                    onChange={e => setForm({ ...form, area: e.target.value })}
                    className="input-field"
                    placeholder="এলাকার নাম"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-ink mb-1.5 block">সম্পূর্ণ ঠিকানা *</label>
                  <textarea
                    required
                    rows={3}
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    className="input-field resize-none"
                    placeholder="বাসা/হোল্ডিং নম্বর, রোড, থানা/পুলিশ স্টেশন"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-ink mb-1.5 block">অর্ডার নোট</label>
                  <textarea
                    rows={2}
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    className="input-field resize-none"
                    placeholder="অর্ডার সম্পর্কে কোনো বিশেষ নির্দেশনা (ঐচ্ছিক)"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card p-6 border border-gray-50">
              <h2 className="font-display text-lg font-semibold text-ink mb-4">পেমেন্ট মেথড</h2>
              <div className="space-y-3">
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'Cash on Delivery' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'Cash on Delivery'}
                    onChange={() => setPaymentMethod('Cash on Delivery')}
                    className="h-4 w-4 text-primary"
                  />
                  <div>
                    <span className="font-medium text-ink">Cash on Delivery</span>
                    <p className="text-sm text-gray-500">পণ্য হাতে পেয়ে টাকা দিন</p>
                  </div>
                </label>
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'Online Payment' ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'Online Payment'}
                    onChange={() => setPaymentMethod('Online Payment')}
                    className="h-4 w-4 text-primary"
                  />
                  <div>
                    <span className="font-medium text-ink">Online Payment</span>
                    <p className="text-sm text-gray-500">শীঘ্রই আসছে (bKash, Nagad, Card)</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 border border-gray-50 sticky top-44">
              <h2 className="font-display text-lg font-semibold text-ink mb-4">Order Summary</h2>
              <div className="space-y-3 max-h-48 overflow-y-auto pb-4 border-b border-gray-100">
                {items.map(item => (
                  <div key={item.product.id} className="flex gap-3">
                    <img src={item.product.image_url} alt="" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink line-clamp-1">{item.product.name_bn}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-ink">{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="py-4 border-b border-gray-100">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-primary" />
                      <span className="text-sm font-medium text-primary">{appliedCoupon.code}</span>
                    </div>
                    <button type="button" onClick={removeCoupon} className="text-gray-400 hover:text-red-500">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="কুপন কোড"
                    />
                    <button type="submit" className="rounded-lg bg-dark px-4 py-2 text-sm font-medium text-white hover:bg-primary">
                      Apply
                    </button>
                  </form>
                )}
                {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
                {couponSuccess && <p className="text-xs text-primary mt-2 flex items-center gap-1"><CheckCircle2 size={14} /> {couponSuccess}</p>}
              </div>

              <div className="space-y-2 py-4 border-b border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery Charge</span>
                  <span className="font-medium">{deliveryCharge === 0 ? 'Free' : formatPrice(deliveryCharge)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-accent">-{formatPrice(discount)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between pt-4 mb-6">
                <span className="font-display text-lg font-semibold text-ink">Total</span>
                <span className="font-display text-2xl font-bold text-primary">{formatPrice(grandTotal)}</span>
              </div>

              {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {submitting ? 'অর্ডার প্রসেস হচ্ছে...' : 'অর্ডার কনফার্ম করুন'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                বারবার ক্লিক করবেন না — একবার ক্লিক করে অপেক্ষা করুন
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
