/**
 * Builds an optimized public Supabase Storage image URL.
 * External URLs, local assets, videos, and signed URLs are returned unchanged.
 */
export function getOptimizedImageUrl(
  source: string | null | undefined,
  width: number,
  quality = 70,
): string {
  if (!source) return '';
  try {
    const url = new URL(source);
    const objectPrefix = '/storage/v1/object/public/';
    const renderPrefix = '/storage/v1/render/image/public/';

    if (url.pathname.includes(objectPrefix)) {
      url.pathname = url.pathname.replace(objectPrefix, renderPrefix);
    } else if (!url.pathname.includes(renderPrefix)) {
      return source;
    }

    url.searchParams.set('width', String(Math.max(1, Math.min(2500, Math.round(width)))));
    url.searchParams.set('quality', String(Math.max(20, Math.min(100, Math.round(quality)))));
    url.searchParams.set('format', 'webp');
    return url.toString();
  } catch {
    return source;
  }
}
