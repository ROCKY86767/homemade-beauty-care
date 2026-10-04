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
  const checkoutEventSent = useRef(false);

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
        'Please enter a coupon code.'
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
        'Unable to validate the coupon.'
      );

      setAppliedCoupon(null);

      return;
    }

    if (!coupon) {
      setCouponError(
        'Invalid or inactive coupon code.'
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
        'This coupon is not active yet.'
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
        'This coupon code has expired.'
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
        'This coupon has reached its usage limit.'
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
        `Minimum order for this coupon is ${formatPrice(
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
        'This coupon is not applicable to this order.'
      );

      setAppliedCoupon(null);

      return;
    }

    setAppliedCoupon(coupon);

    setCouponSuccess(
      `Coupon applied! You save ${formatPrice(
        couponDiscount
      )} .`
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
        'Please fill in all required fields.'
      );

      return;
    }

    if (
      !/^(01)[0-9]{9}$/.test(
        cleanMobile
      )
    ) {
      setError(
        'Please enter a valid mobile number (e.g. 01XXXXXXXXX).'
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
        'Online Payment is not available yet. Please select Cash on Delivery.'
      );

      return;
    }

    setSubmitting(true);

    try {
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
          },
        });
      } catch (metaError) {
        console.error('Meta CAPI purchase event error:', metaError);
      }

      // Browser-side Purchase event for Meta Pixel.
      try {
        const fbq = (window as Window & {
          fbq?: (...args: any[]) => void;
        }).fbq;

        if (fbq) {
          fbq('track', 'Purchase', {
            value: Number(grandTotal),
            currency: 'BDT',
            content_ids: items.map(item => item.product.id),
            content_type: 'product',
            num_items: items.reduce((sum, item) => sum + item.quantity, 0),
          });
        }
      } catch (pixelError) {
        console.error('Meta Pixel purchase event error:', pixelError);
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
          : typeof err === 'object' && err !== null
            ? JSON.stringify(err)
            : String(err);

      const duplicateOrder =
        message.includes('গত ৫ মিনিটের মধ্যে') ||
        message.includes('5 minutes');

      setError(
        duplicateOrder
          ? 'An order has already been confirmed with this mobile number within the last 5 minutes. Please try again after 5 minutes.'
          : 'Unable to place the order. Please try again.'
      );

      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <SEO title="Checkout - Homemade Beauty Care" />

        <h2 className="font-display text-xl sm:text-2xl font-bold text-dark mb-2">
          Your cart is empty
        </h2>

        <p className="text-gray-500 mb-6 text-center">
          Add products to your cart before proceeding to checkout.
        </p>

        <Link
          to="/shop"
          className="btn-primary"
        >
          Continue Shopping
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
            Cart
          </Link>

          <ChevronRight size={14} />

          <span className="text-ink font-medium">
            Complete Your Order
          </span>
        </div>

        <h1 className="font-display text-3xl font-bold text-dark mb-8">
          Complete Your Order
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
                Customer Information
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">

                {/* Name */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    Full Name *
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
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    Mobile Number *
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
                    placeholder="Enter mobile number"
                    inputMode="numeric"
                    maxLength={11}
                    pattern="01[0-9]{9}"
                  />
                </div>

                {/* Alternative Mobile */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    Alternative Number
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
                    placeholder="Enter alternative mobile number" inputMode="numeric" maxLength={11} pattern="01[0-9]{9}"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    Email Address
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
                    placeholder="Enter your email address"
                  />

                  {userId && (
                    <p className="text-xs text-gray-400 mt-1">
                      Your verified account email
                    </p>
                  )}
                </div>

                {/* District */}
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    District *
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
                    Thana / Upazila *
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
                        ? 'Loading locations...'
                        : thanas.length === 0
                          ? 'No area found'
                          : 'Select Thana / Upazila'}
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
                    Full Delivery Address *
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
                    placeholder="House/Holding number, road, thana/police station"
                  />
                </div>

                {/* Note */}
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    Order Note
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
                    placeholder="Any special instructions for your order (optional)"
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
                      Saved addresses for this account
                    </p>
                  </div>

                  <MapPin
                    size={20}
                    className="text-primary"
                  />
                </div>

                {savedAddressLoading ? (
                  <p className="text-sm text-gray-400">
                    Loading saved addresses...
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
                      No saved address found for this mobile number.
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <Plus size={14} />
                  Your new address will be saved to your account when you place the order.
                </div>

              </div>
            )}

            {/* Guest Address Notice */}
            {!accountLoading &&
              !userId && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm text-gray-600">
                    To use Saved Addresses, please{' '}
                    <Link
                      to="/login"
                      className="font-semibold text-primary hover:underline"
                    >
                      Log in
                    </Link>
                    ।
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    You can also continue as a guest without logging in.
                  </p>
                </div>
              )}

            {/* Payment */}
            <div className="card p-6 border border-gray-50">

              <h2 className="font-display text-lg font-semibold text-ink mb-4">
                Payment Method
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
                      Pay when you receive your order
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
                      Coming soon (bKash, Nagad, Card)
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
                      placeholder="Enter coupon code"
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
              <div className="flex justify-between items-center py-4 sm:py-5">

                <span className="font-display text-lg font-bold text-dark">
                  Total
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
                  ? 'Placing Order...'
                  : 'Place Order'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                By placing this order, you agree to our
                terms and conditions.
              </p>

              {false && <OrderJourneyAnimation />}

            </div>

          </div>

        </form>

      </div>
    </div>
  );
}