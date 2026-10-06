import { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, Trash2, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PERMISSIONS = [
  ['dashboard', 'Dashboard'],
  ['products', 'Products'],
  ['categories', 'Categories'],
  ['orders', 'Orders'],
  ['customers', 'Customers'],
  ['chat', 'Live Chat'],
  ['quick-responses', 'Quick Response'],
  ['reviews', 'Reviews'],
  ['coupons', 'Coupons'],
  ['banners', 'Banners'],
  ['inventory', 'Inventory'],
  ['reports', 'Reports'],
  ['combo', 'Homepage Combo'],
  ['settings', 'Settings'],
] as const;

export default function ModeratorView() {
  const [rows, setRows] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(['chat']);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('moderator_users')
      .select('user_id,email,display_name,permissions,is_active,created_at')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const permissionObject: Record<string, boolean> = {};
  PERMISSIONS.forEach(([key]) => { permissionObject[key] = selected.includes(key); });

  const toggle = (key: string) =>
    setSelected((current) =>
      current.includes(key) ? current.filter((x) => x !== key) : [...current, key]
    );

  const resetForm = () => {
    setEmail('');
    setName('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setEditingUserId(null);
    setSelected(['chat']);
    setActive(true);
  };

  const save = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Moderator-এর email দিন।');
      return;
    }

    if (!editingUserId) {
      if (!password) {
        setError('নতুন Moderator-এর password দিন।');
        return;
      }
      if (password.length < 8) {
        setError('Password কমপক্ষে 8 characters হতে হবে।');
        return;
      }
      if (password !== confirmPassword) {
        setError('Password এবং Confirm Password মিলছে না।');
        return;
      }
    }

    setSaving(true);
    setError('');
    setMessage('');

    let saveError: any = null;

    if (editingUserId) {
      const { error } = await supabase.rpc('upsert_moderator_by_email', {
        p_email: cleanEmail,
        p_display_name: name.trim() || 'Moderator',
        p_permissions: permissionObject,
        p_is_active: active,
      });
      saveError = error;
    } else {
      const { error } = await supabase.functions.invoke('create-moderator', {
        body: {
          email: cleanEmail,
          password,
          display_name: name.trim() || 'Moderator',
          permissions: permissionObject,
          is_active: active,
        },
      });
      saveError = error;
    }

    if (saveError) {
      setError(saveError.message || 'Moderator save failed.');
    } else {
      setMessage(editingUserId ? 'Moderator successfully updated.' : 'Moderator account successfully created.');
      resetForm();
      await load();
    }

    setSaving(false);
  };

  const edit = (row: any) => {
    setEditingUserId(row.user_id);
    setEmail(row.email || '');
    setName(row.display_name || '');
    setPassword('');
    setConfirmPassword('');
    setActive(Boolean(row.is_active));
    const perms = row.permissions || {};
    setSelected(PERMISSIONS.filter(([key]) => perms[key]).map(([key]) => key));
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (userId: string) => {
    if (!confirm('এই moderator access remove করবেন?')) return;
    const { error } = await supabase.rpc('remove_moderator', { p_user_id: userId });
    if (error) setError(error.message);
    else await load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Moderator Management</h1>
        <p className="text-sm text-gray-500 mt-1">Moderator account, password, access এবং permissions এখান থেকে নিয়ন্ত্রণ করুন।</p>
      </div>

      <div className="grid lg:grid-cols-[360px_minmax(0,1fr)] gap-6">
        <div className="bg-white rounded-2xl border p-5">
          <div className="flex items-center gap-2 font-semibold mb-4">
            <UserPlus className="w-5 h-5 text-primary" /> {editingUserId ? 'Edit Moderator' : 'Create Moderator'}
          </div>

          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="moderator@gmail.com" type="email"
            disabled={Boolean(editingUserId)}
            className="w-full border rounded-xl px-3 py-2.5 mb-3 disabled:bg-gray-50 disabled:text-gray-500" />

          <input value={name} onChange={e => setName(e.target.value)} placeholder="Moderator name"
            className="w-full border rounded-xl px-3 py-2.5 mb-3" />

          {!editingUserId && (
            <>
              <div className="relative mb-3">
                <input value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Password (minimum 8 characters)" type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="w-full border rounded-xl px-3 py-2.5 pr-11" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm password" type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="w-full border rounded-xl px-3 py-2.5 mb-4" />
            </>
          )}

          {editingUserId && (
            <div className="mb-4 rounded-lg bg-blue-50 text-blue-700 text-xs p-3">
              Password change এখন এই Edit form থেকে করা হবে না। Moderator login password আলাদা থাকবে।
            </div>
          )}

          <label className="flex items-center justify-between mb-4 text-sm">
            <span>Account Active</span>
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          </label>

          <div className="text-sm font-semibold mb-2">Permissions</div>
          <div className="grid grid-cols-2 gap-2">
            {PERMISSIONS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm border rounded-lg px-2.5 py-2">
                <input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <button onClick={save} disabled={saving}
            className="w-full mt-5 rounded-xl bg-primary text-white py-2.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : editingUserId ? 'Update Moderator' : 'Create Moderator'}
          </button>

          {editingUserId && (
            <button type="button" onClick={resetForm}
              className="w-full mt-2 rounded-xl border py-2.5 font-semibold text-gray-700 hover:bg-gray-50">
              Cancel Edit / New Moderator
            </button>
          )}

          {error && <div className="mt-3 rounded-lg bg-red-50 text-red-700 text-sm p-3">{error}</div>}
          {message && <div className="mt-3 rounded-lg bg-green-50 text-green-700 text-sm p-3">{message}</div>}
          {!editingUserId && (
            <div className="mt-4 rounded-lg bg-amber-50 text-amber-800 text-xs p-3">
              Admin এখান থেকে email + password দিয়ে সরাসরি নতুন Moderator account তৈরি করতে পারবেন। Password Supabase Auth নিরাপদভাবে সংরক্ষণ করবে।
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2 font-semibold">
            <ShieldCheck className="w-5 h-5 text-primary" /> Current Moderators
          </div>
          {loading ? <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div> :
            rows.length === 0 ? <div className="p-8 text-sm text-gray-500">এখনো কোনো moderator নেই।</div> :
            <div className="divide-y">
              {rows.map(row => (
                <div key={row.user_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{row.display_name}</div>
                    <div className="text-sm text-gray-500">{row.email}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {PERMISSIONS.filter(([key]) => row.permissions?.[key]).map(([, label]) => (
                        <span key={label} className="text-[11px] px-2 py-1 rounded-full bg-gray-100">{label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {row.is_active ? 'Active' : 'Disabled'}
                    </span>
                    <button onClick={() => edit(row)} className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50">Edit</button>
                    <button onClick={() => remove(row.user_id)} className="p-2 rounded-lg border text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </div>
  );
}
