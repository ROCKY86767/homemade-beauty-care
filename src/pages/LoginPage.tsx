import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Chrome, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SEO from '@/components/SEO';

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function signInWithGoogle() {
    setLoading(true);
    setError('');
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (oauthError) {
      setLoading(false);
      setError(oauthError.message);
    }
  }

  async function sendLoginLink() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('আপনার email address দিন।');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    const { error: linkError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });

    setLoading(false);

    if (linkError) {
      setError(linkError.message);
      return;
    }

    setMessage(
      'আপনার email-এ একটি নিরাপদ Login Link পাঠানো হয়েছে। Email খুলে Link-এ ক্লিক করলেই আপনার account-এ প্রবেশ করতে পারবেন।'
    );
  }

  return (
    <>
      <SEO title="Login - Homemade Beauty Care" />

      <div className="min-h-[70vh] bg-cream flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card bg-white p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Mail size={30} className="text-primary" />
              </div>

              <h1 className="font-display text-2xl font-bold text-dark">
                My Account
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Email দিয়ে Password ছাড়াই নিরাপদে Login করুন।
              </p>
            </div>

            <div className="space-y-5">
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-3 font-medium text-ink hover:bg-gray-50 disabled:opacity-50"
              >
                <Chrome size={18} />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-xs text-gray-400">
                <div className="h-px flex-1 bg-gray-200" />
                <span>অথবা Email দিয়ে</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendLoginLink();
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
                <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 flex items-start gap-2">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              <button
                type="button"
                onClick={sendLoginLink}
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading
                  ? 'Login Link পাঠানো হচ্ছে...'
                  : 'ইমেইলে নিরাপদ Login Link পাঠান'}
              </button>

              <p className="text-xs text-gray-400 text-center leading-5">
                আপনার email-এ পাঠানো Link-এ ক্লিক করলেই Login সম্পন্ন হবে।
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Login করলে আপনার account-এর সাথে Saved Address যুক্ত থাকবে।
          </p>
        </div>
      </div>
    </>
  );
}
