import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

import ScrollToTop from '@/components/ScrollToTop';
import { CartProvider } from '@/lib/cart-context';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';

import HomePage from '@/pages/HomePage';
import ShopPage from '@/pages/ShopPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrderSuccessPage from '@/pages/OrderSuccessPage';
import OrderTrackingPage from '@/pages/OrderTrackingPage';
import MyOrdersPage from '@/pages/MyOrdersPage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import WishlistPage from '@/pages/WishlistPage';
import AccountPage from '@/pages/AccountPage';
import SavedAddressPage from '@/pages/SavedAddressPage';

import AdminPage from '@/pages/AdminPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import LoginPage from '@/pages/LoginPage';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer />
      <MobileNav />
    </div>
  );
}

function AppContent() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleRecovery = async () => {
      const hash = window.location.hash;

      if (!hash) return;

      const hashParams = new URLSearchParams(hash.substring(1));

      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (type === 'recovery' && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Recovery session error:', error);
          return;
        }

        navigate('/reset-password', { replace: true });
      }
    };

    handleRecovery();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        navigate('/reset-password', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route path="/admin" element={<AdminPage />} />

        <Route
  path="/login"
  element={<LoginPage />}
/>

        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />

        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/category/:slug" element={<ShopPage />} />
                <Route path="/offers" element={<ShopPage isOffers />} />

                <Route
                  path="/new-arrivals"
                  element={<ShopPage isNewArrivals />}
                />

                <Route
                  path="/product/:slug"
                  element={<ProductDetailPage />}
                />

                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />

                <Route
                  path="/order-success/:orderNumber"
                  element={<OrderSuccessPage />}
                />

                <Route
                  path="/track-order"
                  element={<OrderTrackingPage />}
                />

                <Route
                  path="/my-orders"
                  element={<MyOrdersPage />}
                />

                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />

                <Route
                  path="/account"
                  element={<AccountPage />}
                />

                <Route
                  path="/account/address"
                  element={<SavedAddressPage />}
                />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;