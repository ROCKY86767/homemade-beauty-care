import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, LogIn } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter your email address first.');
      return;
    }

    setError('');
    setLoading(true);

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin + '/reset-password',
      });

    if (resetError) {
      setError(resetError.message);
    } else {
      alert('Password reset link has been sent to your email.');
    }

    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setError('');
    setLoading(true);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (loginError || !data.user) {
      setError('Email or password is incorrect.');
      setLoading(false);
      return;
    }

    const { data: staffAccess, error: staffError } =
      await supabase.rpc('get_staff_access');

    if (
      staffError ||
      !staffAccess ||
      !staffAccess.is_active ||
      staffAccess.role === 'none'
    ) {
      await supabase.auth.signOut();
      setError('এই account-এর Admin/Moderator access নেই.');
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <img
            src="/new-homemade-logo.png"
            alt="Homemade Beauty Care"
            className="h-20 w-20 object-contain mx-auto mb-4"
          />

          <h1 className="font-display text-2xl font-bold text-dark">
            Admin Login
          </h1>

          <p className="text-gray-500 mt-2">
            Sign in to manage your website
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>

            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gmail.com"
                required
                autoComplete="email"
                className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-primary"
              />
            </div>

            <div className="text-right mt-2">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn size={18} />

            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
