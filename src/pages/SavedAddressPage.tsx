import { useEffect, useState } from 'react';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import SEO from '@/components/SEO';
import {
  DISTRICTS,
  getThanasByDistrict,
} from '@/data/district-thanas';

type Address = {
  id: string;
  user_id: string;
  mobile: string;
  name: string;
  alt_mobile: string | null;
  email: string | null;
  district: string;
  area: string;
  address: string;
  is_default: boolean;
};

const emptyForm = {
  name: '',
  mobile: '',
  alt_mobile: '',
  email: '',
  district: 'ঢাকা',
  area: '',
  address: '',
  is_default: false,
};

export default function SavedAddressPage() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState('');
  const [accountEmail, setAccountEmail] = useState('');

  const [mobileSearch, setMobileSearch] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const areas = getThanasByDistrict(form.district);

  /*
   * Load currently logged-in user's session.
   */
  const loadSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      navigate('/login', { replace: true });
      return null;
    }

    const currentUserId = session.user.id;
    const currentEmail = session.user.email || '';

    setUserId(currentUserId);
    setAccountEmail(currentEmail);

    return {
      userId: currentUserId,
      email: currentEmail,
    };
  };

  /*
   * Load only addresses belonging to the currently logged-in user.
   *
   * IMPORTANT:
   * Mobile is only a search key INSIDE the current user's account.
   * It cannot expose another user's address.
   */
  const loadAddresses = async (
    mobile: string,
    currentUserId?: string
  ) => {
    const cleanMobile = mobile.trim();

    const activeUserId = currentUserId || userId;

    if (!activeUserId) {
      navigate('/login', { replace: true });
      return;
    }

    if (!cleanMobile) {
      setAddresses([]);
      setSearched(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', activeUserId)
      .eq('mobile', cleanMobile)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    setLoading(false);
    setSearched(true);

    if (error) {
      console.error('Address loading error:', error);
      setAddresses([]);
      return;
    }

    setAddresses((data || []) as Address[]);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const session = await loadSession();

    if (!session) {
      return;
    }

    await loadAddresses(
      mobileSearch,
      session.userId
    );
  };

  const openAddForm = () => {
    setEditingId(null);

    setForm({
      ...emptyForm,
      mobile: mobileSearch.trim(),
      email: accountEmail,
    });

    setShowForm(true);
  };

  const openEditForm = (address: Address) => {
    /*
     * Extra client-side safety check.
     */
    if (address.user_id !== userId) {
      alert('এই address আপনার account-এর নয়।');
      return;
    }

    setEditingId(address.id);

    setForm({
      name: address.name,
      mobile: address.mobile,
      alt_mobile: address.alt_mobile || '',
      email: accountEmail,
      district: address.district,
      area: address.area,
      address: address.address,
      is_default: address.is_default,
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDistrictChange = (district: string) => {
    setForm((prev) => ({
      ...prev,
      district,
      area: '',
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      navigate('/login', { replace: true });
      return;
    }

    if (!form.name.trim()) {
      alert('Please enter your name.');
      return;
    }

    if (!form.mobile.trim()) {
      alert('Please enter your mobile number.');
      return;
    }

    if (
      !/^(01)[0-9]{9}$/.test(
        form.mobile.replace(/\s/g, '')
      )
    ) {
      alert(
        'Please enter a valid Bangladesh mobile number.'
      );
      return;
    }

    if (!form.district) {
      alert('Please select a district.');
      return;
    }

    if (!form.area) {
      alert('Please select an area.');
      return;
    }

    if (!form.address.trim()) {
      alert('Please enter your full address.');
      return;
    }

    setSaving(true);

    try {
      /*
       * If this address is being made default,
       * remove default status ONLY from this user's
       * addresses.
       */
      if (form.is_default) {
        const { error: defaultError } =
          await supabase
            .from('customer_addresses')
            .update({
              is_default: false,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (defaultError) {
          throw defaultError;
        }
      }

      const payload = {
        user_id: userId,
        name: form.name.trim(),
        mobile: form.mobile
          .replace(/\s/g, '')
          .trim(),
        alt_mobile:
          form.alt_mobile.trim() || null,

        /*
         * Always keep the verified account email.
         * Do not trust a manually entered email here.
         */
        email: accountEmail || null,

        district: form.district,
        area: form.area,
        address: form.address.trim(),
        is_default: form.is_default,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        /*
         * Update only if the address belongs to this user.
         */
        const { error } = await supabase
          .from('customer_addresses')
          .update(payload)
          .eq('id', editingId)
          .eq('user_id', userId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('customer_addresses')
          .insert(payload);

        if (error) {
          throw error;
        }
      }

      setMobileSearch(form.mobile.trim());
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadAddresses(form.mobile.trim(), userId);
    } catch (error) {
      console.error('Address save error:', error);

      alert(
        'Address save করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!userId) {
      navigate('/login', { replace: true });
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this address?'
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Address delete error:', error);
      alert('Address delete করতে সমস্যা হয়েছে।');
      return;
    }

    await loadAddresses(mobileSearch, userId);
  };

  const makeDefault = async (address: Address) => {
    if (!userId) {
      navigate('/login', { replace: true });
      return;
    }

    /*
     * Extra client-side safety check.
     */
    if (address.user_id !== userId) {
      alert('এই address আপনার account-এর নয়।');
      return;
    }

    try {
      /*
       * Remove default from THIS user's addresses only.
       */
      const { error: resetError } =
        await supabase
          .from('customer_addresses')
          .update({
            is_default: false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

      if (resetError) {
        throw resetError;
      }

      /*
       * Make the selected address default,
       * but only if it belongs to this user.
       */
      const { error } = await supabase
        .from('customer_addresses')
        .update({
          is_default: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', address.id)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      await loadAddresses(mobileSearch, userId);
    } catch (error) {
      console.error('Default address error:', error);
      alert('Default address পরিবর্তন করা যায়নি।');
    }
  };

  useEffect(() => {
    async function initialize() {
      const session = await loadSession();

      if (!session) {
        return;
      }

      /*
       * Do not automatically search another user's data.
       * Only load if a mobile was already present in the page state.
       */
      if (mobileSearch.trim()) {
        await loadAddresses(
          mobileSearch,
          session.userId
        );
      }
    }

    initialize();
  }, []);

  return (
    <>
      <SEO
        title="Saved Address | Homemade Beauty Care"
        description="Manage your saved delivery addresses."
      />

      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <MapPin size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Saved Address
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Save and manage your delivery addresses
              </p>
            </div>
          </div>

          {/* Account Email */}
          <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-700">
              Logged in account
            </p>

            <p className="mt-1 text-sm font-semibold text-emerald-900">
              {accountEmail}
            </p>

            <p className="mt-1 text-xs text-emerald-700">
              আপনার Saved Address এই account-এর সাথেই যুক্ত থাকবে।
            </p>
          </div>

          {/* Search */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <form
              onSubmit={handleSearch}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="tel"
                value={mobileSearch}
                onChange={(e) =>
                  setMobileSearch(e.target.value)
                }
                placeholder="Enter your mobile number"
                className="h-11 flex-1 rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <button
                type="submit"
                disabled={loading}
                className="h-11 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? 'Searching...'
                  : 'Find Address'}
              </button>
            </form>

            <p className="mt-2 text-xs text-gray-400">
              শুধু আপনার এই account-এর সাথে যুক্ত address
              এখানে দেখানো হবে।
            </p>
          </div>

          {/* Add button */}
          {searched && (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={openAddForm}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Plus size={18} />
                Add New Address
              </button>
            </div>
          )}

          {/* Empty */}
          {searched &&
            !loading &&
            addresses.length === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <MapPin
                  size={38}
                  className="mx-auto text-gray-400"
                />

                <h2 className="mt-3 font-semibold text-gray-900">
                  No saved address found
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  এই mobile number-এ আপনার account-এর কোনো
                  saved address পাওয়া যায়নি।
                </p>
              </div>
            )}

          {/* Address list */}
          <div className="mt-6 space-y-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-gray-900">
                        {address.name}
                      </h2>

                      {address.is_default && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Default
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-gray-600">
                      📞 {address.mobile}
                    </p>

                    {address.alt_mobile && (
                      <p className="mt-1 text-sm text-gray-600">
                        📞 {address.alt_mobile}
                      </p>
                    )}

                    {address.email && (
                      <p className="mt-1 text-sm text-gray-600">
                        ✉️ {address.email}
                      </p>
                    )}

                    <p className="mt-3 text-sm leading-6 text-gray-700">
                      {address.address}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {address.area}, {address.district}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {!address.is_default && (
                      <button
                        type="button"
                        onClick={() =>
                          makeDefault(address)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        <Check size={15} />
                        Make Default
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(address)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(address.id)
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">

                <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {editingId
                        ? 'Edit Saved Address'
                        : 'Add New Address'}
                    </h2>

                    <p className="mt-1 text-xs text-gray-500">
                      Enter your delivery information
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeForm}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form
                  onSubmit={handleSave}
                  className="space-y-4 p-5"
                >
                  {/* Name */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Full Name
                    </label>

                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      placeholder="Your full name"
                    />
                  </div>

                  {/* Mobile */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Mobile Number
                      </label>

                      <input
                        type="tel"
                        value={form.mobile}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            mobile:
                              e.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        placeholder="01XXXXXXXXX"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Alternative Mobile
                      </label>

                      <input
                        type="tel"
                        value={form.alt_mobile}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            alt_mobile:
                              e.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  {/* Verified Account Email */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Account Email
                    </label>

                    <input
                      type="email"
                      value={accountEmail}
                      readOnly
                      className="h-11 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500 outline-none"
                    />

                    <p className="mt-1 text-xs text-gray-400">
                      এই email আপনার verified account থেকে নেওয়া হয়েছে।
                    </p>
                  </div>

                  {/* District + Area */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        District
                      </label>

                      <select
                        value={form.district}
                        onChange={(e) =>
                          handleDistrictChange(
                            e.target.value
                          )
                        }
                        className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        {DISTRICTS.map(
                          (district) => (
                            <option
                              key={district}
                              value={district}
                            >
                              {district}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Area / Thana
                      </label>

                      <select
                        value={form.area}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            area: e.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="">
                          Select Area
                        </option>

                        {areas.map((area) => (
                          <option
                            key={area}
                            value={area}
                          >
                            {area}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Full Address
                    </label>

                    <textarea
                      value={form.address}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          address:
                            e.target.value,
                        }))
                      }
                      rows={4}
                      className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      placeholder="House, Road, Block, Village, Landmark..."
                    />
                  </div>

                  {/* Default */}
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <input
                      type="checkbox"
                      checked={form.is_default}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          is_default:
                            e.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-emerald-600"
                    />

                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Make this my default address
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        This address can be used automatically during checkout later.
                      </p>
                    </div>
                  </label>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                    <button
                      type="button"
                      onClick={closeForm}
                      disabled={saving}
                      className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving
                        ? 'Saving...'
                        : editingId
                        ? 'Update Address'
                        : 'Save Address'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}