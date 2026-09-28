import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Lock, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const checkRecoverySession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        setCheckingSession(false);
        return;
      }

      setError(
        'Password reset session পাওয়া যায়নি। নতুন recovery link ব্যবহার করুন।'
      );
      setCheckingSession(false);
    };

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setCheckingSession(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('Password কমপক্ষে 6 characters হতে হবে।');
      return;
    }

    if (password !== confirmPassword) {
      setError('দুইটি password একই নয়।');
      return;
    }

    setLoading(true);

    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      setError(
        'Auth session missing! নতুন password recovery link দিয়ে আবার চেষ্টা করুন।'
      );
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Password successfully changed.');

      setTimeout(() => {
        navigate('/admin');
      }, 1500);
    }

    setLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500">
            Verifying password reset session...
          </p>
        </div>
      </div>
    );
  }

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
            Reset Password
          </h1>

          <p className="text-gray-500 mt-2">
            Create a new password for your admin account
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
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
                placeholder="Enter new password"
                required
                className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>

            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="w-full border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-primary"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 text-green-600 text-sm rounded-xl p-3 flex items-center gap-2">
              <CheckCircle size={18} />
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !!error}
            className="w-full bg-primary text-white rounded-xl py-3 font-semibold disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}