import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Tag,
  X,
  CheckCircle2,
  MapPin,
  Plus,
} from 'lucide-react';

import { useCart } from '@/lib/cart-context';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import { getSettings, getDeliveryCharge } from '@/lib/settings';
import {
  getDistricts,
  getThanas,
  DHAKA_CITY_THANAS,
} from '@/lib/bangladeshLocations';

import type {
  SiteSettings,
  Coupon,
} from '@/lib/types';

import SEO from '@/components/SEO';



type SavedAddress = {
  id: string;
  user_id: string;
  mobile: string;
  name: string;
  alt_mobile: string | null;
  email: string | null;
  district: string;
  area: string;
  address: string;
  is_default: boolean;
};

export default function CheckoutPage() {
  const {
    items,
    subtotal,
    clearCart,
  } = useCart();

  const navigate = useNavigate();

  const [settings, setSettings] =
    useState<SiteSettings | null>(null);

  const [districts, setDistricts] =
    useState<{ id: string; name: string; bn_name: string }[]>([]);

  const [thanas, setThanas] =
    useState<{ id: string; name: string; bn_name: string }[]>([]);

  const [locationLoading, setLocationLoading] =
    useState(true);

  const [userId, setUserId] =
    useState<string | null>(null);

  const [accountEmail, setAccountEmail] =
    useState('');

  const [accountLoading, setAccountLoading] =
    useState(true);

  const [savedAddresses, setSavedAddresses] =
    useState<SavedAddress[]>([]);

  const [savedAddressLoading, setSavedAddressLoading] =
    useState(false);

  const [selectedAddressId, setSelectedAddressId] =
    useState('');

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

  const [couponCode, setCouponCode] =
    useState('');

  const [appliedCoupon, setAppliedCoupon] =
    useState<Coupon | null>(null);

  const [couponError, setCouponError] =
    useState('');

  const [couponSuccess, setCouponSuccess] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    getSettings().then(setSettings);
    getDistricts().then(data => {
      setDistricts(data);
      const dhaka = data.find(item => item.bn_name === 'ঢাকা');
      setForm(prev => ({
        ...prev,
        district: dhaka?.bn_name || prev.district,
        area: '',
      }));
      setLocationLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!form.district || districts.length === 0) return;
    const selected = districts.find(item => item.bn_name === form.district);
    if (!selected) return;
    getThanas(selected.id).then(data => {
      const locationList =
        form.district === 'ঢাকা'
          ? [
              ...DHAKA_CITY_THANAS.map((name, index) => ({
                id: `dhaka-city-${index}`,
                name,
                bn_name: name,
              })),
              ...data,
            ]
          : data;

      setThanas(locationList);

      if (!locationList.some(item => item.bn_name === form.area)) {
        setForm(prev => ({ ...prev, area: '' }));
      }
    });
  }, [form.district, districts]);

  useEffect(() => {
    async function loadAccount() {
      setAccountLoading(true);

      const { data } =
        await supabase.auth.getSession();

      const session = data.session;

      if (session?.user) {
        setUserId(session.user.id);

        const email =
          session.user.email || '';

        setAccountEmail(email);

        setForm(prev => ({
          ...prev,
          email,
        }));
      } else {
        setUserId(null);
        setAccountEmail('');
      }

      setAccountLoading(false);
    }

    loadAccount();
  }, []);

  async function loadSavedAddresses(
    mobile: string,
    activeUserId: string
  ) {
    const cleanMobile =
      mobile.replace(/\s/g, '').trim();

    if (!cleanMobile) {
      setSavedAddresses([]);
      return;
    }

    setSavedAddressLoading(true);

    const { data, error: addressError } =
      await supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', activeUserId)
        .eq('mobile', cleanMobile)
        .order('is_default', {
          ascending: false,
        })
        .order('created_at', {
          ascending: false,
        });

    if (addressError) {
      console.error(addressError);
      setSavedAddresses([]);
    } else {
      setSavedAddresses(
        (data || []) as SavedAddress[]
      );
    }

    setSavedAddressLoading(false);
  }

  useEffect(() => {
    if (!userId) {
      setSavedAddresses([]);
      return;
    }

    const cleanMobile =
      form.mobile.replace(/\s/g, '').trim();

    if (!/^(01)[0-9]{9}$/.test(cleanMobile)) {
      setSavedAddresses([]);
      return;
    }

    loadSavedAddresses(
      cleanMobile,
      userId
    );
  }, [form.mobile, userId]);

  function applySavedAddress(
    savedAddress: SavedAddress
  ) {
    if (
      !userId ||
      savedAddress.user_id !== userId
    ) {
      return;
    }

    setSelectedAddressId(
      savedAddress.id
    );

    setForm(prev => ({
      ...prev,
      name: savedAddress.name,
      mobile: savedAddress.mobile,
      altMobile:
        savedAddress.alt_mobile || '',
      email:
        accountEmail ||
        savedAddress.email ||
        '',
      district: savedAddress.district,
      area: savedAddress.area,
      address: savedAddress.address,
    }));
  }

  async function saveCustomerAddress() {
    if (!userId) {
      return;
    }

    const cleanMobile =
      form.mobile.replace(/\s/g, '').trim();

    if (
      !form.name ||
      !cleanMobile ||
      !form.district ||
      !form.area ||
      !form.address
    ) {
      return;
    }

    if (
      !/^(01)[0-9]{9}$/.test(cleanMobile)
    ) {
      return;
    }

    const { data: existing } =
      await supabase
        .from('customer_addresses')
        .select('id')
        .eq('user_id', userId)
        .eq('mobile', cleanMobile)
        .eq('district', form.district)
        .eq('area', form.area)
        .eq('address', form.address)
        .maybeSingle();

    if (existing) {
      setSelectedAddressId(existing.id);
      return;
    }

    const { data, error: insertError } =
      await supabase
        .from('customer_addresses')
        .insert({
          user_id: userId,
          mobile: cleanMobile,
          name: form.name,
          alt_mobile:
            form.altMobile || null,
          email:
            accountEmail || null,
          district: form.district,
          area: form.area,
          address: form.address,
          is_default:
            savedAddresses.length === 0,
        })
        .select()
        .single();

    if (insertError) {
      console.error(insertError);
      return;
    }

    if (data) {
      setSavedAddresses(prev => [
        data as SavedAddress,
        ...prev,
      ]);

      setSelectedAddressId(data.id);
    }
  }

  function calculateCouponDiscount(
    coupon: any,
    sub: number
  ): number {
    const minimumOrder =
      Number(coupon.minimum_order || 0);

    if (sub < minimumOrder) {
      return 0;
    }

    let disc = 0;

    if (
      coupon.discount_type ===
      'percentage'
    ) {
      disc =
        (sub *
          Number(
            coupon.discount_value || 0
          )) /
        100;

      if (
        coupon.maximum_discount != null &&
        disc >
          Number(coupon.maximum_discount)
      ) {
        disc =
          Number(coupon.maximum_discount);
      }
    } else {
      disc = Number(
        coupon.discount_value || 0
      );
    }

    return Math.min(disc, sub);
  }

  const deliveryCharge = settings
    ? getDeliveryCharge(
        settings,
        form.district,
        subtotal,
        form.area
      )
    : 120;

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

    const { data: coupon, error: queryError } =
      await supabase
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

    if (
      coupon.usage_limit != null &&
      Number(coupon.used_count || 0) >=
        Number(coupon.usage_limit)
    ) {
      setCouponError(
        'এই কুপন কোডের ব্যবহারের সীমা শেষ হয়ে গেছে।'
      );

      setAppliedCoupon(null);

      return;
    }

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

    const couponDiscount =
      calculateCouponDiscount(
        coupon,
        subtotal
      );

    if (couponDiscount <= 0) {
      setCouponError(
        'এই অর্ডারে কুপনটি প্রযোজ্য নয়।'
      );

      setAppliedCoupon(null);

      return;
    }

    setAppliedCoupon(coupon);

    setCouponSuccess(
      `কুপন প্রয়োগ করা হয়েছে! আপনি ${formatPrice(
        couponDiscount
      )} ছাড় পাবেন।`
    );
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setCouponSuccess('');
  };

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');

    const cleanMobile =
      form.mobile.replace(/\s/g, '').trim();

    if (
      !form.name ||
      !cleanMobile ||
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
        cleanMobile
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

    if (
      paymentMethod ===
      'Online Payment'
    ) {
      setError(
        'Online Payment এখনো চালু হয়নি। Cash on Delivery নির্বাচন করুন।'
      );

      return;
    }

    setSubmitting(true);

    try {
      /*
       * Secure Order ID
       *
       * Database sequence/function থেকে
       * Order ID তৈরি হবে।
       *
       * Example:
       * HBC-000007
       * HBC-000008
       */
      const {
        data: generatedOrderNumber,
        error: orderNumberError,
      } = await supabase.rpc(
        'generate_order_number'
      );

      if (
        orderNumberError ||
        !generatedOrderNumber
      ) {
        throw new Error(
          'Order number generation failed.'
        );
      }

      const orderNumber =
        generatedOrderNumber;

      /*
       * Create order
       */
      const { data: order, error: orderError } =
        await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            user_id: userId || null,

            customer_name: form.name,
            mobile: cleanMobile,
            alt_phone:
              form.altMobile || null,

            email:
              userId
                ? accountEmail || null
                : form.email || null,

            district: form.district,
            area: form.area,
            address: form.address,

            order_note:
              form.note || null,

            payment_method:
              paymentMethod,

            subtotal,

            delivery_charge:
              deliveryCharge,

            discount,

            grand_total:
              grandTotal,

            status: 'Pending',
            payment_status: 'Unpaid',
          })
          .select()
          .single();

      if (orderError) {
        throw orderError;
      }

      /*
       * Create order items
       */
      const orderItems = items.map(
        item => ({
          order_id: order.id,
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
        })
      );

      const {
        error: itemsError,
      } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        throw itemsError;
      }

      /*
       * Coupon usage
       */
      if (appliedCoupon) {
        const {
          data: couponUsage,
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
            'Coupon usage update failed:',
            couponUsageError
          );
        } else if (
          couponUsage &&
          couponUsage.success === false
        ) {
          console.error(
            'Coupon usage rejected:',
            couponUsage.message
          );
        }
      }

      /*
       * Decrement stock
       *
       * Direct products.update()
       * করা হচ্ছে না।
       *
       * শুধুমাত্র secure RPC ব্যবহার করা হচ্ছে।
       */
      for (const item of items) {
        const {
          error: stockError,
        } = await supabase.rpc(
          'decrement_stock',
          {
            product_id:
              item.product.id,
            qty: item.quantity,
          }
        );

        if (stockError) {
          console.error(
            'Stock decrement failed:',
            stockError
          );
        }
      }

      /*
       * Save customer address
       *
       * Logged-in customer হলে
       * address account-এর সাথে save হবে।
       */
      if (userId) {
        await saveCustomerAddress();
      }

      clearCart();

      navigate(
        `/order-success/${orderNumber}`
      );
    } catch (err) {
      console.error('Checkout order creation failed:', err);

      const message =
        err instanceof Error
          ? err.message
          : 'Unknown checkout error';

      setError(
        `অর্ডার সম্পন্ন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন। (${message})`
      );

      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <SEO title="Checkout - Homemade Beauty Care" />

        <h2 className="font-display text-2xl font-bold text-dark mb-2">
          আপনার কার্ট খালি
        </h2>

        <p className="text-gray-500 mb-6 text-center">
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

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">

            {/* Customer Info */}
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
                    value={form.altMobile}
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
                    readOnly={!!userId}
                    onChange={e =>
                      setForm({
                        ...form,
                        email:
                          e.target.value,
                      })
                    }
                    className={`input-field ${
                      userId
                        ? 'bg-gray-50'
                        : ''
                    }`}
                    placeholder="আপনার ইমেইল"
                  />

                  {userId && (
                    <p className="text-xs text-gray-400 mt-1">
                      আপনার verified account email
                    </p>
                  )}
                </div>

                {/* District */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    জেলা *
                  </label>

                  <select
                    required
                    value={form.district}
                    disabled={locationLoading}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        district: e.target.value,
                        area: '',
                      }))
                    }
                    className="input-field"
                  >
                    {districts.length === 0 && (
                      <option value="ঢাকা">ঢাকা</option>
                    )}
                    {districts.map(district => (
                      <option
                        key={district.id}
                        value={district.bn_name}
                      >
                        {district.bn_name}
                      </option>
                    ))}
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
                    disabled={locationLoading || thanas.length === 0}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        area: e.target.value,
                      }))
                    }
                    className="input-field"
                  >
                    <option value="">
                      {locationLoading
                        ? 'লোকেশন লোড হচ্ছে...'
                        : thanas.length === 0
                          ? 'থানা/উপজেলা পাওয়া যায়নি'
                          : 'থানা / উপজেলা নির্বাচন করুন'}
                    </option>
                    {thanas.map(thana => (
                      <option
                        key={thana.id}
                        value={thana.bn_name}
                      >
                        {thana.bn_name}
                      </option>
                    ))}
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
                    value={form.address}
                    onChange={e =>
                      setForm({
                        ...form,
                        address:
                          e.target.value,
                      })
                    }
                    className="input-field resize-none"
                    placeholder="বাসা/হোল্ডিং নম্বর, রোড, থানা/পুলিশ স্টেশন"
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

            {/* Saved Addresses */}
            {userId && (
              <div className="card p-6 border border-gray-50">

                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-ink">
                      Saved Addresses
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                      এই account-এর saved address
                    </p>
                  </div>

                  <MapPin
                    size={20}
                    className="text-primary"
                  />
                </div>

                {savedAddressLoading ? (
                  <p className="text-sm text-gray-400">
                    Address খোঁজা হচ্ছে...
                  </p>
                ) : savedAddresses.length > 0 ? (
                  <div className="space-y-3">

                    {savedAddresses.map(
                      savedAddress => (
                        <button
                          key={
                            savedAddress.id
                          }
                          type="button"
                          onClick={() =>
                            applySavedAddress(
                              savedAddress
                            )
                          }
                          className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                            selectedAddressId ===
                            savedAddress.id
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">

                            <div>
                              <p className="font-medium text-ink">
                                {
                                  savedAddress.name
                                }
                              </p>

                              <p className="text-sm text-gray-500 mt-1">
                                {
                                  savedAddress.mobile
                                }
                              </p>

                              <p className="text-sm text-gray-500 mt-1">
                                {
                                  savedAddress.area
                                }
                                ,{' '}
                                {
                                  savedAddress.district
                                }
                              </p>

                              <p className="text-sm text-gray-500 mt-1">
                                {
                                  savedAddress.address
                                }
                              </p>
                            </div>

                            {savedAddress.is_default && (
                              <span className="shrink-0 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">
                                Default
                              </span>
                            )}

                          </div>
                        </button>
                      )
                    )}

                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">
                      এই মোবাইল নম্বরের কোনো saved address পাওয়া যায়নি।
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <Plus size={14} />
                  অর্ডার করার সময় নতুন address account-এর সাথে save হবে।
                </div>

              </div>
            )}

            {/* Guest Address Notice */}
            {!accountLoading &&
              !userId && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm text-gray-600">
                    Saved Address ব্যবহার করতে{' '}
                    <Link
                      to="/login"
                      className="font-semibold text-primary hover:underline"
                    >
                      Login করুন
                    </Link>
                    ।
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    Login না করেও Guest Checkout করা যাবে।
                  </p>
                </div>
              )}

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

                {/* Online */}
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

          {/* RIGHT */}
          <div className="lg:col-span-1">

            <div className="card p-6 border border-gray-50 sticky top-44">

              <h2 className="font-display text-lg font-semibold text-ink mb-4">
                Order Summary
              </h2>

              {/* Products */}
              <div className="space-y-3 max-h-48 overflow-y-auto pb-4 border-b border-gray-100">

                {items.map(item => (
                  <div
                    key={item.product.id}
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
                        Qty: {item.quantity}
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
                      value={couponCode}
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

              {/* Summary */}
              <div className="space-y-2 py-4 border-b border-gray-100">

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

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Delivery Charge
                  </span>

                  <span className="font-medium">
                    {deliveryCharge ===
                    0
                      ? 'Free'
                      : formatPrice(
                          deliveryCharge
                        )}
                  </span>
                </div>

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

              {/* Total */}
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