import { useEffect, useState } from 'react';
import { getSettings } from '@/lib/settings';
import type { SiteSettings } from '@/lib/types';

function normalizeWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return '88' + digits;
  return '880' + digits;
}

export default function WhatsAppButton() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  if (settings?.contact_whatsapp_enabled === false) return null;

  const number = normalizeWhatsAppNumber(settings?.whatsapp_number || '01999478203');
  const message = encodeURIComponent('আসসালামু আলাইকুম, Homemade Beauty Care থেকে কিছু জানতে চাই।');
  const href = `https://wa.me/${number}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp এ যোগাযোগ করুন"
      title="WhatsApp এ যোগাযোগ করুন"
      className="fixed right-4 bottom-20 sm:right-5 sm:bottom-5 z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#25D366]/30"
    >
      <svg viewBox="0 0 32 32" width="25" height="25" aria-hidden="true" fill="currentColor"><path d="M16.02 3.2A12.7 12.7 0 0 0 5.1 22.36L3.4 28.6l6.4-1.68A12.7 12.7 0 1 0 16.02 3.2Zm0 23.1c-1.98 0-3.92-.53-5.62-1.54l-.4-.24-3.8 1 1.02-3.7-.26-.42A10.48 10.48 0 1 1 16.02 26.3Zm5.75-7.85c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.52-.16-.74.16-.22.33-.84 1.05-1.03 1.27-.19.22-.38.25-.7.08-.33-.16-1.38-.51-2.63-1.63-.97-.87-1.63-1.95-1.82-2.28-.19-.32-.02-.5.14-.66.15-.14.33-.38.49-.57.16-.19.22-.33.33-.55.11-.22.05-.41-.03-.57-.08-.16-.74-1.78-1.01-2.44-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71s1.17 3.14 1.33 3.36c.16.22 2.3 3.51 5.57 4.92.78.34 1.39.55 1.86.7.78.25 1.49.21 2.05.13.63-.09 1.9-.78 2.17-1.54.27-.76.27-1.41.19-1.54-.08-.14-.3-.22-.62-.38Z"/></svg>
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#25D366]" />
    </a>
  );
}
