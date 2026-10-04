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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    try {
      const cart = localStorage.getItem(CART_KEY);
      if (cart) setItems(JSON.parse(cart));
      const wl = localStorage.getItem(WISHLIST_KEY);
      if (wl) setWishlist(JSON.parse(wl));
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  const addToCart = (product: Product, quantity = 1): { success: boolean; message?: string } => {
    const existing = items.find(i => i.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    const newQty = currentQty + quantity;
    if (newQty > product.stock) {
      return { success: false, message: `সর্বোচ্চ ${product.stock} টি অর্ডার করতে পারবেন` };
    }
    try {
      const fbq = (window as Window & { fbq?: (...args: any[]) => void }).fbq;
      if (fbq) fbq('track', 'AddToCart', { content_ids: [product.id], content_name: product.name_bn, content_type: 'product', value: Number(product.price) * quantity, currency: 'BDT' });
    } catch (error) {
      console.error('Meta Pixel AddToCart error:', error);
    }

    setItems(prev => {
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: newQty }
            : i
        );
      }
      return [...prev, { product, quantity }];
    });
    return { success: true };
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    const item = items.find(i => i.product.id === productId);
    if (item && quantity > item.product.stock) {
      quantity = item.product.stock;
    }
    setItems(prev =>
      prev.map(i =>
        i.product.id === productId ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const toggleWishlist = (productId: string) => {
    setWishlist(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        wishlist,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        toggleWishlist,
        isInWishlist,
        cartCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
