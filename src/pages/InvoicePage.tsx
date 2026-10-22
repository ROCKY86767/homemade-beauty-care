import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer, Search, Home, CreditCard, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import SEO from '@/components/SEO';

export default function InvoicePage() {
  const [mobile, setMobile] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    const mobileParam = searchParams.get('mobile');

    if (orderId) {
      void loadInvoiceByOrderId(orderId);
      return;
    }

    if (mobileParam) {
      setMobile(mobileParam);
      void loadInvoice(mobileParam);
    }
  }, [searchParams]);

  async function loadInvoiceByOrderId(orderId: string) {
    setError('');
    setResult(null);
    setLoading(true);

    const [
      { data: order, error: orderError },
      { data: items, error: itemsError },
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle(),
      supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
    ]);

    setLoading(false);

    if (orderError || itemsError || !order) {
      setError('Invoice পাওয়া যায়নি।');
      return;
    }

    setResult({
      success: true,
      order,
      items: items || [],
    });
  }

  async function loadInvoice(phone: string) {
    setError('');
    setResult(null);
    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc('track_order', {
      p_mobile_number: phone.trim(),
    });

    setLoading(false);

    if (rpcError || !data?.success) {
      setError('Invoice পাওয়া যায়নি। মোবাইল নম্বরটি ঠিক আছে কিনা দেখুন।');
      return;
    }

    setResult(data);
  }

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    await loadInvoice(mobile);
  };

  return (
    <div className="invoice-print-root min-h-screen bg-cream py-10 px-4">
      <SEO title="Invoice - Homemade Beauty Care" />
      <style>{`@page { size: A4 portrait; margin: 8mm; } @media print { html, body, #root { display: block !important; width: auto !important; height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: #fff !important; } body * { visibility: hidden !important; } .invoice-print-root, .invoice-print-root * { visibility: visible !important; } .invoice-print-root { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; min-height: 0 !important; height: auto !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; background: #fff !important; } .invoice-print-root > div { width: 100% !important; max-width: none !important; margin: 0 !important; } .invoice-print-root .rounded-2xl { border-radius: 0 !important; box-shadow: none !important; } .invoice-print-root img { max-height: 52px !important; } .invoice-print-root button, .invoice-print-root a { display: none !important; } .invoice-print-root .bg-gray-50 { background: #fff !important; } .invoice-print-root .py-10 { padding-top: 0 !important; padding-bottom: 0 !important; } .invoice-print-root .p-6, .invoice-print-root .sm\\:p-8 { padding: 0 !important; } .invoice-print-root .my-5 { margin-top: 10px !important; margin-bottom: 10px !important; } .invoice-print-root .py-5 { padding-top: 10px !important; padding-bottom: 10px !important; } .invoice-print-root .break-inside-avoid { break-inside: avoid !important; page-break-inside: avoid !important; } }`}</style>

      <div className="max-w-3xl mx-auto">
        {!result ? (
          <div className="card p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="font-display text-3xl font-bold text-dark">Invoice</h1>
              <p className="text-gray-500 mt-2">Enter your order mobile number to view and print your invoice.</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4 max-w-md mx-auto">
              <input
                required
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                className="input-field"
                placeholder="Enter Your Mobile Number"
              />

              {error && <p className="rounded-lg bg-red-50 text-red-600 px-4 py-3 text-sm">{error}</p>}

              <button disabled={loading} className="btn-primary w-full disabled:opacity-50">
                <Search size={18} />
                {loading ? 'খোঁজা হচ্ছে...' : 'Invoice দেখুন'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 print:shadow-none">
            <div className="flex items-start justify-between gap-4 border-b border-primary/10 pb-6">
              <div className="flex items-center gap-3">
                <img src="/new-homemade-logo.png" alt="Homemade Beauty Care" className="h-16 w-16 rounded-xl object-contain" />
                <div>
                  <h1 className="font-display text-2xl font-bold text-dark">Homemade Beauty Care</h1>
                  <p className="text-sm text-gray-500">Official Order Invoice</p>
                </div>
              </div>
              <button onClick={() => window.print()} className="btn-secondary print:hidden">
                <Printer size={18} /> Print
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 py-5 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400">Order ID</p>
                <p className="font-bold text-lg">{result.order.order_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Date</p>
                <p>{new Date(result.order.created_at).toLocaleString('en-BD')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Customer</p>
                <p className="font-medium">{result.order.customer_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <p>{result.order.status}</p>
              </div>
            </div>

            <div className="py-5 border-b border-gray-100">
              {result.items.map((item: any) => (
                <div key={item.id} className="flex gap-3 py-2">
                  {item.image_url && <img src={item.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />}
                  <div className="flex-1">
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-gray-400">{item.quantity} × {formatPrice(item.price)}</p>
                  </div>
                  <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="my-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="flex justify-between py-1.5"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatPrice(result.order.subtotal ?? result.items.reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))}</span></div>
              <div className="flex justify-between py-1.5"><span className="text-gray-600">Delivery Charge</span><span>{Number(result.order.delivery_charge || 0) === 0 ? 'FREE' : formatPrice(result.order.delivery_charge)}</span></div>
              {Number(result.order.discount || 0) > 0 && <div className="flex justify-between py-1.5"><span className="text-gray-600">Discount</span><span>-{formatPrice(result.order.discount)}</span></div>}
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-3 text-base font-bold"><span>Grand Total</span><span className="text-primary">{formatPrice(result.order.grand_total ?? result.order.total)}</span></div>
              <div className="flex justify-between py-2 text-emerald-700"><span>Advance Paid</span><span className="font-semibold">− {formatPrice(result.order.advance_payment || 0)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-3 text-lg font-bold"><span>Balance Due</span><span className="text-red-700">{formatPrice(Math.max(0, Number(result.order.grand_total ?? result.order.total ?? 0) - Number(result.order.advance_payment || 0)))}</span></div>
            </div>

            <div className="border-t border-primary/10 pt-5 text-sm text-gray-600 space-y-2">
              {(result.order.customer_phone || result.order.mobile) && <div className="flex items-center gap-2"><CreditCard size={16} /> {result.order.customer_phone || result.order.mobile}</div>}
              {([result.order.address, result.order.area, result.order.district].filter(Boolean).length > 0) && <div className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0" /> <span>{[result.order.address, result.order.area, result.order.district].filter(Boolean).join(', ')}</span></div>}
              <div className="flex items-center gap-2"><CreditCard size={16} /> {result.order.payment_method || 'Cash on Delivery'} · {result.order.payment_status || (Number(result.order.advance_payment || 0) > 0 ? 'Partially Paid' : 'Unpaid')}</div>
              <p className="pt-3 text-center text-xs text-gray-400">Thank you for choosing Homemade Beauty Care.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 print:hidden">
              <Link to={`/track-order?id=${result.order.order_number}`} className="btn-primary">অর্ডার ট্র্যাক করুন</Link>
              <Link to="/" className="btn-secondary"><Home size={18} /> হোম</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
