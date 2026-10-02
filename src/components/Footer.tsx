import { Link } from 'react-router-dom';
import { Facebook, Instagram, Phone, Mail, MapPin, MessageCircle, Youtube } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getSettings } from '@/lib/settings';
import type { SiteSettings } from '@/lib/types';

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
  CATEGORIES: [
    { label: 'Hair Care', path: '/category/hair-care' },
    { label: 'Skin Care', path: '/category/skin-care' },
    { label: 'Face Care', path: '/category/face-care' },
    { label: 'Body Care', path: '/category/body-care' },
    { label: 'Combo', path: '/category/combo' },
    { label: 'Offers', path: '/offers' },
  ],
};

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
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
    <footer className="bg-dark text-white">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="section-padding py-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold text-white">
              সবার আগে নতুন কিছু জানতে চান?
            </h2>
            <p className="mt-2 text-sm text-white/70">
              নতুন পণ্য, special offers এবং beauty tips পেতে subscribe করুন।
            </p>
            <form onSubmit={handleSubscribe} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter Your Email"
                className="flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white placeholder-white/50 outline-none focus:border-primary-light focus:bg-white/15"
              />
              <button
                type="Submit"
                className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-light"
              >
                Subscribe
              </button>
            </form>
            {subscribed && (
              <p className="mt-3 text-sm text-primary-light animate-fade-in">
                Thank you! You have successfully subscribed.।
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="section-padding py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* About */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
<img
  src="/new-homemade-logo.png"
  alt="Homemade Beauty Care"
  className="h-14 w-14 rounded-md object-contain"
  style={{ borderRadius: '6px' }}
/>
              <h3 className="font-display text-lg font-bold text-white">
                {settings?.brand_name || 'Homemade Beauty Care'}
              </h3>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              {settings?.footer_text_bn || 'চুল ও ত্বকের দৈনন্দিন যত্নকে আরও সহজ ও সুন্দর করার জন্য আমাদের যাত্রা।'}
            </p>
            {socials.length > 0 && (
              <div className="flex gap-3 mt-5">
                {socials.map(social => (
                  <a key={social.label} href={social.url || '#'} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-primary" aria-label={social.label}>
                    <social.icon size={18} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-white/90 mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.path}>
                    <Link
                      to={link.path}
                      className="text-sm text-white/60 transition-colors hover:text-primary-light"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div>
            <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-white/90 mb-4">
              CONTACT
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-white/60">
                <Phone size={16} className="mt-0.5 shrink-0 text-primary-light" />
                <span>{settings?.phone || '01999478203'}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-white/60">
                <Mail size={16} className="mt-0.5 shrink-0 text-primary-light" />
                <span>{settings?.email || 'support.ghrcha@gmail.com'}</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-white/60">
                <MapPin size={16} className="mt-0.5 shrink-0 text-primary-light" />
                <span>{settings?.address_bn || 'Dhaka, Bangladesh'}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/10">
        <div className="section-padding py-5 text-center">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} {settings?.brand_name || 'Homemade Beauty Care'}. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
