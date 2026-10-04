import { useEffect } from 'react';
import { getSettings } from '@/lib/settings';

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  canonical?: string;
  structuredData?: unknown;
}

export default function SEO({
  title,
  description,
  image,
  canonical,
  structuredData,
}: SEOProps) {
  useEffect(() => {
    let active = true;

    getSettings().then((settings) => {
      if (!active) return;

      const siteTitle = settings.seo_site_title?.trim() || 'Homemade Beauty Care';
      const finalTitle = title?.trim() || siteTitle;
      const finalDescription = settings.seo_meta_description?.trim() || description;
      const finalImage = settings.seo_og_image_url?.trim() || image;
      const finalCanonical = settings.seo_canonical_url?.trim() || canonical || window.location.href;

      document.title = finalTitle;

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

      setMeta('meta[name="description"]', { name: 'description' }, finalDescription);
      setMeta('meta[property="og:title"]', { property: 'og:title' }, finalTitle);
      setMeta('meta[property="og:description"]', { property: 'og:description' }, finalDescription);
      setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website');
      setMeta('meta[property="og:image"]', { property: 'og:image' }, finalImage);
      setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image');
      setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, finalTitle);
      setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, finalDescription);
      setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, finalImage);

      let canonicalLink = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = finalCanonical;

      const verificationCode = settings.google_search_console_code?.trim();
      if (verificationCode) {
        setMeta(
          'meta[name="google-site-verification"]',
          { name: 'google-site-verification' },
          verificationCode
        );
      }

      const robots = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
      if (robots) {
        robots.content = settings.seo_noindex ? 'noindex,nofollow' : 'index,follow';
      } else {
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = settings.seo_noindex ? 'noindex,nofollow' : 'index,follow';
        document.head.appendChild(meta);
      }

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
    });

    return () => {
      active = false;
      const current = document.getElementById('hbc-structured-data');
      if (current) current.remove();
    };
  }, [title, description, image, canonical, structuredData]);

  return null;
}

export function applyNoindex(noindex: boolean) {
  const name = 'robots';
  let meta = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = noindex ? 'noindex,nofollow' : 'index,follow';
}
