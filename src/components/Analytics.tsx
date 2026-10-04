import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getSettings } from '@/lib/settings';

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

export default function Analytics() {
  const location = useLocation();
  const [metaPixelId, setMetaPixelId] = useState('');

  useEffect(() => {
    let active = true;

    getSettings().then(settings => {
      if (!active) return;

      const gaId = settings.google_analytics_enabled
        ? settings.google_analytics_id
        : '';

      if (gaId && !document.querySelector('script[data-ga4]')) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = function (...args: any[]) {
          window.dataLayer.push(args);
        };
        window.gtag('js', new Date());
        window.gtag('config', gaId, { send_page_view: false });

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
        script.dataset.ga4 = 'true';
        document.head.appendChild(script);
      }
    });

    supabase.rpc('get_public_meta_pixel').then(({ data }) => {
      if (active && data?.enabled && data.pixel_id) {
        setMetaPixelId(data.pixel_id);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!metaPixelId || document.querySelector('script[data-meta-pixel]')) return;

    window.fbq = window.fbq || function (...args: any[]) {
      (window.fbq as any).callMethod
        ? (window.fbq as any).callMethod(...args)
        : (window.fbq as any).queue.push(args);
    };

    (window.fbq as any).push = (window.fbq as any).push || window.fbq;
    (window.fbq as any).loaded = true;
    (window.fbq as any).version = '2.0';
    (window.fbq as any).queue = (window.fbq as any).queue || [];
    (window.fbq as any)('init', metaPixelId);

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    script.dataset.metaPixel = 'true';
    document.head.appendChild(script);
  }, [metaPixelId]);

  useEffect(() => {
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_location: window.location.href,
        page_path: location.pathname,
        page_title: document.title,
      });
    }

    if (metaPixelId && window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [metaPixelId, location.pathname, location.search, location.hash]);

  return null;
}
