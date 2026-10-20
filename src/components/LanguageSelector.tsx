import { useEffect, useState } from 'react';

type Language = 'bn' | 'en';

declare global {
  interface Window {
    google?: { translate?: { TranslateElement: new (options: Record<string, unknown>, elementId: string) => unknown } };
    googleTranslateElementInit?: () => void;
  }
}

const LANGUAGE_KEY = 'hbc-site-language';

function setTranslateCookie(language: Language) {
  const value = language === 'en' ? '/bn/en' : '/bn/bn';
  document.cookie = 'googtrans=' + value + '; path=/';
  const domain = window.location.hostname;
  if (domain && domain !== 'localhost') document.cookie = 'googtrans=' + value + '; domain=.' + domain + '; path=/';
}

function applyLanguage(language: Language) {
  try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Storage may be unavailable. */ }
  setTranslateCookie(language);
  window.location.reload();
}

export default function LanguageSelector() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin') || ['/login', '/reset-password'].includes(window.location.pathname)) return;
    let saved: string | null = null;
    try { saved = localStorage.getItem(LANGUAGE_KEY); } catch { /* Storage may be unavailable. */ }
    if (saved !== 'bn' && saved !== 'en') setOpen(true);
    const init = () => {
      if (!window.google?.translate?.TranslateElement) return;
      const mount = document.getElementById('google_translate_element');
      if (!mount || mount.dataset.initialized === 'true') return;
      mount.dataset.initialized = 'true';
      new window.google.translate.TranslateElement({ pageLanguage: 'bn', includedLanguages: 'bn,en', autoDisplay: false, layout: 0 }, 'google_translate_element');
    };
    window.googleTranslateElementInit = init;
    if (!document.querySelector('script[data-hbc-google-translate]')) {
      const script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      script.dataset.hbcGoogleTranslate = 'true';
      document.head.appendChild(script);
    } else init();
    return () => { window.googleTranslateElementInit = undefined; };
  }, []);
  if (window.location.pathname.startsWith('/admin') || ['/login', '/reset-password'].includes(window.location.pathname)) return null;
  return (
    <>
      <div id="google_translate_element" className="hbc-google-translate" aria-hidden="true" />
      {open && <div className="hbc-language-overlay" role="dialog" aria-modal="true" aria-labelledby="hbc-language-title">
        <div className="hbc-language-modal">
          <div className="hbc-language-leaf" aria-hidden="true">✿</div>
          <p className="hbc-language-eyebrow">HOMEMADE BEAUTY CARE</p>
          <h2 id="hbc-language-title" className="hbc-language-title">স্বাগতম | Welcome</h2>
          <p className="hbc-language-description">আপনি কোন ভাষায় ওয়েবসাইট দেখতে চান?<span>Which language would you prefer?</span></p>
          <button className="hbc-language-option hbc-language-bn" onClick={() => applyLanguage('bn')}>
            <span className="hbc-language-option-title">বাংলা</span><span className="hbc-language-option-subtitle">সম্পূর্ণ ওয়েবসাইট বাংলায় দেখুন</span>
          </button>
          <button className="hbc-language-option hbc-language-en" onClick={() => applyLanguage('en')}>
            <span className="hbc-language-option-title">English</span><span className="hbc-language-option-subtitle">View the website in English</span>
          </button>
          <p className="hbc-language-note">আপনার পছন্দের ভাষা মনে রাখা হবে · Your choice will be remembered</p>
        </div>
      </div>}
    </>
  );
}
