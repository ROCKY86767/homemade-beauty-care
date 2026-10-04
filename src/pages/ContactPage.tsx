import { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, Send, MessageCircle, Facebook, Instagram, Youtube, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getSettings } from '@/lib/settings';
import type { SiteSettings } from '@/lib/types';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [showSocial, setShowSocial] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSubmitting(true);
    const { error } = await supabase.from('messages').insert({
      name: form.name,
      email: form.email,
      message: form.message,
    });

    if (error) {
      console.error('Contact message error:', error);
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setForm({ name: '', email: '', message: '' });
    setSubmitting(false);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-cream py-12">
        <div className="section-padding text-center">
          <h1 className="font-display text-3xl font-bold text-dark">Contact</h1>
          <p className="mt-2 text-gray-500">আমাদের সাথে যোগাযোগ করুন, আমরা সাহায্য করতে প্রস্তুত।</p>
        </div>
      </section>

      <div className="section-padding py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div>
            <h2 className="font-display text-2xl font-bold text-dark mb-6">Contact Information</h2>
            <div className="space-y-4">
             <div className="p-5 rounded-2xl bg-cream">
  <button
    type="button"
    onClick={() => setShowSocial(!showSocial)}
    className="flex items-center justify-between w-full text-left"
  >
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
        <MessageCircle size={24} />
      </div>

      <div>
        <h3 className="font-semibold text-ink">Social Media</h3>
        <p className="text-gray-500 text-sm mt-1">
          Connect with us
        </p>
      </div>
    </div>

    {showSocial ? (
      <ChevronUp size={20} className="text-primary" />
    ) : (
      <ChevronDown size={20} className="text-primary" />
    )}
  </button>

  {showSocial && (
    <div className="mt-4 ml-16 space-y-2">
      {[
        { label: 'Facebook', url: settings?.facebook_url, icon: Facebook },
        { label: 'Instagram', url: settings?.instagram_url, icon: Instagram },
        { label: 'TikTok', url: settings?.tiktok_url, icon: null },
        { label: 'YouTube', url: settings?.youtube_url, icon: Youtube },
      ].filter(item => item.url).map(item => (
        <a
          key={item.label}
          href={item.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary transition-colors"
        >
          {item.icon ? <item.icon size={18} /> : <MessageCircle size={18} />}
          {item.label}
        </a>
      ))}

      <a
        href={settings?.whatsapp_number || settings?.phone ? `https://wa.me/${(settings?.whatsapp_number || settings?.phone || '').replace(/\D/g, '').replace(/^0/, '88')}` : '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary transition-colors"
      >
        <MessageCircle size={18} />
        WhatsApp
      </a>
    </div>
  )}
</div>
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-cream">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Phone</h3>
                  <a
                    href={settings?.phone ? `tel:${settings.phone}` : '#'} 
                    className="text-gray-500 text-sm mt-1 inline-block hover:text-primary"
                  >
                    {settings?.phone || 'Customer Support'}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-cream">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Email</h3>
                  <p className="text-gray-500 text-sm mt-1">{settings?.email || 'support.ghrcha@gmail.com'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-cream">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Address</h3>
                  <p className="text-gray-500 text-sm mt-1">{settings?.address_bn || 'Dhaka, Bangladesh'}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-cream">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-ink">Social Media</h3>
                  <p className="text-gray-500 text-sm mt-1">Facebook | Instagram | TikTok | WhatsApp</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h2 className="font-display text-2xl font-bold text-dark mb-6">Send Message</h2>
            <form onSubmit={handleSubmit} className="card p-6 border border-gray-50 space-y-4">
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                  placeholder="Example@gmail.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">Message</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="input-field resize-none"
                  placeholder="Enter your message..."
                />
              </div>
              {submitted && (
                <p className="text-sm text-primary animate-fade-in">
                  Thank you! We have received your message.
                </p>
              )}
              <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-50">
                <Send size={18} /> {submitting ? 'পাঠানো হচ্ছে...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
