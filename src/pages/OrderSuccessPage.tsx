import { useParams, Link } from 'react-router-dom';
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

function OrderJourneyAnimation() {
  const steps = [
    { icon: PackageCheck, title: 'অর্ডার কনফার্ম', desc: 'আপনার অর্ডারটি আমরা পেয়েছি' },
    { icon: Box, title: 'প্যাকিং হচ্ছে', desc: 'পণ্য যত্নসহকারে প্যাক করা হচ্ছে' },
    { icon: Truck, title: 'কুরিয়ারে দেওয়া হয়েছে', desc: 'কুরিয়ার নিয়ে রওনা হয়েছে' },
    { icon: MapPinCheck, title: 'ডেলিভারি', desc: 'আপনার ঠিকানায় পৌঁছে যাবে' },
  ];
  return (
    <div className="mt-7 rounded-3xl border border-primary/10 bg-gradient-to-br from-cream via-white to-primary/5 p-5 sm:p-7 overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Order Journey</p>
          <h3 className="mt-1 font-display text-xl sm:text-2xl font-bold text-dark">আপনার অর্ডারের যাত্রা</h3>
        </div>
        <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-soft-float">
          <PackageCheck size={22} />
        </div>
      </div>
      <div className="relative grid grid-cols-1 sm:grid-cols-4 gap-5 sm:gap-3">
        <div className="hidden sm:block absolute left-[12%] right-[12%] top-6 h-1 rounded-full bg-primary/10" />
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="relative z-10 text-center animate-reveal-scale" style={{ animationDelay: index * 120 + 'ms' }}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-primary text-white shadow-md shadow-primary/20 animate-soft-float">
                <Icon size={21} />
              </div>
              <h4 className="mt-3 text-sm font-bold text-dark">{step.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{step.desc}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-6 rounded-2xl bg-white/80 px-4 py-3 text-center text-xs sm:text-sm text-gray-500 border border-white">
        📦 অর্ডার কনফার্ম হয়েছে—এখন আমাদের টিম এটি প্রস্তুত করছে।
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) return;
    (async () => {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .maybeSingle();
      if (orderData) {
        setOrder(orderData);
        const { data: itemData } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderData.id);
        setItems(itemData || []);

        // Browser Pixel Purchase + server-side CAPI use the same event ID
        // so Meta can deduplicate the conversion.
        if (window.fbq) {
          window.fbq(
            'track',
            'Purchase',
            {
              value: Number(orderData.grand_total || 0),
              currency: 'BDT',
              content_ids: (itemData || [])
                .map((item: any) => item.product_id || item.product_name)
                .filter(Boolean),
              content_type: 'product',
              num_items: (itemData || []).reduce(
                (sum: number, item: any) => sum + Number(item.quantity || 0),
                0
              ),
            },
            {
              eventID: orderData.order_number,
            }
          );
        }

        const fbp = document.cookie
          .split('; ')
          .find((row) => row.startsWith('_fbp='))
          ?.split('=')[1] || '';
        const fbc = document.cookie
          .split('; ')
          .find((row) => row.startsWith('_fbc='))
          ?.split('=')[1] || '';

        supabase.functions
          .invoke('integrations', {
            body: {
              action: 'send_meta_purchase',
              order_number: orderData.order_number,
              fbp,
              fbc,
            },
          })
          .catch((integrationError) => {
            console.error('Meta CAPI error:', integrationError);
          });
      }
      setLoading(false);
    })();
  }, [orderNumber]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-cream px-4 py-12">
      <SEO title="অর্ডার সফল - Homemade Beauty Care" />
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="flex h-24 w-24 mx-auto items-center justify-center rounded-full bg-primary/10 mb-6 animate-fade-in-up">
            <CheckCircle2 size={56} className="text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-dark mb-3 animate-fade-in-up">
            আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে
          </h1>
          <p className="text-gray-500 leading-relaxed mb-4 animate-fade-in-up">
            আপনার অর্ডারের তথ্য আমরা পেয়েছি। প্রয়োজন হলে আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।
          </p>
          <OrderJourneyAnimation />
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : order ? (
          <div className="card p-6 border border-gray-50 mb-6">
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
          <Link to={`/track-order?id=${orderNumber}`} className="btn-primary">
            অর্ডার ট্র্যাক করুন
          </Link>
          <Link to="/invoice" className="btn-secondary">
            Invoice
          </Link>
          <Link to="/" className="btn-secondary">
            <Home size={18} /> হোমে ফিরে যান
          </Link>
        </div>
      </div>
    </div>
  );
}
