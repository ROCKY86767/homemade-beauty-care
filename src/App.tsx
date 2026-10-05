import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

import ScrollToTop from '@/components/ScrollToTop';
import { CartProvider } from '@/lib/cart-context';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import LiveChat from '@/components/LiveChat';
import WhatsAppButton from '@/components/WhatsAppButton';
import Analytics from '@/components/Analytics';
import { getSettings } from '@/lib/settings';
import type { SiteSettings } from '@/lib/types';

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
import ReturnsRefundsPage from '@/pages/ReturnsRefundsPage';
import DeliveryInformationPage from '@/pages/DeliveryInformationPage';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import InvoicePage from '@/pages/InvoicePage';

import AdminPage from '@/pages/AdminPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import LoginPage from '@/pages/LoginPage';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-w-0 min-h-screen flex flex-col overflow-x-hidden">
      <Header />
      <main className="w-full min-w-0 flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer />
      <MobileNav />
      <LiveChat />
      <WhatsAppButton />
    </div>
  );
}

function AppContent() {
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getSettings().then(setSiteSettings);
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

  const pathname = window.location.pathname;
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAuthUtilityPage = pathname === '/login' || pathname === '/reset-password';
  const showMaintenance = siteSettings?.maintenance_mode === true && !isAdminArea && !isAuthUtilityPage;

  if (showMaintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-6 text-center">
        <div className="max-w-lg rounded-3xl border border-brand-border bg-white p-8 sm:p-12 brand-shadow">
          <img
            src={siteSettings?.logo_url || '/new-homemade-logo.png'}
            alt={siteSettings?.brand_name || 'Homemade Beauty Care'}
            className="mx-auto h-20 w-20 object-contain"
          />
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Maintenance Mode</p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-dark">
            We’ll be back soon
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-gray-600">
            {siteSettings?.brand_name || 'Homemade Beauty Care'} is temporarily unavailable while we make some improvements. Please check back shortly.
          </p>
          {siteSettings?.brand_tagline_bn && (
            <p className="mt-4 text-sm font-medium text-primary">{siteSettings.brand_tagline_bn}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route
          path="*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/category/:slug" element={<ShopPage />} />
                <Route path="/offers" element={<ShopPage isOffers />} />
                <Route path="/new-arrivals" element={<ShopPage isNewArrivals />} />
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
                <Route path="/track-order" element={<OrderTrackingPage />} />
                <Route path="/my-orders" element={<MyOrdersPage />} />
                <Route path="/returns-refunds" element={<ReturnsRefundsPage />} />
                <Route path="/delivery-information" element={<DeliveryInformationPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/invoice" element={<InvoicePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/account/address" element={<SavedAddressPage />} />
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
      <Analytics />
      <CartProvider>
        <AppContent />
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;