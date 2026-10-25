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
  const [gaReady, setGaReady] = useState(false);
  const [gaId, setGaId] = useState('');

  const isAdminArea = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const isAuthUtilityPage = location.pathname === '/login' || location.pathname === '/reset-password';
  const shouldTrack = !isAdminArea && !isAuthUtilityPage;

  useEffect(() => {
    let active = true;

    if (!shouldTrack) {
      setGaReady(false);
      setGaId('');
      setMetaPixelId('');
      return () => {
        active = false;
      };
    }

    getSettings().then(async (settings) => {
      if (!active) return;

      const configuredGaId = settings.google_analytics_enabled
        ? settings.google_analytics_id?.trim()
        : '';

      if (configuredGaId) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function (...args: any[]) {
          window.dataLayer.push(args);
        };
        window.gtag('js', new Date());
        window.gtag('config', configuredGaId, { send_page_view: false });

        if (!document.querySelector('script[data-ga4]')) {
          const script = document.createElement('script');
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(configuredGaId)}`;
          script.dataset.ga4 = 'true';
          document.head.appendChild(script);
        }

        setGaId(configuredGaId);
        setGaReady(true);
      }

      if (settings.meta_pixel_enabled) {
        const { data } = await supabase.rpc('get_public_meta_pixel');
        if (active && data?.enabled && data.pixel_id) {
          setMetaPixelId(data.pixel_id);
        }
      }
    }).catch((error) => {
      console.error('Analytics settings could not be loaded:', error);
    });

    return () => {
      active = false;
    };
  }, [shouldTrack]);

  useEffect(() => {
    if (!shouldTrack || !metaPixelId || document.querySelector('script[data-meta-pixel]')) return;

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
  }, [metaPixelId, shouldTrack]);

  useEffect(() => {
    if (!shouldTrack) return;

    if (gaReady && gaId && window.gtag) {
      window.gtag('event', 'page_view', {
        page_location: window.location.href,
        page_path: location.pathname + location.search + location.hash,
        page_title: document.title,
      });
    }

    if (metaPixelId && window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [gaReady, gaId, metaPixelId, shouldTrack, location.pathname, location.search, location.hash]);

  return null;
}
