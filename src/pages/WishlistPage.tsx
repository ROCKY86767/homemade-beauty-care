import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/types';
import { useEffect, useState } from 'react';
import ProductCard from '@/components/ProductCard';

export default function WishlistPage() {
  const { wishlist } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wishlist.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .in('id', wishlist);
      setProducts(data || []);
      setLoading(false);
    })();
  }, [wishlist]);

  if (loading) {
    return (
      <div className="flex justify-center min-h-[60vh] items-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-cream mb-6">
          <Heart size={40} className="text-primary" />
        </div>
        <h2 className="font-display text-2xl font-bold text-dark mb-2">আপনার উইশলিস্ট খালি</h2>
        <p className="text-gray-500 mb-6">পছন্দের পণ্য উইশলিস্টে যোগ করুন।</p>
        <Link to="/shop" className="btn-primary">শপ করুন</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="section-padding py-8">
        <h1 className="font-display text-3xl font-bold text-dark mb-8">আপনার উইশলিস্ট</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
