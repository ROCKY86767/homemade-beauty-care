import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Grid3x3, Search, User, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useState } from 'react';

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
      setSearchOpen(false);
    }
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden border-t border-gray-100 bg-white/95 shadow-lg backdrop-blur safe-area-bottom">
        <div className="flex items-center justify-around py-2">
          <Link
            to="/"
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
              isActive('/') ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <Home size={22} />
            <span className="text-xs font-medium">হোম</span>
          </Link>
          <Link
            to="/shop"
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
              isActive('/shop') || isActive('/category') ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <Grid3x3 size={22} />
            <span className="text-xs font-medium">ক্যাটাগরি</span>
          </Link>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-500 transition-colors hover:text-primary"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary -mt-4 shadow-md">
              <Search size={20} className="text-white" />
            </div>
          </button>
          <Link
            to="/cart"
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
              isActive('/cart') ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white">
                {cartCount}
              </span>
            )}
            <span className="text-xs font-medium">কার্ট</span>
          </Link>
          <Link
            to="/account"
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
              isActive('/account') ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <User size={22} />
            <span className="text-xs font-medium">অ্যাকাউন্ট</span>
          </Link>
        </div>
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/40 animate-fade-in" />
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl p-4 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <form onSubmit={handleSearch}>
              <input
                type="text"
                autoFocus
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                placeholder="আপনার পছন্দের পণ্য খুঁজুন..."
                className="w-full rounded-full border border-gray-200 bg-cream px-5 py-3 text-sm outline-none focus:border-primary"
              />
            </form>
          </div>
        </div>
      )}
    </>
  );
}
