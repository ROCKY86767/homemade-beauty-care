import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { getSettings } from '@/lib/settings';
import { useCart } from '@/lib/cart-context';

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

function getJourneySessionId() {
  const key = 'hbc-visitor-journey-session-id';
  try {
    let id = window.sessionStorage.getItem(key) || '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function getCheckoutSessionId() {
  const key = 'hbc-failed-checkout-session';
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `hbc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return `hbc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export default function Analytics() {
  const location = useLocation();
  const { items } = useCart();
  const [metaPixelId, setMetaPixelId] = useState('');
  const [gaReady, setGaReady] = useState(false);
  const [gaId, setGaId] = useState('');

  const isAdminArea = location.pathname === '/admin' || location.pathname.startsWith('/admin/');
  const isAuthUtilityPage = location.pathname === '/login' || location.pathname === '/reset-password';
  const shouldTrack = !isAdminArea && !isAuthUtilityPage;

  useEffect(() => {
    if (!shouldTrack) return;

    const visitorKey = 'hbc-visitor-presence-id';
    let visitorId = '';
    try {
      visitorId = window.localStorage.getItem(visitorKey) || '';
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) {
        visitorId = crypto.randomUUID();
        window.localStorage.setItem(visitorKey, visitorId);
      }
    } catch {
      visitorId = crypto.randomUUID();
    }

    let disposed = false;
    let busy = false;
    const heartbeat = async () => {
      if (disposed || busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        await supabase.functions.invoke('visitor-presence', {
          body: {
            mode: 'heartbeat',
            visitorId,
            currentPath: window.location.pathname + window.location.search + window.location.hash,
            pageTitle: document.title,
            trafficSource: (() => {
              const params = new URLSearchParams(window.location.search);
              const utmSource = params.get('utm_source');
              const utmMedium = params.get('utm_medium');
              const referrer = document.referrer;
              if (utmSource) return `${utmSource} / ${utmMedium || 'unknown'}`;
              if (referrer) {
                try {
                  const host = new URL(referrer).hostname.replace(/^www\\./, '');
                  if (host === window.location.hostname.replace(/^www\\./, '')) return 'Internal navigation';
                  return `${host} / referral`;
                } catch {
                  return 'Referral';
                }
              }
              return 'Direct / none';
            })(),
            referrerHost: (() => {
              try { return document.referrer ? new URL(document.referrer).hostname : ''; }
              catch { return ''; }
            })(),
          },
        });
      } finally {
        busy = false;
      }
    };

    void heartbeat();
    const timer = window.setInterval(() => void heartbeat(), 25000);
    document.addEventListener('visibilitychange', heartbeat);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', heartbeat);
    };
  }, [shouldTrack]);

  useEffect(() => {
    if (!shouldTrack) return;
    let visitorId = '';
    try {
      visitorId = window.localStorage.getItem('hbc-visitor-presence-id') || '';
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId)) {
        visitorId = crypto.randomUUID();
        window.localStorage.setItem('hbc-visitor-presence-id', visitorId);
      }
    } catch {
      visitorId = crypto.randomUUID();
    }
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const referrer = document.referrer;
    let trafficSource = 'Direct / none';
    let referrerHost = '';
    if (utmSource) {
      trafficSource = `${utmSource} / ${utmMedium || 'unknown'}`;
    } else if (referrer) {
      try {
        referrerHost = new URL(referrer).hostname.replace(/^www\./, '');
        trafficSource = referrerHost === window.location.hostname.replace(/^www\./, '')
          ? 'Internal navigation'
          : `${referrerHost} / referral`;
      } catch {
        trafficSource = 'Referral';
      }
    }
    void supabase.functions.invoke('visitor-presence', {
      body: {
        mode: 'pageview',
        visitorId,
        sessionId: getJourneySessionId(),
        currentPath: window.location.pathname + window.location.search + window.location.hash,
        pageTitle: document.title,
        trafficSource,
        referrerHost,
      },
    }).then(({ error }) => {
      if (error) console.error('Page-view analytics could not be saved:', error.message);
    });
  }, [shouldTrack, location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!shouldTrack) return;
    const visitorId = (() => {
      try {
        const id = window.localStorage.getItem('hbc-visitor-presence-id') || '';
        return id || crypto.randomUUID();
      } catch { return crypto.randomUUID(); }
    })();
    const sessionId = getJourneySessionId();
    const pagePath = window.location.pathname + window.location.search + window.location.hash;
    const pageTitle = document.title;
    const enteredAt = Date.now();
    let finished = false;
    const sourceDetails = () => {
      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get('utm_source');
      const utmMedium = params.get('utm_medium');
      const referrer = document.referrer;
      let referrerHost = '';
      let trafficSource = 'Direct / none';
      if (utmSource) trafficSource = `${utmSource} / ${utmMedium || 'unknown'}`;
      else if (referrer) {
        try {
          referrerHost = new URL(referrer).hostname.replace(/^www\\./, '');
          trafficSource = referrerHost === window.location.hostname.replace(/^www\\./, '') ? 'Internal navigation' : `${referrerHost} / referral`;
        } catch { trafficSource = 'Referral'; }
      }
      return { trafficSource, referrerHost };
    };
    const journeySource = sourceDetails();
    const sendEvent = (payload: Record<string, unknown>) => {
      void supabase.functions.invoke('visitor-presence', {
        body: { mode: 'journey-event', visitorId, sessionId, currentPath: pagePath, pageTitle, ...journeySource, ...payload },
      });
    };
    const finishPage = () => {
      if (finished) return;
      finished = true;
      sendEvent({ eventType: 'page_exit', durationSeconds: Math.floor((Date.now() - enteredAt) / 1000) });
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a,button,[role="button"],input[type="submit"],input[type="button"],[data-analytics-click]') : null;
      if (!target) return;
      const tag = target.tagName.toLowerCase();
      const elementText = (target.getAttribute('aria-label') || target.textContent || (target instanceof HTMLInputElement ? target.value : '') || '').trim().replace(/\\s+/g, ' ').slice(0, 200);
      const elementHref = target instanceof HTMLAnchorElement ? target.href : '';
      sendEvent({ eventType: 'click', elementText, elementTag: tag, elementHref });
    };
    document.addEventListener('click', onClick, true);
    window.addEventListener('pagehide', finishPage);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('pagehide', finishPage);
      finishPage();
    };
  }, [shouldTrack, location.pathname, location.search, location.hash]);

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

  useEffect(() => {
    if (!shouldTrack) return;

    if (location.pathname.startsWith('/order-success/')) {
      const sessionId = window.localStorage.getItem('hbc-failed-checkout-session');
      if (sessionId) {
        void supabase.rpc('mark_failed_checkout_converted', { p_session_id: sessionId });
        try {
          window.localStorage.removeItem('hbc-failed-checkout-session');
        } catch {
          // Ignore storage failures.
        }
      }
      return;
    }

    if (location.pathname !== '/checkout') return;

    const sessionId = getCheckoutSessionId();
    let timer: number | undefined;

    const saveLead = async () => {
      const textInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'));
      const telInput = textInputs.find((input) => input.type === 'tel');
      const nameInput = textInputs.find((input) => input.name === 'name') || textInputs.find((input) => input.type === 'text');
      const emailInput = textInputs.find((input) => input.type === 'email');
      const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea'));
      const selects = Array.from(document.querySelectorAll<HTMLSelectElement>('select'));

      const name = nameInput?.value.trim() || '';
      const mobile = telInput?.value.replace(/\s/g, '').trim() || '';
      const email = emailInput?.value.trim() || '';
      const district = selects[0]?.value || '';
      const area = selects[1]?.value || '';
      const address = textareas[0]?.value.trim() || '';

      if (!name && !mobile && !address) return;

      const cartItems = items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name_bn || item.product.name_en || item.product.name || 'Product',
        price: Number(item.product.sale_price ?? item.product.price ?? 0),
        quantity: Number(item.quantity || 1),
        image_url: item.product.image_url || null,
      }));

      const { data: sessionData } = await supabase.auth.getSession();
      await supabase.rpc('upsert_failed_checkout', {
        p_session_id: sessionId,
        p_user_id: sessionData.session?.user?.id || null,
        p_customer_name: name,
        p_mobile: mobile,
        p_email: email,
        p_district: district,
        p_area: area,
        p_address: address,
        p_cart_items: cartItems,
      });
    };

    const scheduleSave = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void saveLead(), 1000);
    };

    document.addEventListener('input', scheduleSave, true);
    document.addEventListener('change', scheduleSave, true);
    scheduleSave();

    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener('input', scheduleSave, true);
      document.removeEventListener('change', scheduleSave, true);
    };
  }, [location.pathname, shouldTrack, items]);

  return null;
}
