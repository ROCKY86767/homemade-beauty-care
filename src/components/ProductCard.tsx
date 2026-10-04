import { Link } from 'react-router-dom';
import { Heart, Eye, ShoppingCart, Zap } from 'lucide-react';
import type { Product } from '@/lib/types';
import { useCart } from '@/lib/cart-context';
import { formatPrice, calculateDiscountPercent } from '@/lib/format';
import StarRating from './StarRating';

interface ProductCardProps {
  product: Product;
  compactActions?: boolean;
}

export default function ProductCard({ product, compactActions = false }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const discount = calculateDiscountPercent(product.price, product.old_price);
  const inWishlist = isInWishlist(product.id);

  return (
    <div className="group card shimmer-on-hover overflow-hidden border border-gray-50 hover:border-primary/20 animate-reveal-scale">
      <div className="relative aspect-square overflow-hidden bg-cream">
        <Link to={`/product/${product.slug}`}>
          <img
            src={product.image_url}
            alt={product.name_bn}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {discount > 0 && (
            <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              -{discount}%
            </span>
          )}
          {product.is_new && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              NEW
            </span>
          )}
          {product.is_best_seller && (
            <span className="rounded-full bg-dark px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
              বেস্ট সেলার
            </span>
          )}
        </div>

        <button
          onClick={() => toggleWishlist(product.id)}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-all duration-300 hover:scale-110 ${
            inWishlist
              ? 'bg-accent text-white'
              : 'bg-white/90 text-ink hover:bg-accent hover:text-white'
          }`}
          aria-label="Add to wishlist"
        >
          <Heart size={18} className={inWishlist ? 'fill-white' : ''} />
        </button>

        <div className="absolute inset-x-3 bottom-3 flex gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
          <button
            onClick={() => addToCart(product)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-primary-dark active:scale-95"
          >
            <ShoppingCart size={compactActions ? 14 : 16} />
            Add to Cart
          </button>
          <Link
            to={`/product/${product.slug}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition-all hover:bg-cream hover:scale-110 active:scale-95"
            aria-label="Quick view"
          >
            <Eye size={18} className="text-ink" />
          </Link>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-display text-sm sm:text-base font-semibold text-ink transition-colors hover:text-primary line-clamp-1">
            {product.name_bn}
          </h3>
        </Link>
        {product.short_description_bn && (
          <p className="mt-1 text-xs sm:text-sm text-gray-500 line-clamp-1">
            {product.short_description_bn}
          </p>
        )}

        <div className="mt-2 flex items-center gap-2">
          <StarRating rating={product.rating} size={14} />
          <span className="text-xs text-gray-400">
            {product.rating} ({product.review_count})
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-base sm:text-lg font-bold text-ink">
            {formatPrice(product.price)}
          </span>
          {product.old_price && product.old_price > product.price && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.old_price)}
            </span>
          )}
        </div>

        <div className="mt-2.5 sm:mt-3 flex gap-1.5 sm:gap-2 lg:hidden">
          <button
            onClick={() => addToCart(product)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-full bg-primary font-medium text-white transition-all hover:bg-primary-dark active:scale-95 ${compactActions ? "py-1.5 sm:py-2 text-[11px] sm:text-xs" : "py-2 sm:py-2.5 text-xs sm:text-sm"}`}
          >
            <ShoppingCart size={16} />
            Add
          </button>
          <Link
            to={`/product/${product.slug}`}
            className={`flex flex-1 items-center justify-center gap-1 rounded-full bg-accent font-medium text-white transition-all hover:bg-accent-dark active:scale-95 ${compactActions ? "py-1.5 sm:py-2 text-[11px] sm:text-xs" : "py-2 sm:py-2.5 text-xs sm:text-sm"}`}
          >
            <Zap size={compactActions ? 14 : 16} />
            Buy Now
          </Link>
        </div>
      </div>
    </div>
  );
}
