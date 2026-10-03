import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  canonical?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

export default function SEO({
  title,
  description,
  image,
  canonical,
  structuredData,
}: SEOProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (
      selector: string,
      attributes: Record<string, string>,
      content: string | undefined
    ) => {
      if (!content) return;
      let meta = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        Object.entries(attributes).forEach(([key, value]) => {
          meta!.setAttribute(key, value);
        });
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', { name: 'description' }, description);
    setMeta('meta[property="og:title"]', { property: 'og:title' }, title);
    setMeta('meta[property="og:description"]', { property: 'og:description' }, description);
    setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
    setMeta('meta[property="og:image"]', { property: 'og:image' }, image);
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, image);

    const canonicalUrl = canonical || window.location.href;
    let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonicalUrl;

    const schemaId = 'hbc-structured-data';
    const existingSchema = document.getElementById(schemaId);
    if (existingSchema) existingSchema.remove();

    if (structuredData) {
      const script = document.createElement('script');
      script.id = schemaId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    return () => {
      const current = document.getElementById(schemaId);
      if (current) current.remove();
    };
  }, [title, description, image, canonical, structuredData]);

  return null;
}
