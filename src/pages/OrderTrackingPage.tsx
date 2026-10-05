import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  Check,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem } from '@/lib/types';
import { formatPrice } from '@/lib/format';
import SEO from '@/components/SEO';

const TIMELINE_STEPS = [
  { key: 'Pending', label: 'Order Placed', icon: Check },
  { key: 'Confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'Processing', label: 'Processing', icon: Clock },
  { key: 'Shipped', label: 'Shipped', icon: Truck },
  { key: 'Delivered', label: 'Delivered', icon: Package },
];

type TrackingResponse = {
  success: boolean;
  message?: string;
  order?: Order;
  items?: OrderItem[];
};

export default function OrderTrackingPage() {
  const [searchParams] = useSearchParams();

  const [mobileNumber, setMobileNumber] = useState(
    searchParams.get('mobile') || ''
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanMobile = mobileNumber.replace(/\s/g, '').trim();

    if (!cleanMobile) {
      setError('মোবাইল নম্বর দিন।');
      setOrder(null);
      setItems([]);
      setSearched(true);
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);
    setItems([]);
    setSearched(true);

    try {
      const { data, error: queryError } =
        await supabase.rpc('track_order', {
          p_mobile_number: cleanMobile,
        });

      if (queryError) {
        console.error('Track order RPC error:', queryError);
        throw queryError;
      }

      const result = data as TrackingResponse | null;

      if (
        !result ||
        !result.success ||
        !result.order
      ) {
        setError(
          'এই মোবাইল নম্বর দিয়ে কোনো অর্ডার পাওয়া যায়নি। নম্বরটি ঠিক আছে কিনা দেখুন।'
        );
        return;
      }

      let trackedOrder = result.order;

      // If this order has a Pathao shipment, refresh the courier status
      // before showing the customer the latest tracking state.
      if ((result.order as any).pathao_consignment_id) {
        try {
          const { data: pathaoResult } =
            await supabase.functions.invoke('integrations', {
              body: {
                action: 'refresh_pathao',
                order_number: result.order.order_number,
                mobile: cleanMobile,
              },
            });

          if (pathaoResult?.success) {
            const { data: refreshed } =
              await supabase.rpc('track_order', {
                p_mobile_number: cleanMobile,
              });

            if (refreshed?.success && refreshed.order) {
              trackedOrder = refreshed.order as Order;
            }
          }
        } catch (pathaoError) {
          console.error('Pathao tracking refresh error:', pathaoError);
        }
      }

      setOrder(trackedOrder);
      setItems(result.items || []);
    } catch (err) {
      console.error('Order tracking error:', err);

      setOrder(null);
      setItems([]);

      setError(
        'অর্ডার খুঁজে পেতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
      );
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = order
    ? TIMELINE_STEPS.findIndex(
        step =>
          step.key === (
            order.status === 'Order Placed'
              ? 'Pending'
              : order.status
          )
      )
    : -1;

  return (
    <div className="min-h-screen bg-cream">
      <SEO title="অর্ডার ট্র্যাক - Homemade Beauty Care" />

      <div className="section-padding py-8">
        <h1 className="font-display text-3xl font-bold text-dark mb-2">
          অর্ডার ট্র্যাক করুন
        </h1>

        <p className="text-gray-500 mb-8">
          আপনার মোবাইল নম্বর দিয়ে সর্বশেষ অর্ডারের বর্তমান অবস্থা জানুন।
        </p>

        <div className="max-w-2xl">
          <form
            onSubmit={handleTrack}
            className="card p-6 border border-gray-50 mb-6"
          >
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">
                মোবাইল নম্বর
              </label>

              <input
                type="tel"
                inputMode="numeric"
                value={mobileNumber}
                onChange={e => setMobileNumber(e.target.value)}
                className="input-field"
                placeholder="01XXXXXXXXX"
                autoComplete="tel"
              />

              <p className="text-xs text-gray-400 mt-1.5">
                অর্ডারের সময় যে মোবাইল নম্বর দিয়েছেন, সেটি দিন।
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500 mt-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary mt-4 disabled:opacity-50"
            >
              <Search size={18} />

              {loading
                ? 'খুঁজছি...'
                : 'Track Order'}
            </button>
          </form>

          {order && (
            <div className="space-y-6 animate-fade-in-up">
              {/* Timeline */}
              <div className="card p-6 border border-gray-50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-lg font-semibold text-ink">
                    অর্ডার স্ট্যাটাস
                  </h2>

                  {order.status === 'Cancelled' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-500">
                      <X size={16} />
                      Cancelled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      {order.status}
                    </span>
                  )}
                </div>

                {order.status !== 'Cancelled' && (
                  <div className="relative">
                    {TIMELINE_STEPS.map(
                      (step, idx) => {
                        const isComplete =
                          idx <= currentStepIndex;

                        const isCurrent =
                          idx === currentStepIndex;

                        return (
                          <div
                            key={step.key}
                            className="flex gap-4 pb-8 last:pb-0 relative"
                          >
                            {idx <
                              TIMELINE_STEPS.length -
                                1 && (
                              <div
                                className={`absolute left-5 top-10 bottom-0 w-0.5 ${
                                  isComplete
                                    ? 'bg-primary'
                                    : 'bg-gray-200'
                                }`}
                              />
                            )}

                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full z-10 transition-all ${
                                isComplete
                                  ? isCurrent
                                    ? 'bg-primary text-white ring-4 ring-primary/20'
                                    : 'bg-primary text-white'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              <step.icon size={20} />
                            </div>

                            <div className="pt-1.5">
                              <h3
                                className={`font-medium ${
                                  isComplete
                                    ? 'text-ink'
                                    : 'text-gray-400'
                                }`}
                              >
                                {step.label}
                              </h3>

                              {isCurrent && (
                                <p className="text-sm text-primary mt-0.5">
                                  বর্তমান স্ট্যাটাস
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              {/* Order Details */}
              <div className="card p-6 border border-gray-50">
                <h2 className="font-display text-lg font-semibold text-ink mb-4">
                  অর্ডারের বিস্তারিত
                </h2>

                <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="flex gap-3"
                    >
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt=""
                          className="h-14 w-14 rounded-lg object-cover shrink-0"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {item.product_name}
                        </p>

                        <p className="text-xs text-gray-400">
                          Qty: {item.quantity} ×{' '}
                          {formatPrice(item.price)}
                        </p>
                      </div>

                      <span className="text-sm font-semibold text-ink">
                        {formatPrice(
                          item.price *
                            item.quantity
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Subtotal
                    </span>

                    <span className="font-medium">
                      {formatPrice(order.subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Delivery Charge
                    </span>

                    <span className="font-medium">
                      {order.delivery_charge === 0
                        ? 'Free'
                        : formatPrice(
                            order.delivery_charge
                          )}
                    </span>
                  </div>

                  {order.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Discount
                      </span>

                      <span className="font-medium text-accent">
                        -{formatPrice(order.discount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="font-semibold text-ink">
                      Grand Total
                    </span>

                    <span className="font-bold text-primary text-lg">
                      {formatPrice(order.grand_total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pathao Tracking */}
              {((order as any).pathao_tracking_code ||
                (order as any).pathao_consignment_id ||
                (order as any).pathao_status) && (
                <div className="card p-6 border border-gray-50">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck size={20} className="text-primary" />
                    <h2 className="font-display text-lg font-semibold text-ink">
                      Courier Tracking
                    </h2>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    {(order as any).pathao_tracking_code && (
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-400">Tracking Code</p>
                        <p className="font-semibold text-ink mt-1">
                          {(order as any).pathao_tracking_code}
                        </p>
                      </div>
                    )}

                    {(order as any).pathao_status && (
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-400">Courier Status</p>
                        <p className="font-semibold text-primary mt-1">
                          {(order as any).pathao_status}
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-400 mt-3">
                    Courier status সর্বশেষ অর্ডার ট্র্যাক করার সময় আপডেট হয়।
                  </p>
                </div>
              )}

              {/* Delivery Info */}
              <div className="card p-6 border border-gray-50">
                <h2 className="font-display text-lg font-semibold text-ink mb-3">
                  ডেলিভারি তথ্য
                </h2>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium text-ink">
                      নাম:
                    </span>{' '}
                    {order.customer_name}
                  </p>

                  <p>
                    <span className="font-medium text-ink">
                      পেমেন্ট:
                    </span>{' '}
                    {order.payment_method}
                  </p>

                  <p>
                    <span className="font-medium text-ink">
                      অর্ডার তারিখ:
                    </span>{' '}
                    {new Date(
                      order.created_at
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {searched &&
            !order &&
            !loading &&
            !error && (
              <div className="text-center py-12 text-gray-400">
                <Package
                  size={48}
                  className="mx-auto mb-3 opacity-50"
                />

                <p>
                  কোনো অর্ডার পাওয়া যায়নি।
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
