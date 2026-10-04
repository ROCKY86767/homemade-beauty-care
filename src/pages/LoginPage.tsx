import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Chrome } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SEO from '@/components/SEO';

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function signInWithGoogle() {
    setLoading(true);
    setError('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/account` } });
    if (oauthError) { setLoading(false); setError(oauthError.message); }
  }

  async function sendOtp() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('আপনার email address দিন।');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const { error: otpError } =
      await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });

    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    setOtpSent(true);
    setMessage(
      'আপনার email-এ 6 digit OTP পাঠানো হয়েছে।'
    );
  }

  async function verifyOtp() {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (cleanOtp.length !== 6) {
      setError('6 digit OTP দিন।');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const { error: verifyError } =
      await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanOtp,
        type: 'email',
      });

    setLoading(false);

    if (verifyError) {
      setError(
        'OTP সঠিক নয় অথবা মেয়াদ শেষ হয়ে গেছে। আবার চেষ্টা করুন।'
      );
      return;
    }

    navigate('/account', {
      replace: true,
    });
  }

  return (
    <>
      <SEO title="Login - Homemade Beauty Care" />

      <div className="min-h-[70vh] bg-cream flex items-center justify-center px-4 py-12">

        <div className="w-full max-w-md">

          <div className="card bg-white p-6 sm:p-8">

            <div className="text-center mb-8">

              <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Mail
                  size={30}
                  className="text-primary"
                />
              </div>

              <h1 className="font-display text-2xl font-bold text-dark">
                {otpSent
                  ? 'OTP যাচাই করুন'
                  : 'My Account'}
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                {otpSent
                  ? 'আপনার email-এ পাঠানো 6 digit OTP দিন।'
                  : 'Password ছাড়াই email দিয়ে নিরাপদে Login করুন।'}
              </p>

            </div>

            {!otpSent ? (
              <div className="space-y-5">
                <button type="button" onClick={signInWithGoogle} disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-3 font-medium text-ink hover:bg-gray-50 disabled:opacity-50">
                  <Chrome size={18} /> Continue with Google
                </button>
                <div className="flex items-center gap-3 text-xs text-gray-400"><div className="h-px flex-1 bg-gray-200" /><span>অথবা Email OTP</span><div className="h-px flex-1 bg-gray-200" /></div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    Email Address
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        sendOtp();
                      }
                    }}
                    placeholder="আপনার email লিখুন"
                    className="input-field w-full"
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading
                    ? 'OTP পাঠানো হচ্ছে...'
                    : 'Send OTP'}
                </button>

              </div>
            ) : (
              <div className="space-y-5">

                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    6 Digit OTP
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) =>
                      setOtp(
                        e.target.value.replace(
                          /[^0-9]/g,
                          ''
                        )
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        verifyOtp();
                      }
                    }}
                    placeholder="123456"
                    className="input-field w-full text-center text-xl tracking-[0.4em]"
                    autoComplete="one-time-code"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={verifyOtp}
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading
                    ? 'যাচাই করা হচ্ছে...'
                    : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                    setError('');
                    setMessage('');
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-primary"
                >
                  <ArrowLeft size={16} />
                  Email পরিবর্তন করুন
                </button>

                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full text-sm text-primary hover:underline"
                >
                  OTP আবার পাঠান
                </button>

              </div>
            )}

          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Login করলে আপনার account-এর সাথে Saved Address যুক্ত থাকবে।
          </p>

        </div>

      </div>
    </>
  );
}