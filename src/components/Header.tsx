import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  Heart,
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { getSettings } from '@/lib/settings';
import type { SiteSettings } from '@/lib/types';

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/shop' },
  { label: 'Skin care', path: '/category/skin-care' },
  { label: 'Hair care', path: '/category/hair-care' },
  { label: 'New Product', path: '/new-arrivals' },
  { label: 'Offer', path: '/offers' },
  { label: 'About Us', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const navigate = useNavigate();
  const { cartCount, wishlist } = useCart();

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (search.trim()) {
      navigate(`/shop?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
      setMobileOpen(false);
    }
  };

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-dark text-white text-sm">
        <div className="section-padding flex items-center justify-center py-2 text-center">
          <p className="font-medium">
            {settings?.announcement_bn ||
              'সারা বাংলাদেশে ক্যাশ অন ডেলিভারি | অর্ডার করতে কল করুন: 01999478203'}
          </p>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${
          scrolled ? 'shadow-md' : 'shadow-sm'
        }`}
      >
        <div className="section-padding">
          <div className="flex items-center gap-2 sm:gap-4 py-3 sm:py-4">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-cream"
              aria-label="Open menu"
            >
              <Menu size={26} />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0 max-w-[145px] sm:max-w-none">
              <img
                src="/new-homemade-logo.png"
                alt="Homemade Beauty Care"
                className="h-10 w-10 sm:h-16 sm:w-16 object-contain"
              />

              <div className="block sm:block min-w-0">
                <h1 className="font-display text-[13px] sm:text-lg font-bold leading-tight text-dark truncate">
                  {settings?.brand_name || 'Homemade Beauty Care'}
                </h1>

                <p className="hidden sm:block text-xs text-primary leading-tight">
                  {settings?.brand_tagline_bn ||
                    'প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া'}
                </p>
              </div>
            </Link>

            {/* Search bar */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-xl mx-auto"
            >
              <div className="relative w-full">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="আপনার পছন্দের পণ্য খুঁজুন..."
                  className="w-full rounded-full border border-gray-200 bg-cream py-2.5 pl-5 pr-12 text-sm outline-none transition-all focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                />

                <button
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-dark"
                  aria-label="Search"
                >
                  <Search size={18} />
                </button>
              </div>
            </form>

            {/* Icons */}
            <div className="flex items-center gap-0 sm:gap-2 ml-auto shrink-0">
              {/* My Account */}
              <Link
                to="/account"
                className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-cream hover:text-primary"
                aria-label="My Account"
                title="My Account"
              >
                <User size={22} />
              </Link>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-cream hover:text-primary"
                aria-label="Wishlist"
                title="Wishlist"
              >
                <Heart size={22} />

                {wishlist.length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-white">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-cream hover:text-primary"
                aria-label="Cart"
                title="Cart"
              >
                <ShoppingCart size={22} />

                {cartCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile search */}
          <form onSubmit={handleSearch} className="md:hidden pb-3">
            <div className="relative w-full">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="আপনার পছন্দের পণ্য খুঁজুন..."
                className="w-full rounded-full border border-gray-200 bg-cream py-2.5 pl-5 pr-12 text-sm outline-none transition-all focus:border-primary focus:bg-white"
              />

              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white"
                aria-label="Search"
              >
                <Search size={18} />
              </button>
            </div>
          </form>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:block border-t border-gray-100">
          <div className="section-padding">
            <ul className="flex items-center gap-1 py-2">
              {NAV_LINKS.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="block px-3 py-2 text-sm font-medium text-ink rounded-lg transition-colors hover:bg-cream hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl animate-slide-in overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <span className="font-display text-lg font-bold text-dark">
                Menu
              </span>

              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-cream"
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>

            <ul className="py-2">
              {NAV_LINKS.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between px-5 py-3 text-base font-medium text-ink transition-colors hover:bg-cream hover:text-primary"
                  >
                    {link.label}

                    <ChevronDown
                      size={16}
                      className="-rotate-90 text-gray-400"
                    />
                  </Link>
                </li>
              ))}

              {/* My Account */}
              <li>
                <Link
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-5 py-3 text-base font-medium text-ink transition-colors hover:bg-cream hover:text-primary"
                >
                  My Account

                  <ChevronDown
                    size={16}
                    className="-rotate-90 text-gray-400"
                  />
                </Link>
              </li>

              {/* My Orders */}
              <li>
                <Link
                  to="/my-orders"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-5 py-3 text-base font-medium text-ink transition-colors hover:bg-cream hover:text-primary"
                >
                  My Orders

                  <ChevronDown
                    size={16}
                    className="-rotate-90 text-gray-400"
                  />
                </Link>
              </li>

              {/* Track Order */}
              <li>
                <Link
                  to="/track-order"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-5 py-3 text-base font-medium text-ink transition-colors hover:bg-cream hover:text-primary"
                >
                  Track Order

                  <ChevronDown
                    size={16}
                    className="-rotate-90 text-gray-400"
                  />
                </Link>
              </li>

              {/* Wishlist */}
              <li>
                <Link
                  to="/wishlist"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-between px-5 py-3 text-base font-medium text-ink transition-colors hover:bg-cream hover:text-primary"
                >
                  Wishlist

                  <ChevronDown
                    size={16}
                    className="-rotate-90 text-gray-400"
                  />
                </Link>
              </li>
            </ul>

            <div className="p-4 border-t border-gray-100">
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="block rounded-full bg-dark py-3 text-center text-sm font-medium text-white"
              >
                Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}