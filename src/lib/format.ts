export function formatPrice(price: number): string {
  return `৳${Math.round(price).toLocaleString('en-US')}`;
}

export function calculateDiscount(price: number, oldPrice: number | null): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(oldPrice - price);
}

export function calculateDiscountPercent(price: number, oldPrice: number | null): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
