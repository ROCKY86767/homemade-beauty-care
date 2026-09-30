import { useState } from 'react';
import { Search, Package, ChevronRight, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem } from '@/lib/types';
import { formatPrice } from '@/lib/format';
import SEO from '@/components/SEO';

type OrderWithItems = {
  order: Order;
  items: OrderItem[];
};

export default function MyOrdersPage() {
  const [mobile, setMobile] = useState('');
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanMobile = mobile.trim();

    if (!cleanMobile) {
      setError('মোবাইল নম্বর দিন।');
      return;
    }

    setLoading(true);
    setError('');
    setSearched(true);
    setOrders([]);
    setSelectedOrder(null);

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('mobile', cleanMobile)
      .order('created_at', { ascending: false });

    if (orderError) {
      console.error('My Orders error:', orderError);
      setError('অর্ডার খুঁজতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      setLoading(false);
      return;
    }

    if (!orderData || orderData.length === 0) {
      setError('এই মোবাইল নম্বরে কোনো অর্ডার পাওয়া যায়নি।');
      setLoading(false);
      return;
    }

    const results: OrderWithItems[] = [];

    for (const order of orderData as Order[]) {
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true });

      if (itemError) {
        console.error('Order items error:', itemError);
      }

      results.push({
        order,
        items: itemData || [],
      });
    }

    setOrders(results);
    setLoading(false);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-50 text-green-600';
      case 'Cancelled':
        return 'bg-red-50 text-red-500';
      case 'Shipped':
        return 'bg-blue-50 text-blue-600';
      case 'Processing':
        return 'bg-purple-50 text-purple-600';
      case 'Confirmed':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-yellow-50 text-yellow-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'Pending';
      case 'Confirmed':
        return 'Confirmed';
      case 'Processing':
        return 'Processing';
      case 'Shipped':
        return 'Shipped';
      case 'Delivered':
        return 'Delivered';
      case 'Cancelled':
        return 'Cancelled';
      case 'Order Placed':
        return 'Order Placed';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <SEO title="My Orders - Homemade Beauty Care" />

      <div className="section-padding py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-dark mb-2">
              My Orders
            </h1>
            <p className="text-gray-500">
              আপনার মোবাইল নম্বর দিয়ে আপনার অর্ডারগুলো দেখুন।
            </p>
          </div>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="card p-6 border border-gray-50 mb-8"
          >
            <label className="text-sm font-medium text-ink mb-2 block">
              Mobile Number
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="input-field flex-1"
                placeholder="017XXXXXXXX"
              />

              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                <Search size={18} />
                {loading ? 'খুঁজছি...' : 'Search My Orders'}
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-500 mt-3">
                {error}
              </p>
            )}
          </form>

          {/* Orders */}
          {orders.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-ink">
                  আপনার অর্ডারসমূহ
                </h2>

                <span className="text-sm text-gray-500">
                  {orders.length} টি অর্ডার
                </span>
              </div>

              {orders.map(({ order, items }) => (
                <div
                  key={order.id}
                  className="card border border-gray-50 overflow-hidden"
                >
                  {/* Header */}
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">
                          Order ID
                        </p>

                        <h3 className="font-semibold text-ink">
                          {order.order_number}
                        </h3>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-xs text-gray-400 mb-1">
                          Order Date
                        </p>

                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString(
                            'en-GB',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Product Preview */}
                  <div className="p-5">
                    <div className="space-y-3">
                      {items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3"
                        >
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="h-14 w-14 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                              <Package
                                size={22}
                                className="text-gray-400"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink truncate">
                              {item.product_name}
                            </p>

                            <p className="text-xs text-gray-400">
                              Qty: {item.quantity} ×{' '}
                              {formatPrice(item.price)}
                            </p>
                          </div>

                          <p className="text-sm font-semibold text-ink">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}

                      {items.length > 3 && (
                        <p className="text-xs text-gray-400">
                          + {items.length - 3} more product
                          {items.length - 3 > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">
                          Total
                        </p>
                        <p className="font-bold text-primary">
                          {formatPrice(order.grand_total)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 mb-1">
                          Payment
                        </p>
                        <p className="text-sm font-medium text-ink">
                          {order.payment_method || 'Cash on Delivery'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400 mb-1">
                          Status
                        </p>

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                            order.status
                          )}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>

                    {/* View Details */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOrder({ order, items })
                      }
                      className="w-full mt-5 flex items-center justify-center gap-2 rounded-lg border border-primary/20 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                    >
                      View Details
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {searched && !loading && orders.length === 0 && !error && (
            <div className="text-center py-16 text-gray-400">
              <Package
                size={52}
                className="mx-auto mb-4 opacity-50"
              />

              <p>কোনো অর্ডার পাওয়া যায়নি।</p>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Order ID</p>
                <h2 className="font-display text-xl font-bold text-ink">
                  {selectedOrder.order.order_number}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Products */}
              <div>
                <h3 className="font-semibold text-ink mb-4">
                  Products
                </h3>

                <div className="space-y-4">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-3"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="h-16 w-16 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Package
                            size={24}
                            className="text-gray-400"
                          />
                        </div>
                      )}

                      <div className="flex-1">
                        <p className="font-medium text-ink">
                          {item.product_name}
                        </p>

                        <p className="text-sm text-gray-400 mt-1">
                          Quantity: {item.quantity}
                        </p>

                        <p className="text-sm text-gray-500">
                          Price: {formatPrice(item.price)}
                        </p>
                      </div>

                      <p className="font-semibold text-ink">
                        {formatPrice(
                          item.price * item.quantity
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="font-semibold text-ink mb-4">
                  Order Summary
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Subtotal
                    </span>
                    <span>
                      {formatPrice(
                        selectedOrder.order.subtotal
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-500">
                      Delivery Charge
                    </span>
                    <span>
                      {selectedOrder.order.delivery_charge === 0
                        ? 'Free'
                        : formatPrice(
                            selectedOrder.order.delivery_charge
                          )}
                    </span>
                  </div>

                  {selectedOrder.order.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        Discount
                      </span>

                      <span className="text-accent">
                        -{formatPrice(
                          selectedOrder.order.discount
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-gray-100 pt-3 mt-3">
                    <span className="font-semibold text-ink">
                      Grand Total
                    </span>

                    <span className="font-bold text-primary text-lg">
                      {formatPrice(
                        selectedOrder.order.grand_total
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment & Status */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-400 mb-1">
                    Payment
                  </p>

                  <p className="font-medium text-ink">
                    {selectedOrder.order.payment_method ||
                      'Cash on Delivery'}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    {selectedOrder.order.payment_status ||
                      'Unpaid'}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-400 mb-1">
                    Current Status
                  </p>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                      selectedOrder.order.status
                    )}`}
                  >
                    {getStatusText(
                      selectedOrder.order.status
                    )}
                  </span>
                </div>
              </div>

              {/* Delivery */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="font-semibold text-ink mb-3">
                  Delivery Information
                </h3>

                <div className="text-sm text-gray-600 space-y-1.5">
                  <p>
                    <span className="font-medium text-ink">
                      Name:
                    </span>{' '}
                    {selectedOrder.order.customer_name}
                  </p>

                  <p>
                    <span className="font-medium text-ink">
                      Mobile:
                    </span>{' '}
                    {selectedOrder.order.mobile}
                  </p>

                  <p>
                    <span className="font-medium text-ink">
                      Address:
                    </span>{' '}
                    {selectedOrder.order.address},{' '}
                    {selectedOrder.order.area},{' '}
                    {selectedOrder.order.district}
                  </p>

                  <p>
                    <span className="font-medium text-ink">
                      Order Date:
                    </span>{' '}
                    {new Date(
                      selectedOrder.order.created_at
                    ).toLocaleString('en-GB')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}