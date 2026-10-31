import { PackageCheck, Box, Truck, MapPinCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Tag,
  X,
  CheckCircle2,
  MapPin,
  Plus,
  Minus,
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
  Product,
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
    updateQuantity,
    syncCartProducts,
  } = useCart();

  const navigate = useNavigate();
  const checkoutEventSent = useRef(false);
  // Synchronous guard prevents two submit events before React can re-render.
  const submitLockRef = useRef(false);
  const [isBangla, setIsBangla] = useState(false);
  const t = (english: string, bangla: string) => isBangla ? bangla : english;

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

  const [termsAccepted, setTermsAccepted] = useState(false);

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
    try {
      const fbq = (window as Window & { fbq?: (...args: any[]) => void }).fbq;
      if (fbq && items.length > 0 && !checkoutEventSent.current) {
        fbq('track', 'InitiateCheckout', {
          content_ids: items.map(item => item.product.id),
          content_type: 'product',
          value: Number(subtotal),
          currency: 'BDT',
          num_items: items.reduce((total, item) => total + item.quantity, 0),
        });
        checkoutEventSent.current = true;
      }
    } catch (error) {
      console.error('Meta Pixel InitiateCheckout error:', error);
    }
  }, [items, subtotal]);

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
    ? (settings.free_delivery_enabled && subtotal >= Number(settings.free_delivery_minimum || 0)
        ? 0
        : getDeliveryCharge(settings, form.district, subtotal, form.area))
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
        t('Please enter a coupon code.', 'অনুগ্রহ করে কুপন কোড লিখুন।')
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
        t('Unable to validate the coupon.', 'কুপন যাচাই করা যায়নি। আবার চেষ্টা করুন।')
      );

      setAppliedCoupon(null);

      return;
    }

    if (!coupon) {
      setCouponError(
        t('Invalid or inactive coupon code.', 'কুপন কোডটি ভুল অথবা বর্তমানে সক্রিয় নয়।')
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
        t('This coupon is not active yet.', 'কুপনটি এখনো কার্যকর হয়নি।')
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
        t('This coupon code has expired.', 'কুপনের মেয়াদ শেষ হয়ে গেছে।')
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
        t('This coupon has reached its usage limit.', 'কুপনটি ব্যবহারের নির্ধারিত সীমা পূর্ণ হয়েছে।')
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
        t('Minimum order for this coupon is ', 'এই কুপন ব্যবহার করতে ন্যূনতম অর্ডার হতে হবে ') + formatPrice(Number(coupon.minimum_order || 0)) + '।'
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
        t('This coupon is not applicable to this order.', 'এই অর্ডারে কুপনটি প্রযোজ্য নয়।')
      );

      setAppliedCoupon(null);

      return;
    }

    setAppliedCoupon(coupon);

    setCouponSuccess(
      (isBangla ? 'কুপন প্রয়োগ হয়েছে! আপনার সাশ্রয় ' : 'Coupon applied! You save ') + formatPrice(couponDiscount) + (isBangla ? '।' : '.')
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
        t('Please fill in all required fields.', 'অনুগ্রহ করে (*) চিহ্নিত সব প্রয়োজনীয় তথ্য পূরণ করুন।')
      );

      return;
    }

    if (
      !/^(01)[0-9]{9}$/.test(
        cleanMobile
      )
    ) {
      setError(
        t('Please enter a valid mobile number (e.g. 01XXXXXXXXX).', 'সঠিক ১১ সংখ্যার মোবাইল নম্বর লিখুন (যেমন: 01XXXXXXXXX)।')
      );

      return;
    }

    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    if (settings?.checkout_guest_enabled === false && !userId) {
      setError(t('Please log in before placing an order.', 'অর্ডার করতে অনুগ্রহ করে আগে লগইন করুন।'));
      navigate('/login');
      return;
    }

    if (settings?.checkout_require_email === true && !form.email.trim()) {
      setError(t('Please enter your email address.', 'অনুগ্রহ করে ইমেইল ঠিকানা লিখুন।'));
      return;
    }

    if (settings?.checkout_require_terms === true && !termsAccepted) {
      setError(t('Please accept the terms and conditions to continue.', 'চালিয়ে যেতে শর্তাবলিতে সম্মতি দিন।'));
      return;
    }

    if (settings?.cod_enabled !== true && paymentMethod === 'Cash on Delivery') {
      setError(t('Cash on Delivery is currently unavailable. Please select an available payment method.', 'ক্যাশ অন ডেলিভারি বর্তমানে চালু নেই। অনুগ্রহ করে অন্য পেমেন্ট পদ্ধতি বেছে নিন।'));
      return;
    }

    if (paymentMethod === 'Online Payment' && settings?.online_payment_enabled !== true) {
      setError(
        t('Online Payment is not available yet. Please select Cash on Delivery.', 'অনলাইন পেমেন্ট এখনো চালু হয়নি। অনুগ্রহ করে ক্যাশ অন ডেলিভারি বেছে নিন।')
      );

      return;
    }

    if (submitLockRef.current || submitting) return;
    submitLockRef.current = true;
    setSubmitting(true);

    try {
      // Re-read live price and stock before order creation; local cart snapshots can be stale.
      const { data: latestProducts, error: productCheckError } = await supabase
        .from('products')
        .select('id, price, stock, is_active')
        .in('id', items.map(item => item.product.id));

      if (productCheckError) {
        throw new Error('পণ্যের বর্তমান দাম ও স্টক যাচাই করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
      }

      const latestById = new Map((latestProducts || []).map(product => [product.id, product]));
      const missingOrInactive = items.some(item => {
        const latest = latestById.get(item.product.id);
        return !latest || latest.is_active !== true;
      });

      if (missingOrInactive) {
        setError('কার্টের একটি বা একাধিক পণ্য আর পাওয়া যাচ্ছে না। কার্ট আপডেট করে আবার চেষ্টা করুন।');
        submitLockRef.current = false;
        setSubmitting(false);
        return;
      }

      syncCartProducts((latestProducts || []) as Array<Pick<Product, 'id' | 'price' | 'stock' | 'is_active'>>);

      const priceChanged = items.some(item => {
        const latest = latestById.get(item.product.id);
        return !latest || !Number.isFinite(Number(latest.price)) ||
          Number(latest.price) !== Number(item.product.price);
      });
      const insufficientStock = items.some(item => {
        const latest = latestById.get(item.product.id);
        return !latest || !Number.isFinite(Number(latest.stock)) ||
          Number(latest.stock) < item.quantity;
      });

      if (priceChanged || insufficientStock) {
        setError(priceChanged
          ? 'কার্টের একটি বা একাধিক পণ্যের দাম আপডেট হয়েছে। নতুন দাম দেখে আবার অর্ডার নিশ্চিত করুন।'
          : 'কার্টের একটি বা একাধিক পণ্যের স্টক কমে গেছে। পরিমাণ ঠিক করে আবার চেষ্টা করুন।');
        submitLockRef.current = false;
        setSubmitting(false);
        return;
      }

      /*
       * Secure checkout
       *
       * Database function একসাথে:
       * - Order ID তৈরি করে
       * - DB price থেকে subtotal হিসাব করে
       * - delivery charge যাচাই করে
       * - coupon যাচাই/ব্যবহার করে
       * - order items তৈরি করে
       * - stock কমায়
       *
       * ফলে browser-side price/stock manipulation করা যায় না।
       */
      const { data: orderNumber, error: orderError } =
        await supabase.rpc(
          'create_guest_order',
          {
            p_order: {
              user_id: userId || null,
              customer_name: form.name,
              mobile: cleanMobile,
              alt_phone: form.altMobile || null,
              email: userId
                ? accountEmail || null
                : form.email || null,
              district: form.district,
              area: form.area,
              address: form.address,
              order_note: form.note || null,
              payment_method: paymentMethod,
            },
            p_items: items.map(item => ({
              product_id: item.product.id,
              quantity: item.quantity,
            })),
            p_coupon_id: appliedCoupon?.id || null,
          },
        );

      if (orderError || !orderNumber) {
        throw orderError || new Error('Order creation failed.');
      }

      let orderDispatchToken: string | null = null;

      // Automatically dispatch the confirmed order to every enabled
      // Order Management integration. Secrets stay server-side in the Edge Function.
      try {
        const { data: dispatchToken, error: dispatchTokenError } =
          await supabase.rpc('issue_guest_order_integration_token', {
            p_order_number: orderNumber,
            p_mobile: cleanMobile,
          });

        if (dispatchTokenError || !dispatchToken) {
          console.error(
            'Order management dispatch token error:',
            dispatchTokenError
          );
        } else {
          orderDispatchToken = dispatchToken;
          const { data: dispatchResult, error: dispatchError } =
            await supabase.functions.invoke('order-management', {
              body: {
                action: 'create_guest',
                order_number: orderNumber,
                mobile: cleanMobile,
                token: dispatchToken,
              },
            });

          if (dispatchError) {
            console.error(
              'Automatic order management dispatch error:',
              dispatchError
            );
          } else if (dispatchResult?.success === false) {
            console.error(
              'Automatic order management dispatch failed:',
              dispatchResult
            );
          }
        }
      } catch (integrationError) {
        // Integration failures must never block a successfully created order.
        console.error(
          'Automatic order management dispatch error:',
          integrationError
        );
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

      // Send a server-side Meta Purchase event after the order is
      // successfully created. Integration failures must never block checkout.
      try {
        await supabase.functions.invoke('integrations', {
          body: {
            action: 'send_meta_purchase',
            order_number: orderNumber,
            mobile: cleanMobile,
            token: orderDispatchToken,
          },
        });
      } catch (metaError) {
        console.error('Meta CAPI purchase event error:', metaError);
      }

      clearCart();

      try {
        sessionStorage.setItem(
          `hbc-order-mobile-${orderNumber}`,
          cleanMobile
        );
      } catch {
        // Ignore storage failures; the order itself is already confirmed.
      }

      navigate(
        `/order-success/${orderNumber}`,
        { state: { mobile: cleanMobile } }
      );
    } catch (err) {
      console.error('Checkout order creation failed:', err);

      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null
            ? JSON.stringify(err)
            : String(err);

      const duplicateOrder =
        message.includes('গত ৫ মিনিটের মধ্যে') ||
        message.includes('5 minutes');

      setError(
        duplicateOrder
          ? t('An order has already been confirmed with this mobile number within the last 5 minutes. Please try again after 5 minutes.', 'এই মোবাইল নম্বর দিয়ে গত ৫ মিনিটের মধ্যে একটি অর্ডার নিশ্চিত হয়েছে। ৫ মিনিট পর আবার চেষ্টা করুন।')
          : t('Unable to place the order. Please try again.', 'অর্ডারটি সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।')
      );

      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <SEO title="Checkout - Homemade Beauty Care" />

        <h2 className="font-display text-xl sm:text-2xl font-bold text-dark mb-2">
          {t('Your cart is empty', 'আপনার কার্ট খালি')}
        </h2>

        <p className="text-gray-500 mb-6 text-center">
          {t('Add products to your cart before proceeding to checkout.', 'চেকআউট করার আগে কার্টে পণ্য যোগ করুন।')}
        </p>

        <Link
          to="/shop"
          className="btn-primary"
        >
          {t('Continue Shopping', 'কেনাকাটা চালিয়ে যান')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <SEO title="Checkout - Homemade Beauty Care" />

      <div className="section-padding py-8">

        <div className="flex justify-end mb-4">
          <button type="button" onClick={() => setIsBangla(value => !value)} aria-label={isBangla ? 'Switch checkout to English' : 'Checkout page in Bangla'} className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/5">
            <span aria-hidden="true">{isBangla ? '🌐' : 'আ'}</span>
            {isBangla ? 'Switch to English' : 'বাংলা করুন'}
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
          <Link
            to="/cart"
            className="hover:text-primary"
          >
            {t('Cart', 'কার্ট')}
          </Link>

          <ChevronRight size={14} />

          <span className="text-ink font-medium">
            {t('Complete Your Order', 'আপনার অর্ডার সম্পন্ন করুন')}
          </span>
        </div>

        <h1 className="font-display text-3xl font-bold text-dark mb-8">
          {t('Complete Your Order', 'আপনার অর্ডার সম্পন্ন করুন')}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="grid lg:grid-cols-3 gap-6"
        >

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">

            {/* Customer Info */}
            <div className="card p-4 sm:p-6 border border-gray-50">
              <h2 className="font-display text-base sm:text-lg font-semibold text-ink mb-4">
                {t('Customer Information', 'গ্রাহকের তথ্য')}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">

                {/* Name */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    {t('Full Name *', 'সম্পূর্ণ নাম *')}
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
                    placeholder={t('Enter your full name', 'আপনার সম্পূর্ণ নাম লিখুন')}
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    {t('Mobile Number *', 'মোবাইল নম্বর *')}
                  </label>

                  <input
                    type="tel"
                    required
                    value={form.mobile}
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setForm({
                        ...form,
                        mobile: value,
                      });
                    }}
                    className="input-field"
                    placeholder={t('Enter mobile number', 'মোবাইল নম্বর লিখুন')}
                    inputMode="numeric"
                    maxLength={11}
                    pattern="01[0-9]{9}"
                  />
                </div>

                {/* Alternative Mobile */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    {t('Alternative Number', 'বিকল্প মোবাইল নম্বর')}
                  </label>

                  <input
                    type="tel"
                    value={form.altMobile}
                    onChange={e => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setForm({
                        ...form,
                        altMobile: value,
                      });
                    }}
                    className="input-field"
                    placeholder={t('Enter alternative mobile number', 'বিকল্প মোবাইল নম্বর লিখুন')} inputMode="numeric" maxLength={11} pattern="01[0-9]{9}"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    {t('Email Address', 'ইমেইল ঠিকানা')}
                  </label>

                  <input
                    type="email"
                    required={settings?.checkout_require_email === true}
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
                    placeholder={t('Enter your email address', 'আপনার ইমেইল ঠিকানা লিখুন')}
                  />

                  {userId && (
                    <p className="text-xs text-gray-400 mt-1">
                      {t('Your verified account email', 'আপনার যাচাইকৃত অ্যাকাউন্টের ইমেইল')}
                    </p>
                  )}
                </div>

                {/* District */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    {t('District *', 'জেলা *')}
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
                    {t('Thana / Upazila *', 'থানা / উপজেলা *')}
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
                        ? t('Loading locations...', 'ঠিকানা লোড হচ্ছে...')
                        : thanas.length === 0
                          ? t('No area found', 'কোনো এলাকা পাওয়া যায়নি')
                          : t('Select Thana / Upazila', 'থানা / উপজেলা নির্বাচন করুন')}
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
                    {t('Full Delivery Address *', 'সম্পূর্ণ ডেলিভারি ঠিকানা *')}
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
                    placeholder={t('House/Holding number, road, thana/police station', 'বাড়ি/হোল্ডিং নম্বর, সড়ক, থানা/পুলিশ স্টেশনের ঠিকানা')}
                  />
                </div>

                {/* Note */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    {t('Order Note', 'অর্ডার সম্পর্কে বিশেষ নির্দেশনা')}
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
                    placeholder={t('Any special instructions for your order (optional)', 'অর্ডার সম্পর্কে বিশেষ নির্দেশনা (ঐচ্ছিক)')}
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
                      {t('Saved Addresses', 'সংরক্ষিত ঠিকানা')}
                    </h2>

                    <p className="text-sm text-gray-500 mt-1">
                      {t('Saved addresses for this account', 'এই অ্যাকাউন্টে সংরক্ষিত ঠিকানা')}
                    </p>
                  </div>

                  <MapPin
                    size={20}
                    className="text-primary"
                  />
                </div>

                {savedAddressLoading ? (
                  <p className="text-sm text-gray-400">
                    {t('Loading saved addresses...', 'সংরক্ষিত ঠিকানা লোড হচ্ছে...')}
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
                                {t('Default', 'ডিফল্ট')}
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
                      {t('No saved address found for this mobile number.', 'এই মোবাইল নম্বরের জন্য কোনো সংরক্ষিত ঠিকানা পাওয়া যায়নি।')}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <Plus size={14} />
                  {t('Your new address will be saved to your account when you place the order.', 'অর্ডার করলে নতুন ঠিকানাটি আপনার অ্যাকাউন্টে সংরক্ষিত হবে।')}
                </div>

              </div>
            )}

            {/* Guest Address Notice */}
            {!accountLoading &&
              !userId && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm text-gray-600">
                    {t('To use Saved Addresses, please', 'সংরক্ষিত ঠিকানা ব্যবহার করতে')} {' '}
                    <Link
                      to="/login"
                      className="font-semibold text-primary hover:underline"
                    >
                      {t('Log in', 'লগইন করুন')}
                    </Link>
                    ।
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    {t('You can also continue as a guest without logging in.', 'লগইন না করেও অতিথি হিসেবে অর্ডার করতে পারবেন।')}
                  </p>
                </div>
              )}

            {/* Payment */}
            <div className="card p-6 border border-gray-50">

              <h2 className="font-display text-lg font-semibold text-ink mb-4">
                {t('Payment Method', 'পেমেন্ট পদ্ধতি')}
              </h2>

              <div className="space-y-3">

                {/* COD */}
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    settings?.cod_enabled === false
                      ? 'border-gray-100 opacity-50 cursor-not-allowed'
                      : paymentMethod === 'Cash on Delivery'
                        ? 'border-primary bg-primary/5 cursor-pointer'
                        : 'border-gray-100 hover:border-gray-200 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={
                      paymentMethod ===
                      'Cash on Delivery'
                    }
                    disabled={settings?.cod_enabled === false}
                    onChange={() =>
                      setPaymentMethod(
                        'Cash on Delivery'
                      )
                    }
                    className="h-4 w-4 text-primary"
                  />

                  <div>
                    <span className="font-medium text-ink">
                      {t('Cash on Delivery', 'ক্যাশ অন ডেলিভারি')}
                    </span>

                    <p className="text-sm text-gray-500">
                      {settings?.cod_enabled === false
                        ? t('Currently unavailable', 'বর্তমানে চালু নেই')
                        : t('Pay when you receive your order', 'পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন')}
                    </p>
                  </div>
                </label>

                {/* Online */}
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    settings?.online_payment_enabled !== true
                      ? 'border-gray-100 opacity-50 cursor-not-allowed'
                      : paymentMethod === 'Online Payment'
                        ? 'border-primary bg-primary/5 cursor-pointer'
                        : 'border-gray-100 hover:border-gray-200 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={
                      paymentMethod ===
                      'Online Payment'
                    }
                    disabled={settings?.online_payment_enabled !== true}
                    onChange={() =>
                      setPaymentMethod(
                        'Online Payment'
                      )
                    }
                    className="h-4 w-4 text-primary"
                  />

                  <div>
                    <span className="font-medium text-ink">
                      {t('Online Payment', 'অনলাইন পেমেন্ট')}
                    </span>

                    <p className="text-sm text-gray-500">
                      {settings?.online_payment_enabled === true
                        ? t('Pay securely online', 'নিরাপদে অনলাইনে পেমেন্ট করুন')
                        : t('Currently unavailable', 'বর্তমানে চালু নেই')}
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
                {t('Order Summary', 'অর্ডারের বিবরণ')}
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

                      <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-1.5 py-1">
                        <button
                          type="button"
                          aria-label={t('Decrease quantity', 'পরিমাণ কমান')}
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-ink transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-5 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={t('Increase quantity', 'পরিমাণ বাড়ান')}
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-ink transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

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
                      placeholder={t('Enter coupon code', 'কুপন কোড লিখুন')}
                    />

                    <button
                      type="button"
                      onClick={
                        handleApplyCoupon
                      }
                      className="rounded-lg bg-dark px-4 py-2 text-sm font-medium text-white hover:bg-primary"
                    >
                      {t('Apply', 'প্রয়োগ করুন')}
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
                    {t('Subtotal', 'পণ্যের মোট মূল্য')}
                  </span>

                  <span className="font-medium">
                    {formatPrice(
                      subtotal
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    {t('Delivery Charge', 'ডেলিভারি চার্জ')}
                  </span>

                  <span className="font-medium">
                    {deliveryCharge ===
                    0
                      ? t('Free', 'ফ্রি')
                      : formatPrice(
                          deliveryCharge
                        )}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-sm">

                    <span className="text-gray-500">
                      {t('Discount', 'ছাড়')}
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
              <div className="flex justify-between items-center py-4 sm:py-5">

                <span className="font-display text-lg font-bold text-dark">
                  {t('Total', 'সর্বমোট')}
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
              {settings?.checkout_require_terms === true && (
                <label className="flex items-start gap-2 text-xs text-gray-500 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={e => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span>{t('I agree to the terms and conditions and confirm that my order information is correct.', 'আমি শর্তাবলিতে সম্মত এবং নিশ্চিত করছি যে আমার অর্ডারের তথ্য সঠিক।')}</span>
                </label>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {submitting
                  ? t('Placing Order...', 'অর্ডার করা হচ্ছে...')
                  : t('Place Order', 'অর্ডার নিশ্চিত করুন')}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                {t('By placing this order, you agree to our terms and conditions.', 'অর্ডার করার মাধ্যমে আপনি আমাদের শর্তাবলিতে সম্মতি দিচ্ছেন।')}
              </p>


            </div>

          </div>

        </form>

      </div>
    </div>
  );
}