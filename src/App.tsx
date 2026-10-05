import { lazy, Suspense, useEffect, useState } from 'react';
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

const HomePage = lazy(() => import('@/pages/HomePage'));
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('@/pages/OrderSuccessPage'));
const OrderTrackingPage = lazy(() => import('@/pages/OrderTrackingPage'));
const MyOrdersPage = lazy(() => import('@/pages/MyOrdersPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const WishlistPage = lazy(() => import('@/pages/WishlistPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));
const SavedAddressPage = lazy(() => import('@/pages/SavedAddressPage'));
const ReturnsRefundsPage = lazy(() => import('@/pages/ReturnsRefundsPage'));
const DeliveryInformationPage = lazy(() => import('@/pages/DeliveryInformationPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const InvoicePage = lazy(() => import('@/pages/InvoicePage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));

;