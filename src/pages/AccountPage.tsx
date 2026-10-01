import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, MapPin, ShoppingBag, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SEO from '@/components/SEO';

export default function AccountPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccount() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        navigate('/login', { replace: true });
        return;
      }

      setEmail(data.session.user.email || '');
      setLoading(false);
    }

    loadAccount();
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500">লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <>
      <SEO title="My Account - Homemade Beauty Care" />

      <div className="min-h-screen bg-cream">
        <div className="section-padding py-10">

          <div className="max-w-4xl mx-auto">

            <h1 className="font-display text-3xl font-bold text-dark mb-2">
              My Account
            </h1>

            <p className="text-gray-500 mb-8">
              আপনার অ্যাকাউন্টের তথ্য ও অর্ডার এখানে দেখুন।
            </p>

            <div className="card p-6 mb-6">
              <div className="flex items-center justify-between gap-4">

                <div>
                  <p className="text-sm text-gray-500 mb-1">
                    Logged in email
                  </p>

                  <p className="font-medium text-ink">
                    {email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>

              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">

              <Link
                to="/my-orders"
                className="card p-6 hover:shadow-md transition-shadow"
              >
                <ShoppingBag
                  size={28}
                  className="text-primary mb-4"
                />

                <h2 className="font-semibold text-ink mb-1">
                  My Orders
                </h2>

                <p className="text-sm text-gray-500">
                  আপনার অর্ডারগুলো দেখুন।
                </p>
              </Link>

              <Link
                to="/account/address"
                className="card p-6 hover:shadow-md transition-shadow"
              >
                <MapPin
                  size={28}
                  className="text-primary mb-4"
                />

                <h2 className="font-semibold text-ink mb-1">
                  Saved Addresses
                </h2>

                <p className="text-sm text-gray-500">
                  আপনার সংরক্ষিত ঠিকানা দেখুন।
                </p>
              </Link>

              <Link
                to="/wishlist"
                className="card p-6 hover:shadow-md transition-shadow"
              >
                <Heart
                  size={28}
                  className="text-primary mb-4"
                />

                <h2 className="font-semibold text-ink mb-1">
                  Wishlist
                </h2>

                <p className="text-sm text-gray-500">
                  পছন্দের পণ্যগুলো দেখুন।
                </p>
              </Link>

            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-gray-300 bg-white p-6">

              <h2 className="font-semibold text-gray-900">
                Account Information
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                আপনার অ্যাকাউন্ট passwordless email verification দিয়ে সুরক্ষিত।
                Verified email-এর সাথে আপনার account information এবং saved
                addresses যুক্ত থাকবে।
              </p>

            </div>

          </div>

        </div>
      </div>
    </>
  );
}