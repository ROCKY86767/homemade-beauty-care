import { useParams, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CheckCircle2, Package, Home, Truck, MapPin, CreditCard, PackageCheck, Box, MapPinCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem } from '@/lib/types';
import { formatPrice } from '@/lib/format';
import SEO from '@/components/SEO';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export default function OrderSuccessPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const location = useLocation();

  useEffect(() => {
    if (!orderNumber) return;

    (async () => {
      setLoading(true);

      let mobile = '';
      const stateMobile = (location.state as { mobile?: string } | null)?.mobile;

      try {
        mobile =
          stateMobile?.replace(/\s/g, '').trim() ||
          sessionStorage.getItem(`hbc-order-mobile-${orderNumber}`)?.replace(/\s/g, '').trim() ||
          '';
      } catch {
        mobile = stateMobile?.replace(/\s/g, '').trim() || '';
      }

      if (!mobile) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('track_order', {
          p_mobile_number: mobile,
        });

        if (error || !data?.success || data.order?.order_number !== orderNumber) {
          setLoading(false);
          return;
        }

        const trackedOrder = data.order as Order;
        const trackedItems = (data.items || []) as OrderItem[];

        setOrder(trackedOrder);
        setItems(trackedItems);

        if (window.fbq) {
          window.fbq(
            'track',
            'Purchase',
            {
              value: Number(trackedOrder.grand_total || 0),
              currency: 'BDT',
              content_ids: trackedItems
                .map((item: any) => item.product_id || item.product_name)
                .filter(Boolean),
              content_type: 'product',
              num_items: trackedItems.reduce(
                (sum: number, item: any) => sum + Number(item.quantity || 0),
                0
              ),
            },
            {
              eventID: trackedOrder.order_number,
            }
          );
        }
      } catch (error) {
        console.error('Order success lookup error:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderNumber, location.state]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-cream px-4 py-12">
      <SEO title="Order Confirmed - Homemade Beauty Care" />
      <div className="max-w-lg w-full">
        <div className="relative overflow-hidden rounded-3xl bg-white border border-primary/10 shadow-sm px-5 py-8 sm:px-10 sm:py-10 text-center animate-fade-in-up">
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/5" />
          <div className="absolute -bottom-24 -left-20 h-48 w-48 rounded-full bg-accent/5" />
          <div className="relative">
            <div className="mx-auto mb-5 flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5">
              <CheckCircle2 size={50} className="text-primary sm:h-14 sm:w-14" strokeWidth={1.8} />
            </div>
            <p className="mb-2 text-xs sm:text-sm font-semibold uppercase tracking-[0.16em] text-primary">Order Confirmed</p>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-dark leading-tight">
              Thank you! Your order has been successfully confirmed.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-gray-500">
              আপনার অর্ডারটি আমরা পেয়েছি। আমাদের টিম এখন এটি প্রসেস করছে। প্রয়োজনে ডেলিভারির আগে আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm">
              <Package size={17} className="text-primary" />
              <span className="text-gray-500">Order ID</span>
              <span className="font-bold text-ink">{orderNumber}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : order ? (
          <div className="card p-5 sm:p-6 border border-gray-50 mb-6 rounded-2xl">
            <div className="flex items-center justify-center gap-2 mb-6 pb-6 border-b border-gray-100">
              <Package size={18} className="text-primary" />
              <span className="text-sm text-gray-500">Order ID:</span>
              <span className="font-bold text-ink text-lg">{order.order_number}</span>
            </div>

            <div className="space-y-4">
              {/* Items */}
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex gap-3 items-center">
                    {item.image_url && (
                      <img src={item.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink line-clamp-1">{item.product_name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                    </div>
                    <span className="text-sm font-semibold text-ink">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t border-gray-100 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Charge</span>
                  <span className="font-medium">{order.delivery_charge === 0 ? 'Free' : formatPrice(order.delivery_charge)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-accent">-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="font-semibold text-ink">Grand Total</span>
                  <span className="font-bold text-primary text-lg">{formatPrice(order.grand_total)}</span>
                </div>
              </div>

              {/* Delivery info */}
              <div className="pt-4 border-t border-gray-100 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-ink">{order.customer_name}</p>
                    <p className="text-gray-500">{order.address}, {order.area}, {order.district}</p>
                    <p className="text-gray-500">{order.mobile}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-primary" />
                  <span className="text-gray-500">{order.payment_method}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-primary" />
                  <span className="text-gray-500">Status: {order.status}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 shadow-sm mb-4 animate-fade-in-up">
            <Package size={18} className="text-primary" />
            <span className="text-sm text-gray-500">Order ID:</span>
            <span className="font-bold text-ink">{orderNumber}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in-up">
          <Link to={`/track-order?id=${orderNumber}`} className="btn-primary click-feedback justify-center">
            Track Order
          </Link>
          <Link to="/invoice" className="btn-secondary click-feedback-soft justify-center">
            Invoice
          </Link>
          <Link to="/" className="btn-secondary">
            <Home size={18} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
