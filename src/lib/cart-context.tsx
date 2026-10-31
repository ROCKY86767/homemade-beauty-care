import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Product, CartItem } from '@/lib/types';

interface CartContextType {
  items: CartItem[];
  wishlist: string[];
  addToCart: (product: Product, quantity?: number) => { success: boolean; message?: string };
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  cartCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_KEY = 'hbc_cart';
const WISHLIST_KEY = 'hbc_wishlist';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CartItem => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Partial<CartItem>;
      return !!candidate.product &&
        typeof candidate.product.id === 'string' &&
        Number.isFinite(Number(candidate.product.price)) &&
        Number(candidate.product.price) >= 0 &&
        Number.isInteger(candidate.quantity) &&
        Number(candidate.quantity) > 0;
    });
  } catch {
    return [];
  }
}

function loadWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Hydrate synchronously so the initial empty state is never written over a
  // previously saved cart before the first render's effects run.
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [wishlist, setWishlist] = useState<string[]>(loadWishlist);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Unable to persist cart:', error);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    } catch (error) {
      console.error('Unable to persist wishlist:', error);
    }
  }, [wishlist]);

  const addToCart = (product: Product, quantity = 1): { success: boolean; message?: string } => {
    if (!product || typeof product.id !== 'string' || !product.id) {
      return { success: false, message: 'পণ্যটি সঠিকভাবে পাওয়া যায়নি। আবার চেষ্টা করুন।' };
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { success: false, message: 'সঠিক পরিমাণ নির্বাচন করুন।' };
    }
    const stock = Number(product.stock);
    const price = Number(product.price);
    if (!Number.isFinite(stock) || stock < 1) {
      return { success: false, message: 'পণ্যটি বর্তমানে স্টকে নেই।' };
    }
    if (!Number.isFinite(price) || price < 0) {
      return { success: false, message: 'পণ্যের মূল্য সঠিক নয়। অনুগ্রহ করে পরে চেষ্টা করুন।' };
    }

    const existing = items.find(i => i.product.id === product.id);
    const currentQty = existing ? Number(existing.quantity) : 0;
    const newQty = currentQty + quantity;
    if (newQty > stock) {
      return { success: false, message: `সর্বোচ্চ ${stock} টি অর্ডার করতে পারবেন` };
    }

    try {
      const fbq = (window as Window & { fbq?: (...args: any[]) => void }).fbq;
      if (fbq) fbq('track', 'AddToCart', { content_ids: [product.id], content_name: product.name_bn, content_type: 'product', value: price * quantity, currency: 'BDT' });
    } catch (error) {
      console.error('Meta Pixel AddToCart error:', error);
    }

    setItems(prev => {
      const current = prev.find(i => i.product.id === product.id);
      if (current) {
        const nextQuantity = current.quantity + quantity;
        if (nextQuantity > stock) return prev;
        return prev.map(i => i.product.id === product.id ? { ...i, product, quantity: nextQuantity } : i);
      }
      return [...prev, { product, quantity }];
    });
    return { success: true };
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    setItems(prev => prev.map(item => {
      if (item.product.id !== productId) return item;
      const stock = Number(item.product.stock);
      if (!Number.isFinite(stock) || stock < 1) return item;
      return { ...item, quantity: Math.min(quantity, stock) };
    }));
  };

  const clearCart = () => setItems([]);

  const toggleWishlist = (productId: string) => {
    if (!productId) return;
    setWishlist(prev => prev.includes(productId)
      ? prev.filter(id => id !== productId)
      : [...prev, productId]);
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);
  const cartCount = items.reduce((sum, item) => sum + (Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 0), 0);
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.product?.price);
    const quantity = Number(item.quantity);
    return Number.isFinite(price) && price >= 0 && Number.isInteger(quantity) && quantity > 0
      ? sum + price * quantity
      : sum;
  }, 0);

  return (
    <CartContext.Provider value={{
      items, wishlist, addToCart, removeFromCart, updateQuantity, clearCart,
      toggleWishlist, isInWishlist, cartCount, subtotal,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
