import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Tag, X, CheckCircle2 } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import type { Coupon } from '@/lib/types';
import SEO from '@/components/SEO';
import {
  DISTRICTS,
  getThanasByDistrict,
} from '@/data/district-thanas';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    altMobile: '',
    email: '',
    district: 'ঢাকা',
    area: '',
    address: '',
    note: '',
  });

  const [paymentMethod, setPaymentMethod] =
    useState('Cash on Delivery');

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] =
    useState<Coupon | null>(null);

  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /*
   * CURRENT DISTRICT'S THANA / UPAZILA
   */
  const availableThanas = getThanasByDistrict(
    form.district
  );

  /*
   * DELIVERY CHARGE SYSTEM
   */
  const getCheckoutDeliveryCharge = (
    district: string,
    area: string
  ): number => {
    const districtText = district
      .trim()
      .toLowerCase();

    const areaText = area
      .trim()
      .toLowerCase();

    const suburbanAreas = [
      'সাভার',
      'savar',
      'কেরানীগঞ্জ',
      'keraniganj',
      'নবাবগঞ্জ',
      'nawabganj',
    ];

    const isSuburbanArea =
      suburbanAreas.some(item =>
        areaText.includes(item.toLowerCase())
      );

    if (isSuburbanArea) {
      return 100;
    }

    const suburbanDistricts = [
      'গাজীপুর',
      'gazipur',
      'নারায়ণগঞ্জ',
      'নারায়ণগঞ্জ',
      'narayanganj',
    ];

    const isSuburbanDistrict =
      suburbanDistricts.includes(
        districtText
      );

    if (isSuburbanDistrict) {
      return 100;
    }

    if (districtText === 'ঢাকা') {
      return 70;
    }

    return 120;
  };

  const deliveryCharge =
    getCheckoutDeliveryCharge(
      form.district,
      form.area
    );

  /*
   * COUPON DISCOUNT CALCULATION
   */
  function calculateCouponDiscount(
    coupon: Coupon,
    sub: number
  ): number {
    const minimumOrder = Number(
      coupon.minimum_order || 0
    );

    if (sub < minimumOrder) {
      return 0;
    }

    let discountAmount = 0;

    if (
      coupon.discount_type ===
      'percentage'
    ) {
      discountAmount =
        (sub *
          Number(
            coupon.discount_value || 0
          )) /
        100;

      if (
        coupon.maximum_discount != null &&
        discountAmount >
          Number(
            coupon.maximum_discount
          )
      ) {
        discountAmount = Number(
          coupon.maximum_discount
        );
      }
    } else {
      discountAmount = Number(
        coupon.discount_value || 0
      );
    }

    return Math.min(
      discountAmount,
      sub
    );
  }

  const discount = appliedCoupon
    ? calculateCouponDiscount(
        appliedCoupon,
        subtotal
      )
    : 0;

  const grandTotal = Math.max(
    0,
    subtotal +
      deliveryCharge -
      discount
  );

  /*
   * APPLY COUPON
   */
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError(
        'কুপন কোড লিখুন।'
      );
      setCouponSuccess('');
      return;
    }

    setCouponError('');
    setCouponSuccess('');

    const {
      data: coupon,
      error: queryError,
    } = await supabase
      .from('coupons')
      .select('*')
      .eq(
        'code',
        couponCode
          .trim()
          .toUpperCase()
      )
      .eq('is_active', true)
      .maybeSingle();

    if (queryError) {
      setCouponError(
        'কুপন যাচাই করতে সমস্যা হয়েছে।'
      );
      setAppliedCoupon(null);
      return;
    }

    if (!coupon) {
      setCouponError(
        'কুপন কোড সঠিক নয় বা বর্তমানে সক্রিয় নয়।'
      );
      setAppliedCoupon(null);
      return;
    }

    /*
     * Start date
     */
    if (
      coupon.starts_at &&
      new Date(coupon.starts_at) >
        new Date()
    ) {
      setCouponError(
        'এই কুপনটি এখনো চালু হয়নি।'
      );
      setAppliedCoupon(null);
      return;
    }

    /*
     * Expiry date
     */
    if (
      coupon.expires_at &&
      new Date(coupon.expires_at) <
        new Date()
    ) {
      setCouponError(
        'এই কুপন কোডের মেয়াদ শেষ হয়ে গেছে।'
      );
      setAppliedCoupon(null);
      return;
    }

    /*
     * Usage limit
     */
    if (
      coupon.usage_limit != null &&
      Number(
        coupon.used_count || 0
      ) >=
        Number(
          coupon.usage_limit
        )
    ) {
      setCouponError(
        'এই কুপন কোডের ব্যবহারের সীমা শেষ হয়ে গেছে।'
      );
      setAppliedCoupon(null);
      return;
    }

    /*
     * Minimum order
     */
    if (
      subtotal <
      Number(
        coupon.minimum_order || 0
      )
    ) {
      setCouponError(
        `এই কুপনের জন্য সর্বনিম্ন অর্ডার ${formatPrice(
          Number(
            coupon.minimum_order || 0
          )
        )}।`
      );
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(coupon);

    const couponDiscount =
      calculateCouponDiscount(
        coupon,
        subtotal
      );

    setCouponSuccess(
      `কুপন প্রয়োগ করা হয়েছে! আপনি ${formatPrice(
        couponDiscount
      )} ছাড় পাবেন।`
    );
  };

  /*
   * REMOVE COUPON
   */
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setCouponSuccess('');
  };

  /*
   * CHANGE DISTRICT
   */
  const handleDistrictChange = (
    district: string
  ) => {
    setForm({
      ...form,
      district,
      area: '',
    });
  };

  /*
   * SUBMIT ORDER
   */
  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');

    if (
      !form.name ||
      !form.mobile ||
      !form.district ||
      !form.area ||
      !form.address
    ) {
      setError(
        'অনুগ্রহ করে সকল প্রয়োজনীয় তথ্য পূরণ করুন।'
      );
      return;
    }

    if (
      !/^(01)[0-9]{9}$/.test(
        form.mobile.replace(/\s/g, '')
      )
    ) {
      setError(
        'সঠিক মোবাইল নম্বর দিন (যেমন: 01*********)'
      );
      return;
    }

    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    setSubmitting(true);

    try {
      /*
       * Generate Order Number
       */
      const {
        data: lastOrder,
      } = await supabase
        .from('orders')
        .select('order_number')
        .order(
          'order_number',
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      let nextNum = 1;

      if (
        lastOrder?.order_number
      ) {
        const match =
          lastOrder.order_number.match(
            /HBC-(\d+)/
          );

        if (match) {
          nextNum =
            parseInt(
              match[1],
              10
            ) + 1;
        }
      }

      const orderNumber =
        `HBC-${String(
          nextNum
        ).padStart(6, '0')}`;

      /*
       * Create Order
       */
      const {
        data: order,
        error: orderError,
      } = await supabase
        .from('orders')
        .insert({
          order_number:
            orderNumber,

          customer_name:
            form.name,

          mobile:
            form.mobile,

          alt_phone:
            form.altMobile ||
            null,

          email:
            form.email ||
            null,

          district:
            form.district,

          area:
            form.area,

          address:
            form.address,

          order_note:
            form.note ||
            null,

          payment_method:
            paymentMethod,

          subtotal,

          delivery_charge:
            deliveryCharge,

          discount,

          grand_total:
            grandTotal,

          status:
            'Pending',

          payment_status:
            'Unpaid',
        })
        .select()
        .single();

      if (orderError) {
        throw orderError;
      }

      /*
       * Create Order Items
       */
      const orderItems =
        items.map(item => ({
          order_id:
            order.id,

          product_id:
            item.product.id,

          product_name:
            item.product.name_bn,

          price:
            item.product.price,

          quantity:
            item.quantity,

          image_url:
            item.product.image_url,
        }));

      const {
        error: itemsError,
      } = await supabase
        .from('order_items')
        .insert(
          orderItems
        );

      if (itemsError) {
        throw itemsError;
      }

      /*
       * SECURE COUPON USAGE
       *
       * Coupon থাকলে secure RPC-এর মাধ্যমে
       * used_count একবার বাড়ানো হবে।
       */
      if (appliedCoupon) {
        const {
          data: couponResult,
          error: couponUsageError,
        } = await supabase.rpc(
          'use_coupon',
          {
            p_coupon_id:
              appliedCoupon.id,
          }
        );

        if (couponUsageError) {
          console.error(
            'Coupon usage RPC error:',
            couponUsageError
          );

          throw new Error(
            'কুপনের ব্যবহার গণনা করতে সমস্যা হয়েছে।'
          );
        }

        if (
          !couponResult?.success
        ) {
          console.error(
            'Coupon usage rejected:',
            couponResult
          );

          throw new Error(
            couponResult?.message ||
              'কুপন ব্যবহার করা যায়নি।'
          );
        }
      }

      /*
       * DECREASE STOCK
       *
       * গুরুত্বপূর্ণ:
       * Stock শুধুমাত্র secure RPC-এর মাধ্যমে
       * একবার কমানো হবে।
       *
       * এখানে আর দ্বিতীয়বার products.update()
       * করা হচ্ছে না।
       */
      for (const item of items) {
        const {
          error: stockError,
        } = await supabase.rpc(
          'decrement_stock',
          {
            product_id:
              item.product.id,

            qty:
              item.quantity,
          }
        );

        if (stockError) {
          console.error(
            'Stock decrement error:',
            stockError
          );

          throw new Error(
            'পণ্যের stock update করতে সমস্যা হয়েছে।'
          );
        }
      }

      /*
       * Complete
       */
      clearCart();

      navigate(
        `/order-success/${orderNumber}`
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'অর্ডার সম্পন্ন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
      );

      setSubmitting(false);
    }
  };

  /*
   * EMPTY CART
   */
  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <SEO title="Checkout - Homemade Beauty Care" />

        <h2 className="font-display text-2xl font-bold text-dark mb-2">
          আপনার কার্ট খালি
        </h2>

        <p className="text-gray-500 mb-6">
          অর্ডার করতে প্রথমে কার্টে পণ্য যোগ করুন।
        </p>

        <Link
          to="/shop"
          className="btn-primary"
        >
          শপ করুন
        </Link>
      </div>
    );
  }

  /*
   * CHECKOUT PAGE
   */
  return (
    <div className="min-h-screen bg-cream">
      <SEO title="Checkout - Homemade Beauty Care" />

      <div className="section-padding py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
          <Link
            to="/cart"
            className="hover:text-primary"
          >
            কার্ট
          </Link>

          <ChevronRight size={14} />

          <span className="text-ink font-medium">
            অর্ডার সম্পন্ন করুন
          </span>
        </div>

        <h1 className="font-display text-3xl font-bold text-dark mb-8">
          অর্ডার সম্পন্ন করুন
        </h1>

        <form
          onSubmit={handleSubmit}
          className="grid lg:grid-cols-3 gap-6"
        >

          {/* LEFT SIDE */}
          <div className="lg:col-span-2 space-y-6">

            {/* Customer Information */}
            <div className="card p-6 border border-gray-50">

              <h2 className="font-display text-lg font-semibold text-ink mb-4">
                আপনার তথ্য
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">

                {/* Name */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    পুরো নাম *
                  </label>

                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e =>
                      setForm({
                        ...form,
                        name:
                          e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="আপনার নাম"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    মোবাইল নম্বর *
                  </label>

                  <input
                    type="tel"
                    required
                    value={form.mobile}
                    onChange={e =>
                      setForm({
                        ...form,
                        mobile:
                          e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="01999478203"
                  />
                </div>

                {/* Alternative Mobile */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    বিকল্প নম্বর
                  </label>

                  <input
                    type="tel"
                    value={
                      form.altMobile
                    }
                    onChange={e =>
                      setForm({
                        ...form,
                        altMobile:
                          e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="বিকল্প মোবাইল নম্বর"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    ইমেইল
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={e =>
                      setForm({
                        ...form,
                        email:
                          e.target.value,
                      })
                    }
                    className="input-field"
                    placeholder="আপনার ইমেইল"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    জেলা *
                  </label>

                  <select
                    required
                    value={
                      form.district
                    }
                    onChange={e =>
                      handleDistrictChange(
                        e.target.value
                      )
                    }
                    className="input-field"
                  >
                    {DISTRICTS.map(
                      district => (
                        <option
                          key={
                            district
                          }
                          value={
                            district
                          }
                        >
                          {district}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Thana / Upazila */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    থানা / উপজেলা *
                  </label>

                  <select
                    required
                    value={form.area}
                    onChange={e =>
                      setForm({
                        ...form,
                        area:
                          e.target.value,
                      })
                    }
                    className="input-field"
                  >
                    <option value="">
                      থানা / উপজেলা নির্বাচন করুন
                    </option>

                    {availableThanas.map(
                      thana => (
                        <option
                          key={thana}
                          value={thana}
                        >
                          {thana}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    সম্পূর্ণ ঠিকানা *
                  </label>

                  <textarea
                    required
                    rows={3}
                    value={
                      form.address
                    }
                    onChange={e =>
                      setForm({
                        ...form,
                        address:
                          e.target.value,
                      })
                    }
                    className="input-field resize-none"
                    placeholder="বাসা/হোল্ডিং নম্বর, রোড, মহল্লা/গ্রাম, বিস্তারিত ঠিকানা"
                  />
                </div>

                {/* Note */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    অর্ডার নোট
                  </label>

                  <textarea
                    rows={2}
                    value={form.note}
                    onChange={e =>
                      setForm({
                        ...form,
                        note:
                          e.target.value,
                      })
                    }
                    className="input-field resize-none"
                    placeholder="অর্ডার সম্পর্কে কোনো বিশেষ নির্দেশনা (ঐচ্ছিক)"
                  />
                </div>

              </div>
            </div>

            {/* Payment */}
            <div className="card p-6 border border-gray-50">

              <h2 className="font-display text-lg font-semibold text-ink mb-4">
                পেমেন্ট মেথড
              </h2>

              <div className="space-y-3">

                {/* COD */}
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod ===
                    'Cash on Delivery'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={
                      paymentMethod ===
                      'Cash on Delivery'
                    }
                    onChange={() =>
                      setPaymentMethod(
                        'Cash on Delivery'
                      )
                    }
                    className="h-4 w-4 text-primary"
                  />

                  <div>
                    <span className="font-medium text-ink">
                      Cash on Delivery
                    </span>

                    <p className="text-sm text-gray-500">
                      পণ্য হাতে পেয়ে টাকা দিন
                    </p>
                  </div>
                </label>

                {/* Online Payment */}
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod ===
                    'Online Payment'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={
                      paymentMethod ===
                      'Online Payment'
                    }
                    onChange={() =>
                      setPaymentMethod(
                        'Online Payment'
                      )
                    }
                    className="h-4 w-4 text-primary"
                  />

                  <div>
                    <span className="font-medium text-ink">
                      Online Payment
                    </span>

                    <p className="text-sm text-gray-500">
                      শীঘ্রই আসছে (bKash, Nagad, Card)
                    </p>
                  </div>
                </label>

              </div>
            </div>

          </div>

          {/* RIGHT SIDE */}
          <div className="lg:col-span-1">

            <div className="card p-6 border border-gray-50 sticky top-44">

              <h2 className="font-display text-lg font-semibold text-ink mb-4">
                Order Summary
              </h2>

              {/* Products */}
              <div className="space-y-3 max-h-48 overflow-y-auto pb-4 border-b border-gray-100">

                {items.map(item => (
                  <div
                    key={
                      item.product.id
                    }
                    className="flex gap-3"
                  >
                    <img
                      src={
                        item.product
                          .image_url
                      }
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink line-clamp-1">
                        {
                          item.product
                            .name_bn
                        }
                      </p>

                      <p className="text-xs text-gray-400">
                        Qty:{' '}
                        {item.quantity}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-ink">
                      {formatPrice(
                        item.product
                          .price *
                          item.quantity
                      )}
                    </span>
                  </div>
                ))}

              </div>

              {/* Coupon */}
              <div className="py-4 border-b border-gray-100">

                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3">

                    <div className="flex items-center gap-2">

                      <Tag
                        size={16}
                        className="text-primary"
                      />

                      <span className="text-sm font-medium text-primary">
                        {
                          appliedCoupon.code
                        }
                      </span>

                    </div>

                    <button
                      type="button"
                      onClick={
                        removeCoupon
                      }
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>

                  </div>
                ) : (
                  <div className="flex gap-2">

                    <input
                      type="text"
                      value={
                        couponCode
                      }
                      onChange={e =>
                        setCouponCode(
                          e.target.value
                        )
                      }
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="কুপন কোড"
                    />

                    <button
                      type="button"
                      onClick={
                        handleApplyCoupon
                      }
                      className="rounded-lg bg-dark px-4 py-2 text-sm font-medium text-white hover:bg-primary"
                    >
                      Apply
                    </button>

                  </div>
                )}

                {couponError && (
                  <p className="text-xs text-red-500 mt-2">
                    {couponError}
                  </p>
                )}

                {couponSuccess && (
                  <p className="text-xs text-primary mt-2 flex items-center gap-1">
                    <CheckCircle2
                      size={14}
                    />

                    {couponSuccess}
                  </p>
                )}

              </div>

              {/* Price Summary */}
              <div className="space-y-2 py-4 border-b border-gray-100">

                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Subtotal
                  </span>

                  <span className="font-medium">
                    {formatPrice(
                      subtotal
                    )}
                  </span>
                </div>

                {/* Delivery */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Delivery Charge
                  </span>

                  <span className="font-medium">
                    {formatPrice(
                      deliveryCharge
                    )}
                  </span>
                </div>

                {/* Discount */}
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">
                      Discount
                    </span>

                    <span className="font-medium text-accent">
                      -
                      {formatPrice(
                        discount
                      )}
                    </span>
                  </div>
                )}

              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center py-5">

                <span className="font-display text-lg font-bold text-dark">
                  মোট
                </span>

                <span className="font-display text-2xl font-bold text-primary">
                  {formatPrice(
                    grandTotal
                  )}
                </span>

              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 text-red-600 text-sm px-4 py-3 mb-4">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {submitting
                  ? 'অর্ডার প্রসেস হচ্ছে...'
                  : 'অর্ডার কনফার্ম করুন'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                অর্ডার কনফার্ম করার মাধ্যমে আপনি আমাদের
                শর্তাবলীতে সম্মত হচ্ছেন।
              </p>

            </div>
          </div>

        </form>

      </div>
    </div>
  );
}