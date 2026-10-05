import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
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
      className="fixed right-4 bottom-20 sm:right-5 sm:bottom-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-all duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#25D366]/30"
    >
      <MessageCircle size={29} strokeWidth={2.2} />
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-[#25D366]" />
    </a>
  );
}
