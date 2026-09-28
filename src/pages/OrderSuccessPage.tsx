import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CheckCircle2, Package, Home, Truck, MapPin, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem } from '@/lib/types';
import { formatPrice } from '@/lib/format';
import SEO from '@/components/SEO';

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
          <Link to="/" className="btn-secondary">
            <Home size={18} /> হোমে ফিরে যান
          </Link>
        </div>
      </div>
    </div>
  );
}
