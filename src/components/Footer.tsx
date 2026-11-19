import { Link } from 'react-router-dom';
import { ArrowRight, Facebook, Instagram, MessageCircle, Youtube } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getSettings, subscribeToSettings } from '@/lib/settings';
import type { SiteSettings } from '@/lib/types';

const toBangladeshPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `880${digits.slice(1)}`;
  return digits;
};

const FOOTER_LINKS = {
  'QUICK LINKS': [
    { label: 'Home', path: '/' },
    { label: 'About Us', path: '/about' },
    { label: 'Shop', path: '/shop' },
    { label: 'Contact', path: '/contact' },
  ],
  'CUSTOMER SERVICE': [
    { label: 'Track Order', path: '/track-order' },
    { label: 'Returns and Refunds', path: '/returns-refunds' },
    { label: 'Delivery Information', path: '/delivery-information' },
    { label: 'Privacy Policy', path: '/privacy-policy' },
  ],
};

export default function Footer({ hidden = false, waitForSettings = false }: { hidden?: boolean; waitForSettings?: boolean }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(error => console.error('Footer settings load error:', error))
      .finally(() => setSettingsLoaded(true));
    return subscribeToSettings(setSettings);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    if (settings?.newsletter_enabled === false) return;
    e.preventDefault();
    if (!email.trim()) return;
    const { error } = await supabase.from('newsletter').insert({ email: email.trim() });

    if (error) {
      console.error('Newsletter subscription error:', error);
      return;
    }

    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3000);
  };


  const socials = [
    { url: settings?.facebook_url, icon: Facebook, label: 'Facebook' },
    { url: settings?.instagram_url, icon: Instagram, label: 'Instagram' },
    { url: settings?.tiktok_url, icon: MessageCircle, label: 'TikTok' },
    { url: settings?.youtube_url, icon: Youtube, label: 'YouTube' },
  ].filter(s => s.url);

  return (
    <footer className="luna-store-footer bg-dark text-white" style={hidden || (waitForSettings && !settingsLoaded) ? { visibility: 'hidden' } : undefined} aria-hidden={hidden || (waitForSettings && !settingsLoaded)}>
      <div className="luna-footer-main section-padding py-12">
        <div className="luna-footer-brand">
          <img src={settings?.logo_url || "/new-homemade-logo.png"} alt={settings?.brand_name || "Homemade Beauty Care"} width={64} height={64} />
          <h3>{settings?.brand_name || 'Homemade Beauty Care'}</h3>
          <p>{settings?.footer_text_bn || 'প্রকৃতির যত্নে, আপনার সৌন্দর্যের ছোঁয়া'}</p>
          {socials.length > 0 && <div className="luna-footer-socials">{socials.map(social => <a key={social.label} href={social.url || '#'} target="_blank" rel="noopener noreferrer" aria-label={social.label}><social.icon size={17} /></a>)}</div>}
        </div>
        <div className="luna-footer-links">
          {Object.entries(FOOTER_LINKS).map(([title, links]) => <div key={title}>
            <h4>{title === 'QUICK LINKS' ? 'EXPLORE' : title === 'CUSTOMER SERVICE' ? 'HELP' : 'COLLECTIONS'}</h4>
            <ul>{links.slice(0, title === 'CATEGORIES' ? 5 : 4).map(link => <li key={link.path}><Link to={link.path}>{link.label}</Link></li>)}</ul>
          </div>)}
        </div>
        {settings?.newsletter_enabled !== false && <div className="luna-footer-newsletter">
          <h4>STAY IN THE GLOW</h4><p>নতুন পণ্য, যত্নের টিপস ও বিশেষ অফারের খবর পেতে যুক্ত থাকুন।</p>
          <form onSubmit={handleSubscribe}><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" aria-label="Your email address" /><button type="submit" aria-label="Subscribe"><ArrowRight size={17} /></button></form>
          {subscribed && <p className="luna-subscribe-success">ধন্যবাদ! আপনার ইমেইল যুক্ত হয়েছে।</p>}
        </div>}
      </div>
      <div className="luna-footer-bottom section-padding"><span>© {new Date().getFullYear()} {settings?.brand_name || 'Homemade Beauty Care'}. All rights reserved.</span></div>
    </footer>
  );
}
