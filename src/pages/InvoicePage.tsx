import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer, Search, Home, CreditCard, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import SEO from '@/components/SEO';
import { getSettings } from '@/lib/settings';
import type { SiteSettings } from '@/lib/types';

export default function InvoicePage() {
  const [mobile, setMobile] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    const mobileParam = searchParams.get('mobile');
    if (!mobileParam) return;
    setMobile(mobileParam);
    void loadInvoice(mobileParam);
  }, [searchParams]);

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
    setError('');
    setResult(null);
    setLoading(true);

    await loadInvoice(mobile);
  };

  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <SEO title="Invoice - Homemade Beauty Care" />

      <div className="max-w-3xl mx-auto">
        {!result ? (
          <div className="card p-6 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="font-display text-3xl font-bold text-dark">Invoice</h1>
              <p className="text-gray-500 mt-2">শুধু Order ID দিয়ে ইনভয়েস দেখুন ও প্রিন্ট করুন।</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-4 max-w-md mx-auto">
              <input
                required
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                className="input-field"
                placeholder="আপনার মোবাইল নম্বর দিন"
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

            <div className="grid sm:grid-cols-2 gap-4 py-5 border-b">
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

            <div className="py-5 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(result.order.subtotal)}</span></div>
              <div className="flex justify-between"><span>Delivery Charge</span><span>{formatPrice(result.order.delivery_charge)}</span></div>
              {result.order.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatPrice(result.order.discount)}</span></div>}
              <div className="flex justify-between border-t pt-3 text-lg font-bold"><span>Grand Total</span><span className="text-primary">{formatPrice(result.order.grand_total)}</span></div>
            </div>

            <div className="border-t border-primary/10 pt-5 text-sm text-gray-600 space-y-2">
              <div className="flex gap-2"><MapPin size={16} /> {result.order.address}, {result.order.area}, {result.order.district}</div>
              <div className="flex gap-2"><CreditCard size={16} /> {result.order.payment_method}</div>
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
