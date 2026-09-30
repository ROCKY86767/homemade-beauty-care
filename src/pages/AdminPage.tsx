import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useLocation,
} from 'react-router-dom';

import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Star,
  Tag,
  ImageIcon,
  Boxes,
  BarChart3,
  Settings,
  Menu,
  X,
  Plus,
  Trash2,
  Edit,
  Save,
  Loader2,
  Search,
  Upload,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import AdminLogin from './AdminLogin';
import { formatPrice } from '../lib/format';

/* =========================================================
   TYPES
========================================================= */

type Tab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'orders'
  | 'customers'
  | 'reviews'
  | 'coupons'
  | 'banners'
  | 'inventory'
  | 'reports'
  | 'settings';

type Product = any;
type Category = any;
type Order = any;
type OrderItem = any;
type Review = any;
type Banner = any;

const ORDER_STATUSES = [
  'Pending',
  'Order Placed',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

/* =========================================================
   HELPERS
========================================================= */

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function money(value: any) {
  return formatPrice(Number(value || 0));
}

function dateTime(value: any) {
  if (!value) return '-';

  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function dateOnly(value: any) {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('en-US', {
    dateStyle: 'medium',
  });
}

function normalizePhone(value: any) {
  return String(value || '')
    .replace(/\D/g, '')
    .replace(/^88/, '');
}

function customerKey(order: Order) {
  const mobile = normalizePhone(
    order.mobile || order.customer_phone
  );

  if (mobile) {
    return `mobile:${mobile}`;
  }

  const email = String(order.email || '')
    .trim()
    .toLowerCase();

  if (email) {
    return `email:${email}`;
  }

  return `order:${order.id}`;
}

function sanitizeFileName(value: string) {
  return (
    value
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .slice(0, 60) || 'image'
  );
}

async function uploadImage(
  file: File,
  folder: 'products' | 'categories' | 'banners'
) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be 5MB or less.');
  }

  const extension =
    file.name.split('.').pop()?.toLowerCase() || 'jpg';

  const safeBase = sanitizeFileName(file.name);

  const path = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeBase}.${extension}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;

  return supabase.storage
    .from('product-images')
    .getPublicUrl(path).data.publicUrl;
}

/* =========================================================
   MAIN ADMIN PAGE
========================================================= */

export default function AdminPage() {
  const location = useLocation();

  const [session, setSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);

  const getTabFromPath = (): Tab => {
    const value =
      new URLSearchParams(location.search).get('tab') ||
      'dashboard';

    const valid: Tab[] = [
      'dashboard',
      'products',
      'categories',
      'orders',
      'customers',
      'reviews',
      'coupons',
      'banners',
      'inventory',
      'reports',
      'settings',
    ];

    return valid.includes(value as Tab)
      ? (value as Tab)
      : 'dashboard';
  };

  const [activeTab, setActiveTab] =
    useState<Tab>(getTabFromPath());

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.search]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      setSession(data.session);
      setCheckingAuth(false);
    });

    const {
      data: listener,
    } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);
        setCheckingAuth(false);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const navigateTab = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenu(false);

    const params = new URLSearchParams();
    params.set('tab', tab);

    window.history.replaceState(
      {},
      '',
      `${location.pathname}?${params.toString()}`
    );
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <AdminLogin />;
  }

  const navItems = [
    {
      id: 'dashboard' as Tab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'products' as Tab,
      label: 'Products',
      icon: Package,
    },
    {
      id: 'categories' as Tab,
      label: 'Categories',
      icon: FolderTree,
    },
    {
      id: 'orders' as Tab,
      label: 'Orders',
      icon: ShoppingBag,
    },
    {
      id: 'customers' as Tab,
      label: 'Customers',
      icon: Users,
    },
    {
      id: 'reviews' as Tab,
      label: 'Reviews',
      icon: Star,
    },
    {
      id: 'coupons' as Tab,
      label: 'Coupons',
      icon: Tag,
    },
    {
      id: 'banners' as Tab,
      label: 'Banners',
      icon: ImageIcon,
    },
    {
      id: 'inventory' as Tab,
      label: 'Inventory',
      icon: Boxes,
    },
    {
      id: 'reports' as Tab,
      label: 'Reports',
      icon: BarChart3,
    },
    {
      id: 'settings' as Tab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside
          className={`fixed lg:static z-50 inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ${
            mobileMenu
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="h-16 px-5 flex items-center justify-between border-b">
              <Link
                to="/"
                className="font-bold text-lg text-gray-900"
              >
                Homemade Beauty Care
              </Link>

              <button
                onClick={() => setMobileMenu(false)}
                className="lg:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() =>
                      navigateTab(item.id)
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition ${
                      active
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t">
              <div className="text-xs text-gray-500 mb-2 truncate">
                {session.user?.email || 'Admin'}
              </div>

              <button
                onClick={logout}
                className="w-full px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {mobileMenu && (
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setMobileMenu(false)}
          />
        )}

        {/* MAIN */}
        <main className="flex-1 min-w-0">
          <header className="h-16 bg-white border-b flex items-center px-4 lg:px-6 sticky top-0 z-30">
            <button
              onClick={() => setMobileMenu(true)}
              className="lg:hidden mr-3"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="font-semibold text-gray-800">
              Admin Panel
            </div>
          </header>

          <div className="p-4 lg:p-6">
            {activeTab === 'dashboard' && (
              <DashboardView />
            )}

            {activeTab === 'products' && (
              <ProductsView />
            )}

            {activeTab === 'categories' && (
              <CategoriesView />
            )}

            {activeTab === 'orders' && (
              <OrdersView />
            )}

            {activeTab === 'customers' && (
              <CustomersView />
            )}

            {activeTab === 'reviews' && (
              <ReviewsView />
            )}

            {activeTab === 'coupons' && (
  <CouponsView />
)}

            {activeTab === 'banners' && (
              <BannersView />
            )}

            {activeTab === 'inventory' && (
              <InventoryView />
            )}

            {activeTab === 'reports' && (
              <ReportsView />
            )}

            {activeTab === 'settings' && (
              <PlaceholderView
                title="Settings"
                description="Store settings, payment, courier, notification and other configurations will be managed here."
                icon={Settings}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   COMMON UI
========================================================= */

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {title}
        </h1>

        {description && (
          <p className="text-sm text-gray-500 mt-1">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

function ErrorBox({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  if (!error) return null;

  return (
    <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        <span>{error}</span>
      </div>

      {retry && (
        <button
          onClick={retry}
          className="underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="min-h-[300px] flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: any;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">
            {title}
          </div>

          <div className="text-2xl font-bold mt-1">
            {value}
          </div>
        </div>

        <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="p-10 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function DashboardView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [
        { data: ordersData, error: ordersError },
        { data: productsData, error: productsError },
        { data: itemsData, error: itemsError },
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('products')
          .select('*'),

        supabase
          .from('order_items')
          .select('*'),
      ]);

      if (ordersError) throw ordersError;
      if (productsError) throw productsError;
      if (itemsError) throw itemsError;

      setOrders(ordersData || []);
      setProducts(productsData || []);
      setItems(itemsData || []);
    } catch (err: any) {
      setError(
        err.message || 'Dashboard load failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const delivered = useMemo(
    () =>
      orders.filter(
        (order) => order.status === 'Delivered'
      ),
    [orders]
  );

  const realizedRevenue = useMemo(
    () =>
      delivered.reduce(
        (sum, order) =>
          sum +
          Number(
            order.grand_total ?? order.total ?? 0
          ),
        0
      ),
    [delivered]
  );

  const customers = useMemo(() => {
    const set = new Set<string>();

    orders
      .filter((order) => order.status !== 'Cancelled')
      .forEach((order) => {
        set.add(customerKey(order));
      });

    return set.size;
  }, [orders]);

  const monthlySales = useMemo(() => {
    const result: {
      label: string;
      value: number;
    }[] = [];

    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const value = delivered
        .filter((order) => {
          const date = new Date(order.created_at);

          return (
            date.getFullYear() ===
              d.getFullYear() &&
            date.getMonth() === d.getMonth()
          );
        })
        .reduce(
          (sum, order) =>
            sum +
            Number(
              order.grand_total ?? order.total ?? 0
            ),
          0
        );

      result.push({
        label: d.toLocaleDateString('en-US', {
          month: 'short',
        }),
        value,
      });
    }

    return result;
  }, [delivered]);

  const topProducts = useMemo(() => {
    const deliveredIds = new Set(
      delivered.map((order) => order.id)
    );

    const map = new Map<
      string,
      {
        name: string;
        quantity: number;
      }
    >();

    items.forEach((item) => {
      if (!deliveredIds.has(item.order_id)) {
        return;
      }

      const key =
        item.product_id || item.product_name;

      const existing = map.get(key);

      if (existing) {
        existing.quantity +=
          Number(item.quantity || 0);
      } else {
        map.set(key, {
          name: item.product_name || 'Product',
          quantity: Number(item.quantity || 0),
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [delivered, items]);

  if (loading) return <LoadingBox />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Store overview"
        action={
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg border bg-white flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      <ErrorBox error={error} retry={load} />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Realized Revenue"
          value={money(realizedRevenue)}
          icon={BarChart3}
        />

        <StatCard
          title="Total Orders"
          value={orders.length}
          icon={ShoppingBag}
        />

        <StatCard
          title="Customers"
          value={customers}
          icon={Users}
        />

        <StatCard
          title="Products"
          value={products.length}
          icon={Package}
        />
      </div>

      <div className="grid xl:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-lg mb-5">
            Delivered Sales — Last 6 Months
          </h3>

          <div className="h-64 flex items-end gap-3">
            {monthlySales.map((item) => {
              const max = Math.max(
                ...monthlySales.map(
                  (x) => x.value
                ),
                1
              );

              const height =
                item.value > 0
                  ? Math.max(
                      (item.value / max) * 100,
                      5
                    )
                  : 4;

              return (
                <div
                  key={item.label}
                  className="flex-1 h-full flex flex-col justify-end items-center gap-2"
                >
                  <div className="text-[10px] text-gray-500">
                    {item.value
                      ? money(item.value)
                      : ''}
                  </div>

                  <div
                    className="w-full max-w-12 bg-primary rounded-t"
                    style={{
                      height: `${height}%`,
                    }}
                  />

                  <div className="text-xs text-gray-500">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-lg mb-5">
            Top Selling Products
          </h3>

          {topProducts.length === 0 ? (
            <EmptyState text="No delivered product sales yet." />
          ) : (
            <div className="space-y-4">
              {topProducts.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0"
                >
                  <div>
                    <div className="font-medium">
                      {item.name}
                    </div>

                    <div className="text-xs text-gray-500">
                      Rank #{index + 1}
                    </div>
                  </div>

                  <div className="font-semibold">
                    {item.quantity}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border mt-6 overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="font-bold text-lg">
            Recent Orders
          </h3>
        </div>

        {orders.length === 0 ? (
          <EmptyState text="No orders found." />
        ) : (
          <div className="divide-y">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold">
                    #
                    {order.order_number ||
                      order.id?.slice(0, 8)}
                  </div>

                  <div className="text-sm text-gray-500">
                    {order.customer_name || '-'}
                  </div>

                  <div className="text-xs text-gray-400">
                    {dateTime(order.created_at)}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="font-semibold">
                    {money(
                      order.grand_total ??
                        order.total
                    )}
                  </div>

                  <StatusBadge
                    status={order.status}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    Pending:
      'bg-yellow-100 text-yellow-700',
    'Order Placed':
      'bg-blue-100 text-blue-700',
    Confirmed:
      'bg-indigo-100 text-indigo-700',
    Processing:
      'bg-purple-100 text-purple-700',
    Shipped:
      'bg-cyan-100 text-cyan-700',
    Delivered:
      'bg-green-100 text-green-700',
    Cancelled:
      'bg-red-100 text-red-700',
  };

  return (
    <span
      className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs ${
        styles[status] ||
        'bg-gray-100 text-gray-700'
      }`}
    >
      {status || 'Unknown'}
    </span>
  );
}

/* =========================================================
   PRODUCTS
========================================================= */

function ProductsView() {
  const emptyForm = {
    name_en: '',
    name_bn: '',
    slug: '',
    sku: '',
    price: '',
    old_price: '',
    stock: '0',
    size_bn: '',
    category_id: '',
    subcategory: '',
    short_description_bn: '',
    description_bn: '',
    description_en: '',
    benefits_bn: '',
    how_to_use_bn: '',
    ingredients_bn: '',
    who_is_it_for_bn: '',
    storage_bn: '',
    notes_bn: '',
    image_url: '',
    is_active: true,
    is_best_seller: false,
    is_new: false,
    is_on_sale: false,
    is_featured: false,
  };

  const [products, setProducts] =
    useState<Product[]>([]);
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [form, setForm] =
    useState<any>(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [categoryFilter, setCategoryFilter] =
    useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [
        { data: productsData, error: productsError },
        { data: categoriesData, error: categoriesError },
      ] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('categories')
          .select('*')
          .order('sort_order', {
            ascending: true,
          }),
      ]);

      if (productsError) throw productsError;
      if (categoriesError) throw categoriesError;

      setProducts(productsData || []);
      setCategories(categoriesData || []);
    } catch (err: any) {
      setError(
        err.message || 'Products load failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !q ||
        String(product.name_en || '')
          .toLowerCase()
          .includes(q) ||
        String(product.name_bn || '')
          .toLowerCase()
          .includes(q) ||
        String(product.sku || '')
          .toLowerCase()
          .includes(q);

      const matchesCategory =
        !categoryFilter ||
        product.category_id === categoryFilter;

      return (
        matchesSearch && matchesCategory
      );
    });
  }, [
    products,
    search,
    categoryFilter,
  ]);

  const saveProduct = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setSaving(true);
    setError('');

    try {
      if (!form.name_en.trim() &&
          !form.name_bn.trim()) {
        throw new Error(
          'Product name is required.'
        );
      }

      const payload = {
        name_en: form.name_en.trim(),
        name_bn: form.name_bn.trim(),
        slug:
          form.slug.trim() ||
          slugify(
            form.name_en ||
              form.name_bn
          ),
        sku: form.sku.trim(),
        price: Number(form.price || 0),
        old_price:
          form.old_price === ''
            ? null
            : Number(form.old_price),
        stock: Math.max(
          0,
          Number(form.stock || 0)
        ),
        size_bn: form.size_bn.trim(),
        category_id:
          form.category_id || null,
        subcategory:
          form.subcategory.trim(),
        short_description_bn:
          form.short_description_bn.trim(),
        description_bn:
          form.description_bn.trim(),
        description_en:
          form.description_en.trim(),
        benefits_bn:
          form.benefits_bn.trim(),
        how_to_use_bn:
          form.how_to_use_bn.trim(),
        ingredients_bn:
          form.ingredients_bn.trim(),
        who_is_it_for_bn:
          form.who_is_it_for_bn.trim(),
        storage_bn:
          form.storage_bn.trim(),
        notes_bn:
          form.notes_bn.trim(),
        image_url:
          form.image_url.trim(),
        is_active:
          Boolean(form.is_active),
        is_best_seller:
          Boolean(form.is_best_seller),
        is_new:
          Boolean(form.is_new),
        is_on_sale:
          Boolean(form.is_on_sale),
        is_featured:
          Boolean(form.is_featured),
        updated_at:
          new Date().toISOString(),
      };

      if (editingId) {
        const { error } =
          await supabase
            .from('products')
            .update(payload)
            .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } =
          await supabase
            .from('products')
            .insert(payload);

        if (error) throw error;
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);

      await load();
    } catch (err: any) {
      setError(
        err.message || 'Product save failed.'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (
    product: Product
  ) => {
    if (
      !window.confirm(
        `Delete "${
          product.name_en ||
          product.name_bn ||
          'this product'
        }"?`
      )
    ) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from('products')
          .delete()
          .eq('id', product.id);

      if (error) throw error;

      await load();
    } catch (err: any) {
      setError(
        err.message || 'Product delete failed.'
      );
    }
  };

  const uploadProductImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const url = await uploadImage(
        file,
        'products'
      );

      setForm((p: any) => ({
        ...p,
        image_url: url,
      }));
    } catch (err: any) {
      setError(
        err.message || 'Image upload failed.'
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);

    setForm({
      ...emptyForm,
      name_en: product.name_en || '',
      name_bn: product.name_bn || '',
      slug: product.slug || '',
      sku: product.sku || '',
      price: String(product.price ?? ''),
      old_price:
        product.old_price == null
          ? ''
          : String(product.old_price),
      stock: String(product.stock ?? 0),
      size_bn: product.size_bn || '',
      category_id:
        product.category_id || '',
      subcategory:
        product.subcategory || '',
      short_description_bn:
        product.short_description_bn || '',
      description_bn:
        product.description_bn || '',
      description_en:
        product.description_en || '',
      benefits_bn:
        product.benefits_bn || '',
      how_to_use_bn:
        product.how_to_use_bn || '',
      ingredients_bn:
        product.ingredients_bn || '',
      who_is_it_for_bn:
        product.who_is_it_for_bn || '',
      storage_bn:
        product.storage_bn || '',
      notes_bn:
        product.notes_bn || '',
      image_url:
        product.image_url || '',
      is_active:
        product.is_active ?? true,
      is_best_seller:
        product.is_best_seller ?? false,
      is_new:
        product.is_new ?? false,
      is_on_sale:
        product.is_on_sale ?? false,
      is_featured:
        product.is_featured ?? false,
    });

    setShowForm(true);
    setError('');
  };

  if (loading) return <LoadingBox />;

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${products.length} products`}
        action={
          <button
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setShowForm(true);
              setError('');
            }}
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        }
      />

      <ErrorBox error={error} retry={load} />

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg">
              {editingId
                ? 'Edit Product'
                : 'Add Product'}
            </h3>

            <button
              onClick={() =>
                setShowForm(false)
              }
            >
              <X />
            </button>
          </div>

          <form
            onSubmit={saveProduct}
            className="space-y-5"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Product Name English"
                required
                value={form.name_en}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    name_en: value,
                  }))
                }
              />

              <Input
                label="Product Name Bangla"
                value={form.name_bn}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    name_bn: value,
                  }))
                }
              />

              <Input
                label="Slug"
                value={form.slug}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    slug: value,
                  }))
                }
              />

              <Input
                label="SKU"
                value={form.sku}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    sku: value,
                  }))
                }
              />

              <Input
                label="Price"
                type="number"
                value={form.price}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    price: value,
                  }))
                }
              />

              <Input
                label="Old Price"
                type="number"
                value={form.old_price}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    old_price: value,
                  }))
                }
              />

              <Input
                label="Stock"
                type="number"
                value={form.stock}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    stock: value,
                  }))
                }
              />

              <Input
                label="Size"
                value={form.size_bn}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    size_bn: value,
                  }))
                }
              />

              <Select
                label="Category"
                value={form.category_id}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    category_id: value,
                  }))
                }
                options={[
                  {
                    value: '',
                    label: 'Select Category',
                  },
                  ...categories.map(
                    (category) => ({
                      value: category.id,
                      label:
                        category.name_en ||
                        category.name_bn,
                    })
                  ),
                ]}
              />

              <Input
                label="Subcategory"
                value={form.subcategory}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    subcategory: value,
                  }))
                }
              />
            </div>

            <TextArea
              label="Short Description"
              value={
                form.short_description_bn
              }
              onChange={(value) =>
                setForm((p: any) => ({
                  ...p,
                  short_description_bn:
                    value,
                }))
              }
            />

            <TextArea
              label="Description Bangla"
              value={form.description_bn}
              onChange={(value) =>
                setForm((p: any) => ({
                  ...p,
                  description_bn: value,
                }))
              }
            />

            <TextArea
              label="Description English"
              value={form.description_en}
              onChange={(value) =>
                setForm((p: any) => ({
                  ...p,
                  description_en: value,
                }))
              }
            />

            <div className="grid md:grid-cols-2 gap-4">
              <TextArea
                label="Benefits"
                value={form.benefits_bn}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    benefits_bn: value,
                  }))
                }
              />

              <TextArea
                label="How To Use"
                value={form.how_to_use_bn}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    how_to_use_bn: value,
                  }))
                }
              />

              <TextArea
                label="Ingredients"
                value={form.ingredients_bn}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    ingredients_bn: value,
                  }))
                }
              />

              <TextArea
                label="Who Is It For"
                value={
                  form.who_is_it_for_bn
                }
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    who_is_it_for_bn: value,
                  }))
                }
              />

              <TextArea
                label="Storage"
                value={form.storage_bn}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    storage_bn: value,
                  }))
                }
              />

              <TextArea
                label="Notes"
                value={form.notes_bn}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    notes_bn: value,
                  }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Product Image
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border cursor-pointer hover:bg-gray-50">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}

                  {uploading
                    ? 'Uploading...'
                    : 'Upload Image'}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={
                      uploadProductImage
                    }
                    disabled={uploading}
                  />
                </label>

                <input
                  value={form.image_url}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      image_url:
                        e.target.value,
                    }))
                  }
                  placeholder="Or paste image URL"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="w-32 h-32 object-cover rounded-lg border mt-3"
                />
              )}
            </div>

            <div className="flex flex-wrap gap-5">
              <Checkbox
                label="Active"
                checked={form.is_active}
                onChange={(checked) =>
                  setForm((p: any) => ({
                    ...p,
                    is_active: checked,
                  }))
                }
              />

              <Checkbox
                label="Best Seller"
                checked={
                  form.is_best_seller
                }
                onChange={(checked) =>
                  setForm((p: any) => ({
                    ...p,
                    is_best_seller:
                      checked,
                  }))
                }
              />

              <Checkbox
                label="New"
                checked={form.is_new}
                onChange={(checked) =>
                  setForm((p: any) => ({
                    ...p,
                    is_new: checked,
                  }))
                }
              />

              <Checkbox
                label="On Sale"
                checked={form.is_on_sale}
                onChange={(checked) =>
                  setForm((p: any) => ({
                    ...p,
                    is_on_sale: checked,
                  }))
                }
              />

              <Checkbox
                label="Featured"
                checked={form.is_featured}
                onChange={(checked) =>
                  setForm((p: any) => ({
                    ...p,
                    is_featured: checked,
                  }))
                }
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-5 py-2.5 rounded-lg flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}

                {editingId
                  ? 'Update'
                  : 'Save'}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="px-5 py-2.5 rounded-lg border"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border p-4 mb-5">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search product, SKU..."
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(
                e.target.value
              )
            }
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">
              All Categories
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name_en ||
                  category.name_bn}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3">
                  Product
                </th>
                <th className="text-left px-4 py-3">
                  SKU
                </th>
                <th className="text-left px-4 py-3">
                  Price
                </th>
                <th className="text-left px-4 py-3">
                  Stock
                </th>
                <th className="text-left px-4 py-3">
                  Status
                </th>
                <th className="text-right px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((product) => (
                <tr
                  key={product.id}
                  className="border-b last:border-0"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={
                            product.image_url
                          }
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}

                      <div>
                        <div className="font-medium">
                          {product.name_en ||
                            product.name_bn}
                        </div>

                        {product.name_bn &&
                          product.name_en && (
                            <div className="text-xs text-gray-500">
                              {product.name_bn}
                            </div>
                          )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {product.sku || '-'}
                  </td>

                  <td className="px-4 py-4 font-medium">
                    {money(product.price)}
                  </td>

                  <td className="px-4 py-4">
                    {Number(product.stock || 0)}
                  </td>

                  <td className="px-4 py-4">
                    {product.is_active ? (
                      <span className="text-green-600">
                        Active
                      </span>
                    ) : (
                      <span className="text-red-600">
                        Inactive
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() =>
                          startEdit(product)
                        }
                        className="p-2 rounded-lg hover:bg-gray-100"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() =>
                          deleteProduct(product)
                        }
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <EmptyState text="No products found." />
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CATEGORIES
========================================================= */

function CategoriesView() {
  const emptyForm = {
    name_bn: '',
    name_en: '',
    slug: '',
    description_bn: '',
    image_url: '',
    sort_order: '0',
    is_active: true,
  };

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [form, setForm] =
    useState<any>(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [
        { data: categoriesData, error: categoriesError },
        { data: productsData, error: productsError },
      ] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .order('sort_order', {
            ascending: true,
          }),

        supabase
          .from('products')
          .select('id,category_id'),
      ]);

      if (categoriesError)
        throw categoriesError;

      if (productsError)
        throw productsError;

      setCategories(categoriesData || []);
      setProducts(productsData || []);
    } catch (err: any) {
      setError(
        err.message || 'Categories load failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveCategory = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setSaving(true);
    setError('');

    try {
      const payload = {
        name_bn: form.name_bn.trim(),
        name_en: form.name_en.trim(),
        slug:
          form.slug.trim() ||
          slugify(
            form.name_en ||
              form.name_bn
          ),
        description_bn:
          form.description_bn.trim(),
        image_url:
          form.image_url.trim(),
        sort_order: Number(
          form.sort_order || 0
        ),
        is_active:
          Boolean(form.is_active),
      };

      if (editingId) {
        const { error } =
          await supabase
            .from('categories')
            .update(payload)
            .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } =
          await supabase
            .from('categories')
            .insert(payload);

        if (error) throw error;
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);

      await load();
    } catch (err: any) {
      setError(
        err.message || 'Category save failed.'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (
    category: Category
  ) => {
    const linkedProducts =
      products.filter(
        (product) =>
          product.category_id ===
          category.id
      ).length;

    if (linkedProducts > 0) {
      if (
        !window.confirm(
          `এই category-তে ${linkedProducts}টি product আছে। Delete না করে Inactive করতে চান?`
        )
      ) {
        return;
      }

      try {
        const { error } =
          await supabase
            .from('categories')
            .update({
              is_active: false,
            })
            .eq('id', category.id);

        if (error) throw error;

        await load();
      } catch (err: any) {
        setError(
          err.message ||
            'Category update failed.'
        );
      }

      return;
    }

    if (
      !window.confirm(
        `Delete "${
          category.name_en ||
          category.name_bn
        }"?`
      )
    ) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from('categories')
          .delete()
          .eq('id', category.id);

      if (error) throw error;

      await load();
    } catch (err: any) {
      setError(
        err.message ||
          'Category delete failed.'
      );
    }
  };

  const uploadCategoryImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const url = await uploadImage(
        file,
        'categories'
      );

      setForm((p: any) => ({
        ...p,
        image_url: url,
      }));
    } catch (err: any) {
      setError(
        err.message ||
          'Image upload failed.'
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) return <LoadingBox />;

  return (
    <div>
      <PageHeader
        title="Categories"
        description={`${categories.length} categories`}
        action={
          <button
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setShowForm(true);
              setError('');
            }}
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        }
      />

      <ErrorBox error={error} retry={load} />

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-lg">
              {editingId
                ? 'Edit Category'
                : 'Add Category'}
            </h3>

            <button
              onClick={() =>
                setShowForm(false)
              }
            >
              <X />
            </button>
          </div>

          <form
            onSubmit={saveCategory}
            className="space-y-4"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Category Name English"
                required
                value={form.name_en}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    name_en: value,
                  }))
                }
              />

              <Input
                label="Category Name Bangla"
                value={form.name_bn}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    name_bn: value,
                  }))
                }
              />

              <Input
                label="Slug"
                value={form.slug}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    slug: value,
                  }))
                }
              />

              <Input
                label="Sort Order"
                type="number"
                value={form.sort_order}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    sort_order: value,
                  }))
                }
              />
            </div>

            <TextArea
              label="Description"
              value={form.description_bn}
              onChange={(value) =>
                setForm((p: any) => ({
                  ...p,
                  description_bn: value,
                }))
              }
            />

            <div>
              <label className="block text-sm font-medium mb-2">
                Category Image
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border cursor-pointer hover:bg-gray-50">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}

                  {uploading
                    ? 'Uploading...'
                    : 'Upload Image'}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={
                      uploadCategoryImage
                    }
                    disabled={uploading}
                  />
                </label>

                <input
                  value={form.image_url}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      image_url:
                        e.target.value,
                    }))
                  }
                  placeholder="Or paste image URL"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="w-32 h-32 object-cover rounded-lg border mt-3"
                />
              )}
            </div>

            <Checkbox
              label="Active"
              checked={form.is_active}
              onChange={(checked) =>
                setForm((p: any) => ({
                  ...p,
                  is_active: checked,
                }))
              }
            />

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-5 py-2.5 rounded-lg flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}

                {editingId
                  ? 'Update'
                  : 'Save'}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="px-5 py-2.5 rounded-lg border"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {categories.map((category) => {
          const productCount =
            products.filter(
              (product) =>
                product.category_id ===
                category.id
            ).length;

          return (
            <div
              key={category.id}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex gap-4">
                {category.image_url ? (
                  <img
                    src={category.image_url}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center">
                    <FolderTree className="w-7 h-7 text-gray-400" />
                  </div>
                )}

                <div className="flex-1">
                  <div className="font-bold">
                    {category.name_en ||
                      category.name_bn}
                  </div>

                  <div className="text-sm text-gray-500">
                    {category.name_bn}
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    {productCount} products
                  </div>

                  <div className="mt-2">
                    {category.is_active ? (
                      <span className="text-green-600 text-xs">
                        Active
                      </span>
                    ) : (
                      <span className="text-red-600 text-xs">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setEditingId(
                      category.id
                    );

                    setForm({
                      name_bn:
                        category.name_bn ||
                        '',
                      name_en:
                        category.name_en ||
                        '',
                      slug:
                        category.slug || '',
                      description_bn:
                        category.description_bn ||
                        '',
                      image_url:
                        category.image_url ||
                        '',
                      sort_order: String(
                        category.sort_order ??
                          0
                      ),
                      is_active:
                        category.is_active ??
                        true,
                    });

                    setShowForm(true);
                    setError('');
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() =>
                    deleteCategory(
                      category
                    )
                  }
                  className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="bg-white rounded-xl border">
          <EmptyState text="No categories found." />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   ORDERS
========================================================= */

function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [
        { data: ordersData, error: ordersError },
        { data: itemsData, error: itemsError },
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('order_items')
          .select('*')
          .order('created_at', { ascending: true }),
      ]);

      if (ordersError) throw ordersError;
      if (itemsError) throw itemsError;

      setOrders(ordersData || []);
      setItems(itemsData || []);
    } catch (err: any) {
      setError(err.message || 'Orders load failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (order: Order, status: string) => {
    setUpdating(order.id);
    setError('');

    try {
      const updatedAt = new Date().toISOString();

      const { error } = await supabase
        .from('orders')
        .update({
          status,
          updated_at: updatedAt,
        })
        .eq('id', order.id);

      if (error) throw error;

      setOrders((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status,
                updated_at: updatedAt,
              }
            : item
        )
      );
    } catch (err: any) {
      setError(err.message || 'Status update failed.');
    } finally {
      setUpdating(null);
    }
  };

  const cancelOrder = async (order: Order) => {
    if (order.status === 'Delivered') {
      setError('Delivered order cancel করা যাবে না।');
      return;
    }

    if (order.status === 'Cancelled') return;

    if (
      !window.confirm(
        `Order #${
          order.order_number || order.id?.slice(0, 8)
        } cancel করতে চান?`
      )
    ) {
      return;
    }

    await updateStatus(order, 'Cancelled');
  };

  /*
   * Payment status list
   * Existing database values + standard values
   */
  const paymentStatuses = useMemo(() => {
    const values = new Map<string, string>();

    ['Paid', 'Unpaid', 'Partial'].forEach((value) => {
      values.set(value.toLowerCase(), value);
    });

    orders.forEach((order) => {
      const raw = String(order.payment_status || '').trim();

      if (raw) {
        const key = raw.toLowerCase();

        if (!values.has(key)) {
          values.set(key, raw);
        }
      }
    });

    return Array.from(values.values());
  }, [orders]);

  /*
   * Filter orders
   */
  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const q = search.toLowerCase().trim();

      const orderNumber = String(
        order.order_number || ''
      ).toLowerCase();

      const customerName = String(
        order.customer_name || ''
      ).toLowerCase();

      const phone = String(
        order.mobile || order.customer_phone || ''
      ).toLowerCase();

      const email = String(
        order.email || ''
      ).toLowerCase();

      const matchesSearch =
        !q ||
        orderNumber.includes(q) ||
        customerName.includes(q) ||
        phone.includes(q) ||
        email.includes(q);

      /*
       * Order status filter
       */
      const matchesStatus =
        !statusFilter ||
        String(order.status || '').toLowerCase() ===
          statusFilter.toLowerCase();

      /*
       * Payment status filter
       */
      const matchesPayment =
        !paymentFilter ||
        String(order.payment_status || '')
          .trim()
          .toLowerCase() === paymentFilter.toLowerCase();

      /*
       * Date filter
       */
      let matchesDate = true;

      if (dateFilter) {
        const created = new Date(order.created_at);

        if (Number.isNaN(created.getTime())) {
          matchesDate = false;
        } else {
          const now = new Date();

          const todayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );

          let start: Date | null = null;
          let end: Date | null = null;

          if (dateFilter === 'today') {
            start = new Date(todayStart);

            end = new Date(todayStart);
            end.setDate(end.getDate() + 1);
          }

          if (dateFilter === 'yesterday') {
            end = new Date(todayStart);

            start = new Date(todayStart);
            start.setDate(start.getDate() - 1);
          }

          if (dateFilter === '7') {
            start = new Date(todayStart);
            start.setDate(start.getDate() - 6);

            end = new Date(todayStart);
            end.setDate(end.getDate() + 1);
          }

          if (dateFilter === '30') {
            start = new Date(todayStart);
            start.setDate(start.getDate() - 29);

            end = new Date(todayStart);
            end.setDate(end.getDate() + 1);
          }

          if (dateFilter === 'custom') {
            if (customFrom) {
              start = new Date(`${customFrom}T00:00:00`);
            }

            if (customTo) {
              end = new Date(`${customTo}T00:00:00`);
              end.setDate(end.getDate() + 1);
            }

            if (
              start &&
              end &&
              start.getTime() > end.getTime()
            ) {
              matchesDate = false;
            }
          }

          if (start && created < start) {
            matchesDate = false;
          }

          if (end && created >= end) {
            matchesDate = false;
          }
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPayment &&
        matchesDate
      );
    });
  }, [
    orders,
    search,
    statusFilter,
    paymentFilter,
    dateFilter,
    customFrom,
    customTo,
  ]);

  /*
   * Reset all filters
   */
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPaymentFilter('');
    setDateFilter('');
    setCustomFrom('');
    setCustomTo('');
  };

  const itemsForOrder = (orderId: string) =>
    items.filter((item) => item.order_id === orderId);

  if (loading) {
    return <LoadingBox />;
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`${orders.length} total orders`}
        action={
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <ErrorBox error={error} retry={load} />

      {/* FILTER AREA */}
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-5">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID, customer, phone, email..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-gray-500"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          >
            <option value="">All Status</option>

            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Payment Status */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          >
            <option value="">All Payment</option>

            {paymentStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          {/* Date */}
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);

              if (e.target.value !== 'custom') {
                setCustomFrom('');
                setCustomTo('');
              }
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          >
            <option value="">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="custom">Custom Date</option>
          </select>
        </div>

        {/* Custom Date */}
        {dateFilter === 'custom' && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                From Date
              </label>

              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                To Date
              </label>

              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}

        {/* Result + Reset */}
        <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            Showing{' '}
            <span className="font-semibold text-gray-900">
              {filtered.length}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-gray-900">
              {orders.length}
            </span>{' '}
            orders
          </div>

          {dateFilter !== 'custom' && (
            <button
              onClick={resetFilters}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ORDERS */}
      <div className="space-y-4">
        {filtered.map((order) => {
          const orderItems = itemsForOrder(order.id);

          const knownStatuses = ORDER_STATUSES.includes(
            order.status
          )
            ? ORDER_STATUSES
            : [order.status, ...ORDER_STATUSES];

          const isExpanded =
            expanded === order.id;

          return (
            <div
              key={order.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  {/* Order */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        #
                        {order.order_number ||
                          order.id?.slice(0, 8)}
                      </h3>

                      <StatusBadge
                        status={order.status}
                      />
                    </div>

                    <p className="text-xs text-gray-500">
                      {dateTime(order.created_at)}
                    </p>
                  </div>

                  {/* Customer */}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">
                      {order.customer_name || '—'}
                    </p>

                    <p className="text-sm text-gray-600">
                      {order.mobile ||
                        order.customer_phone ||
                        '—'}
                    </p>

                    {order.email && (
                      <p className="break-all text-xs text-gray-500">
                        {order.email}
                      </p>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="min-w-[130px]">
                    <p className="text-lg font-bold text-gray-900">
                      {formatPrice(
                        Number(
                          order.grand_total ??
                            order.total ??
                            0
                        )
                      )}
                    </p>

                    <p className="text-xs text-gray-500">
                      {order.payment_method ||
                        'COD'}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex min-w-[180px] flex-col gap-2">
                    <select
                      value={order.status || ''}
                      disabled={updating === order.id}
                      onChange={(e) =>
                        updateStatus(
                          order,
                          e.target.value
                        )
                      }
                      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500 disabled:bg-gray-100"
                    >
                      {knownStatuses.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {status}
                          </option>
                        )
                      )}
                    </select>

                    {updating === order.id && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Updating...
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setExpanded(
                          isExpanded
                            ? null
                            : order.id
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="h-4 w-4" />

                      {isExpanded
                        ? 'Hide Items'
                        : `View Items (${orderItems.length})`}
                    </button>

                    {order.status !==
                      'Cancelled' &&
                      order.status !==
                        'Delivered' && (
                        <button
                          onClick={() =>
                            cancelOrder(order)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                        >
                          <XCircle className="h-4 w-4" />
                          Cancel
                        </button>
                      )}
                  </div>
                </div>

                {/* Customer / Payment / Address / Note */}
                <div className="mt-5 grid gap-4 border-t border-gray-100 pt-5 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      District
                    </p>
                    <p className="mt-1 text-sm text-gray-800">
                      {order.district || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Area
                    </p>
                    <p className="mt-1 text-sm text-gray-800">
                      {order.area || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Payment
                    </p>
                    <p className="mt-1 text-sm text-gray-800">
                      {order.payment_status ||
                        'Unpaid'}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Address
                    </p>
                    <p className="mt-1 break-words text-sm text-gray-800">
                      {order.address || '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Note
                    </p>
                    <p className="mt-1 break-words text-sm text-gray-800">
                      {order.order_note ||
                        order.note ||
                        '—'}
                    </p>
                  </div>
                </div>

                {/* ORDER ITEMS */}
                {isExpanded && (
                  <div className="mt-5 border-t border-gray-100 pt-5">
                    <h4 className="mb-3 text-sm font-semibold text-gray-900">
                      Order Items
                    </h4>

                    {orderItems.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No items found for this
                        order.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {orderItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3"
                          >
                            {item.image_url ? (
                              <img
                                src={
                                  item.image_url
                                }
                                alt={
                                  item.product_name
                                }
                                className="h-14 w-14 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500">
                                No Image
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {item.product_name}
                              </p>

                              <p className="text-xs text-gray-500">
                                {formatPrice(
                                  Number(
                                    item.price || 0
                                  )
                                )}{' '}
                                ×{' '}
                                {item.quantity}
                              </p>
                            </div>

                            <div className="text-sm font-semibold text-gray-900">
                              {formatPrice(
                                Number(
                                  item.price || 0
                                ) *
                                  Number(
                                    item.quantity || 0
                                  )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          title="No orders found"
          description="Try changing your search or filters."
        />
      )}
    </div>
  );
}

/* =========================================================
   CUSTOMERS
========================================================= */

function CustomersView() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [newsletterCount, setNewsletterCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [
        { data: ordersData, error: ordersError },
        { data: newsletterData, error: newsletterError },
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('newsletter')
          .select('id'),
      ]);

      if (ordersError) throw ordersError;
      if (newsletterError)
        throw newsletterError;

      setOrders(ordersData || []);
      setNewsletterCount(
        newsletterData?.length || 0
      );
    } catch (err: any) {
      setError(
        err.message ||
          'Customers load failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const customers = useMemo(() => {
    const map = new Map<string, any>();

    orders.forEach((order) => {
      const key =
        customerKey(order);

      const existing =
        map.get(key);

      const amount = Number(
        order.grand_total ??
          order.total ??
          0
      );

      if (!existing) {
        map.set(key, {
          key,
          name:
            order.customer_name ||
            '-',
          mobile:
            order.mobile ||
            order.customer_phone ||
            '-',
          altPhone:
            order.alt_phone || '-',
          email:
            order.email || '-',
          district:
            order.district || '-',
          area:
            order.area || '-',
          address:
            order.address || '-',
          orders: 1,
          delivered:
            order.status ===
            'Delivered'
              ? 1
              : 0,
          cancelled:
            order.status ===
            'Cancelled'
              ? 1
              : 0,
          spending:
            order.status ===
            'Delivered'
              ? amount
              : 0,
          orderValue:
            order.status !==
            'Cancelled'
              ? amount
              : 0,
          lastOrder:
            order.created_at,
        });

        return;
      }

      existing.orders += 1;

      if (
        order.status ===
        'Delivered'
      ) {
        existing.delivered += 1;
        existing.spending += amount;
      }

      if (
        order.status ===
        'Cancelled'
      ) {
        existing.cancelled += 1;
      }

      if (
        order.status !==
        'Cancelled'
      ) {
        existing.orderValue += amount;
      }

      if (
        new Date(
          order.created_at || 0
        ) >
        new Date(
          existing.lastOrder || 0
        )
      ) {
        existing.lastOrder =
          order.created_at;

        existing.district =
          order.district ||
          existing.district;

        existing.area =
          order.area ||
          existing.area;

        existing.address =
          order.address ||
          existing.address;

        existing.email =
          order.email ||
          existing.email;

        existing.altPhone =
          order.alt_phone ||
          existing.altPhone;
      }
    });

    return Array.from(
      map.values()
    ).sort(
      (a, b) =>
        new Date(
          b.lastOrder || 0
        ).getTime() -
        new Date(
          a.lastOrder || 0
        ).getTime()
    );
  }, [orders]);

  const filtered =
    customers.filter(
      (customer) => {
        const q = search
          .toLowerCase()
          .trim();

        return (
          !q ||
          String(
            customer.name
          )
            .toLowerCase()
            .includes(q) ||
          String(
            customer.mobile
          )
            .toLowerCase()
            .includes(q) ||
          String(
            customer.email
          )
            .toLowerCase()
            .includes(q) ||
          String(
            customer.address
          )
            .toLowerCase()
            .includes(q)
        );
      }
    );

  if (loading) return <LoadingBox />;

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Customers are generated from actual orders"
        action={
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg border bg-white flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      <ErrorBox error={error} retry={load} />

      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <StatCard
          title="Actual Customers"
          value={customers.length}
          icon={Users}
        />

        <StatCard
          title="Newsletter Subscribers"
          value={newsletterCount}
          icon={Tag}
        />

        <StatCard
          title="Total Orders"
          value={orders.length}
          icon={ShoppingBag}
        />
      </div>

      <div className="bg-white rounded-xl border p-4 mb-5">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search customer, phone, email..."
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3">
                  Customer
                </th>

                <th className="text-left px-4 py-3">
                  Contact
                </th>

                <th className="text-left px-4 py-3">
                  Orders
                </th>

                <th className="text-left px-4 py-3">
                  Delivered
                </th>

                <th className="text-left px-4 py-3">
                  Spent
                </th>

                <th className="text-left px-4 py-3">
                  Last Order
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(
                (customer) => (
                  <tr
                    key={customer.key}
                    className="border-b last:border-0"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold">
                        {customer.name}
                      </div>

                      <div className="text-xs text-gray-500">
                        {customer.district !==
                        '-'
                          ? `${customer.district}${
                              customer.area !==
                              '-'
                                ? `, ${customer.area}`
                                : ''
                            }`
                          : '-'}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div>
                        {customer.mobile}
                      </div>

                      {customer.email !==
                        '-' && (
                        <div className="text-xs text-gray-500">
                          {
                            customer.email
                          }
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {customer.orders}
                    </td>

                    <td className="px-4 py-4 text-green-600">
                      {customer.delivered}
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      {money(
                        customer.spending
                      )}
                    </td>

                    <td className="px-4 py-4 text-gray-500">
                      {dateOnly(
                        customer.lastOrder
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {filtered.length ===
          0 && (
          <EmptyState text="No customers found." />
        )}
      </div>
    </div>
  );
}

/* =========================================================
   REVIEWS
========================================================= */

function ReviewsView() {
  const [reviews, setReviews] =
    useState<Review[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } =
        await supabase
          .from('reviews')
          .select(
            '*, product:products(name_bn,name_en)'
          )
          .order('created_at', {
            ascending: false,
          });

      if (error) throw error;

      setReviews(data || []);
    } catch (err: any) {
      setError(
        err.message ||
          'Reviews load failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleApproval = async (
    review: Review
  ) => {
    try {
      const { error } =
        await supabase
          .from('reviews')
          .update({
            is_approved:
              !review.is_approved,
          })
          .eq('id', review.id);

      if (error) throw error;

      setReviews((prev) =>
        prev.map((item) =>
          item.id === review.id
            ? {
                ...item,
                is_approved:
                  !review.is_approved,
              }
            : item
        )
      );
    } catch (err: any) {
      setError(
        err.message ||
          'Review approval update failed.'
      );
    }
  };

  const deleteReview = async (
    id: string
  ) => {
    if (
      !window.confirm(
        'Review delete করতে চান?'
      )
    ) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from('reviews')
          .delete()
          .eq('id', id);

      if (error) throw error;

      setReviews((prev) =>
        prev.filter(
          (review) =>
            review.id !== id
        )
      );
    } catch (err: any) {
      setError(
        err.message ||
          'Review delete failed.'
      );
    }
  };

  if (loading) return <LoadingBox />;

  return (
    <div>
      <PageHeader
        title="Reviews"
        description={`${reviews.length} reviews`}
        action={
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg border bg-white flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      <ErrorBox error={error} retry={load} />

      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white rounded-xl border p-5"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-bold">
                    {review.customer_name ||
                      'Customer'}
                  </div>

                  {review.is_verified && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  )}

                  {review.is_approved ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      Approved
                    </span>
                  ) : (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                      Pending
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-500 mt-1">
                  {review.product
                    ?.name_en ||
                    review.product
                      ?.name_bn ||
                    'Product'}
                  {review.location
                    ? ` • ${review.location}`
                    : ''}
                </div>

                <div className="flex gap-1 mt-3">
                  {Array.from({
                    length: 5,
                  }).map((_, index) => (
                    <Star
                      key={index}
                      className={`w-4 h-4 ${
                        index <
                        Number(
                          review.rating ||
                            0
                        )
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <p className="mt-3 text-gray-700">
                  {review.review_bn ||
                    review.review ||
                    '-'}
                </p>
              </div>

              <div className="flex md:flex-col gap-2 md:w-32">
                <button
                  onClick={() =>
                    toggleApproval(
                      review
                    )
                  }
                  className={`flex-1 md:w-full px-3 py-2 rounded-lg text-sm ${
                    review.is_approved
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-green-50 text-green-700'
                  }`}
                >
                  {review.is_approved
                    ? 'Unapprove'
                    : 'Approve'}
                </button>

                <button
                  onClick={() =>
                    deleteReview(
                      review.id
                    )
                  }
                  className="flex-1 md:w-full px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {reviews.length === 0 && (
        <div className="bg-white rounded-xl border">
          <EmptyState text="No reviews found." />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   COUPONS
========================================================= */

function CouponsView() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<
    'percentage' | 'fixed'
  >('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('');
  const [maximumDiscount, setMaximumDiscount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinimumOrder('');
    setMaximumDiscount('');
    setUsageLimit('');
    setStartsAt('');
    setExpiresAt('');
    setIsActive(true);
    setError('');
  };

  const loadCoupons = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCoupons(data || []);
    } catch (err: any) {
      setError(err.message || 'Coupons load failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setSaving(true);
    setError('');

    try {
      if (!code.trim()) {
        throw new Error('Coupon code is required.');
      }

      if (
        !discountValue ||
        Number(discountValue) <= 0
      ) {
        throw new Error(
          'Discount value must be greater than 0.'
        );
      }

      if (
        discountType === 'percentage' &&
        Number(discountValue) > 100
      ) {
        throw new Error(
          'Percentage discount cannot be more than 100%.'
        );
      }

      const payload = {
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: Number(discountValue),
        minimum_order: Number(minimumOrder || 0),
        maximum_discount:
          discountType === 'percentage' &&
          maximumDiscount !== ''
            ? Number(maximumDiscount)
            : null,
        usage_limit:
          usageLimit !== ''
            ? Number(usageLimit)
            : null,
        starts_at: startsAt
          ? new Date(startsAt).toISOString()
          : null,
        expires_at: expiresAt
          ? new Date(expiresAt).toISOString()
          : null,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from('coupons')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert({
            ...payload,
            used_count: 0,
          });

        if (error) throw error;
      }

      resetForm();
      await loadCoupons();
    } catch (err: any) {
      setError(
        err.message || 'Coupon save failed.'
      );
    } finally {
      setSaving(false);
    }
  };

  const editCoupon = (coupon: any) => {
    setEditingId(coupon.id);

    setCode(coupon.code || '');
    setDescription(coupon.description || '');

    setDiscountType(
      coupon.discount_type === 'fixed'
        ? 'fixed'
        : 'percentage'
    );

    setDiscountValue(
      coupon.discount_value != null
        ? String(coupon.discount_value)
        : ''
    );

    setMinimumOrder(
      coupon.minimum_order != null
        ? String(coupon.minimum_order)
        : ''
    );

    setMaximumDiscount(
      coupon.maximum_discount != null
        ? String(coupon.maximum_discount)
        : ''
    );

    setUsageLimit(
      coupon.usage_limit != null
        ? String(coupon.usage_limit)
        : ''
    );

    setStartsAt(
      coupon.starts_at
        ? new Date(coupon.starts_at)
            .toISOString()
            .slice(0, 16)
        : ''
    );

    setExpiresAt(
      coupon.expires_at
        ? new Date(coupon.expires_at)
            .toISOString()
            .slice(0, 16)
        : ''
    );

    setIsActive(Boolean(coupon.is_active));

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }, 50);
  };

  const toggleActive = async (coupon: any) => {
    try {
      setError('');

      const { error } = await supabase
        .from('coupons')
        .update({
          is_active: !coupon.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', coupon.id);

      if (error) throw error;

      await loadCoupons();
    } catch (err: any) {
      setError(
        err.message ||
          'Coupon status update failed.'
      );
    }
  };

  const deleteCoupon = async (coupon: any) => {
    if (
      !window.confirm(
        `Coupon "${coupon.code}" delete করতে চান?`
      )
    ) {
      return;
    }

    try {
      setError('');

      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', coupon.id);

      if (error) throw error;

      if (editingId === coupon.id) {
        resetForm();
      }

      await loadCoupons();
    } catch (err: any) {
      setError(
        err.message || 'Coupon delete failed.'
      );
    }
  };

  const formatDiscount = (coupon: any) => {
    if (coupon.discount_type === 'fixed') {
      return formatPrice(
        Number(coupon.discount_value || 0)
      );
    }

    return `${Number(
      coupon.discount_value || 0
    )}%`;
  };

  if (loading) {
    return <LoadingBox />;
  }

  return (
    <div>
      <PageHeader
        title="Coupons"
        description={`${coupons.length} total coupons`}
        action={
          <button
            type="button"
            onClick={loadCoupons}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <ErrorBox
        error={error}
        retry={loadCoupons}
      />

      {/* CREATE / EDIT COUPON */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId
                ? 'Edit Coupon'
                : 'Create Coupon'}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Create discount codes for your customers.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* CODE + DESCRIPTION */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Coupon Code *
              </label>

              <input
                type="text"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.toUpperCase()
                  )
                }
                placeholder="WELCOME10"
                required
                autoComplete="off"
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>

              <input
                type="text"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="10% welcome discount"
                autoComplete="off"
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
              />
            </div>
          </div>

          {/* DISCOUNT TYPE + VALUE + MINIMUM */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Discount Type
              </label>

              <select
                value={discountType}
                onChange={(e) =>
                  setDiscountType(
                    e.target.value as
                      | 'percentage'
                      | 'fixed'
                  )
                }
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
              >
                <option value="percentage">
                  Percentage (%)
                </option>

                <option value="fixed">
                  Fixed Amount (৳)
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {discountType === 'percentage'
                  ? 'Discount Percentage *'
                  : 'Discount Amount *'}
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) =>
                  setDiscountValue(e.target.value)
                }
                placeholder={
                  discountType === 'percentage'
                    ? '10'
                    : '100'
                }
                required
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Minimum Order
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={minimumOrder}
                onChange={(e) =>
                  setMinimumOrder(e.target.value)
                }
                placeholder="500"
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
              />
            </div>
          </div>

          {/* MAX DISCOUNT + USAGE + ACTIVE */}
          <div className="grid gap-4 md:grid-cols-3">
            {discountType === 'percentage' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Maximum Discount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={maximumDiscount}
                  onChange={(e) =>
                    setMaximumDiscount(
                      e.target.value
                    )
                  }
                  placeholder="200"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Usage Limit
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={usageLimit}
                onChange={(e) =>
                  setUsageLimit(e.target.value)
                }
                placeholder="100"
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) =>
                    setIsActive(e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />

                <span>Coupon Active</span>
              </label>
            </div>
          </div>

          {/* DATES */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Start Date
              </label>

              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) =>
                  setStartsAt(e.target.value)
                }
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Expiry Date
              </label>

              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) =>
                  setExpiresAt(e.target.value)
                }
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
              />
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {editingId
                ? 'Update Coupon'
                : 'Create Coupon'}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* COUPON LIST */}
      <div className="space-y-4">
        {coupons.map((coupon) => {
          const usageLimitValue =
            coupon.usage_limit;

          const usedCount = Number(
            coupon.used_count || 0
          );

          const usageText =
            usageLimitValue != null
              ? `${usedCount} / ${usageLimitValue}`
              : `${usedCount} used`;

          const expired =
            coupon.expires_at &&
            new Date(coupon.expires_at) <
              new Date();

          return (
            <div
              key={coupon.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-sm font-bold text-gray-900">
                      {coupon.code}
                    </span>

                    {coupon.is_active ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        Inactive
                      </span>
                    )}

                    {expired && (
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                        Expired
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-gray-600">
                    {coupon.description ||
                      'No description'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-400">
                      Discount
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {formatDiscount(coupon)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">
                      Min Order
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {formatPrice(
                        Number(
                          coupon.minimum_order || 0
                        )
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">
                      Usage
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {usageText}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">
                      Expires
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {coupon.expires_at
                        ? dateTime(
                            coupon.expires_at
                          )
                        : 'No expiry'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      toggleActive(coupon)
                    }
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {coupon.is_active
                      ? 'Deactivate'
                      : 'Activate'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      editCoupon(coupon)
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteCoupon(coupon)
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {coupons.length === 0 && (
        <EmptyState
          title="No coupons found"
          description="Create your first coupon using the form above."
        />
      )}
    </div>
  );
}

/* =========================================================
   BANNERS
========================================================= */

function BannersView() {
  const emptyForm = {
    small_text_bn: '',
    title_bn: '',
    description_bn: '',
    button_text_bn: '',
    button_link: '',
    image_url: '',
    sort_order: '0',
    is_active: true,
  };

  const [banners, setBanners] =
    useState<Banner[]>([]);

  const [form, setForm] =
    useState<any>(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } =
        await supabase
          .from('banners')
          .select('*')
          .order('sort_order', {
            ascending: true,
          });

      if (error) throw error;

      setBanners(data || []);
    } catch (err: any) {
      setError(
        err.message ||
          'Banners load failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveBanner = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setSaving(true);
    setError('');

    try {
      const payload = {
        small_text_bn:
          form.small_text_bn.trim(),
        title_bn:
          form.title_bn.trim(),
        description_bn:
          form.description_bn.trim(),
        button_text_bn:
          form.button_text_bn.trim(),
        button_link:
          form.button_link.trim(),
        image_url:
          form.image_url.trim(),
        sort_order: Number(
          form.sort_order || 0
        ),
        is_active:
          Boolean(form.is_active),
      };

      if (editingId) {
        const { error } =
          await supabase
            .from('banners')
            .update(payload)
            .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } =
          await supabase
            .from('banners')
            .insert(payload);

        if (error) throw error;
      }

      setForm(emptyForm);
      setEditingId(null);
      setShowForm(false);

      await load();
    } catch (err: any) {
      setError(
        err.message ||
          'Banner save failed.'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteBanner = async (
    id: string
  ) => {
    if (
      !window.confirm(
        'Banner delete করতে চান?'
      )
    ) {
      return;
    }

    try {
      const { error } =
        await supabase
          .from('banners')
          .delete()
          .eq('id', id);

      if (error) throw error;

      await load();
    } catch (err: any) {
      setError(
        err.message ||
          'Banner delete failed.'
      );
    }
  };

  const uploadBannerImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const url = await uploadImage(
        file,
        'banners'
      );

      setForm((p: any) => ({
        ...p,
        image_url: url,
      }));
    } catch (err: any) {
      setError(
        err.message ||
          'Image upload failed.'
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) return <LoadingBox />;

  return (
    <div>
      <PageHeader
        title="Banners"
        description={`${banners.length} banners`}
        action={
          <button
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setShowForm(true);
              setError('');
            }}
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Banner
          </button>
        }
      />

      <ErrorBox error={error} retry={load} />

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-lg">
              {editingId
                ? 'Edit Banner'
                : 'Add Banner'}
            </h3>

            <button
              onClick={() =>
                setShowForm(false)
              }
            >
              <X />
            </button>
          </div>

          <form
            onSubmit={saveBanner}
            className="space-y-4"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Small Text"
                value={
                  form.small_text_bn
                }
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    small_text_bn:
                      value,
                  }))
                }
              />

              <Input
                label="Title"
                value={form.title_bn}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    title_bn: value,
                  }))
                }
              />

              <Input
                label="Button Text"
                value={
                  form.button_text_bn
                }
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    button_text_bn:
                      value,
                  }))
                }
              />

              <Input
                label="Button Link"
                value={form.button_link}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    button_link: value,
                  }))
                }
              />

              <Input
                label="Sort Order"
                type="number"
                value={form.sort_order}
                onChange={(value) =>
                  setForm((p: any) => ({
                    ...p,
                    sort_order: value,
                  }))
                }
              />
            </div>

            <TextArea
              label="Description"
              value={
                form.description_bn
              }
              onChange={(value) =>
                setForm((p: any) => ({
                  ...p,
                  description_bn:
                    value,
                }))
              }
            />

            <div>
              <label className="block text-sm font-medium mb-2">
                Banner Image
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border cursor-pointer">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}

                  {uploading
                    ? 'Uploading...'
                    : 'Upload Image'}

                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={
                      uploadBannerImage
                    }
                    disabled={uploading}
                  />
                </label>

                <input
                  value={form.image_url}
                  onChange={(e) =>
                    setForm((p: any) => ({
                      ...p,
                      image_url:
                        e.target.value,
                    }))
                  }
                  placeholder="Or paste image URL"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="mt-3 w-full max-w-md h-40 object-cover rounded-lg border"
                />
              )}
            </div>

            <Checkbox
              label="Active"
              checked={form.is_active}
              onChange={(checked) =>
                setForm((p: any) => ({
                  ...p,
                  is_active: checked,
                }))
              }
            />

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-5 py-2.5 rounded-lg flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}

                {editingId
                  ? 'Update'
                  : 'Save'}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
                className="px-5 py-2.5 rounded-lg border"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="bg-white rounded-xl border overflow-hidden"
          >
            {banner.image_url && (
              <img
                src={banner.image_url}
                alt=""
                className="w-full h-48 object-cover"
              />
            )}

            <div className="p-5">
              <div className="text-xs text-gray-500">
                {banner.small_text_bn}
              </div>

              <h3 className="font-bold text-xl mt-1">
                {banner.title_bn}
              </h3>

              <p className="text-sm text-gray-600 mt-2">
                {banner.description_bn}
              </p>

              <div className="flex items-center justify-between mt-4">
                <span
                  className={
                    banner.is_active
                      ? 'text-green-600 text-xs'
                      : 'text-red-600 text-xs'
                  }
                >
                  {banner.is_active
                    ? 'Active'
                    : 'Inactive'}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(
                        banner.id
                      );

                      setForm({
                        small_text_bn:
                          banner.small_text_bn ||
                          '',
                        title_bn:
                          banner.title_bn ||
                          '',
                        description_bn:
                          banner.description_bn ||
                          '',
                        button_text_bn:
                          banner.button_text_bn ||
                          '',
                        button_link:
                          banner.button_link ||
                          '',
                        image_url:
                          banner.image_url ||
                          '',
                        sort_order:
                          String(
                            banner.sort_order ??
                              0
                          ),
                        is_active:
                          banner.is_active ??
                          true,
                      });

                      setShowForm(true);
                      setError('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() =>
                      deleteBanner(
                        banner.id
                      )
                    }
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {banners.length === 0 && (
        <div className="bg-white rounded-xl border">
          <EmptyState text="No banners found." />
        </div>
      )}
    </div>
  );
}

/* =========================================================
   INVENTORY
========================================================= */

function InventoryView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [
        { data: productsData, error: productsError },
        { data: ordersData, error: ordersError },
        { data: itemsData, error: itemsError },
      ] = await Promise.all([
        supabase
          .from('products')
          .select(
            'id,name_en,name_bn,sku,stock,image_url,updated_at'
          )
          .order('stock', { ascending: true }),

        supabase
          .from('orders')
          .select('id,status'),

        supabase
          .from('order_items')
          .select(
            'id,order_id,product_id,product_name,price,quantity,image_url'
          ),
      ]);

      if (productsError) throw productsError;
      if (ordersError) throw ordersError;
      if (itemsError) throw itemsError;

      setProducts(productsData || []);
      setOrders(ordersData || []);
      setItems(itemsData || []);
    } catch (err: any) {
      setError(err?.message || 'Inventory load failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /*
   * Only Delivered orders count as sold.
   */
  const deliveredOrderIds = useMemo(() => {
    return new Set(
      orders
        .filter(
          (order) =>
            String(order.status || '').trim().toLowerCase() ===
            'delivered'
        )
        .map((order) => order.id)
    );
  }, [orders]);

  /*
   * Calculate sold quantity for each product.
   */
  const soldByProduct = useMemo(() => {
    const result: Record<string, number> = {};

    for (const item of items) {
      if (!item.product_id) continue;

      if (!deliveredOrderIds.has(item.order_id)) {
        continue;
      }

      const quantity = Math.max(
        0,
        Number(item.quantity) || 0
      );

      result[item.product_id] =
        (result[item.product_id] || 0) + quantity;
    }

    return result;
  }, [items, deliveredOrderIds]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const nameEn = String(product.name_en || '').toLowerCase();
      const nameBn = String(product.name_bn || '').toLowerCase();
      const sku = String(product.sku || '').toLowerCase();

      return (
        nameEn.includes(query) ||
        nameBn.includes(query) ||
        sku.includes(query)
      );
    });
  }, [products, search]);

  const updateStock = async (
    productId: string,
    value: string
  ) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const stock = Math.max(
      0,
      Math.floor(parsed)
    );

    setSavingId(productId);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

      if (updateError) {
        throw updateError;
      }

      setProducts((current) =>
        current.map((product) =>
          product.id === productId
            ? {
                ...product,
                stock,
              }
            : product
        )
      );
    } catch (err: any) {
      setError(
        err?.message || 'Stock update failed.'
      );
    } finally {
      setSavingId(null);
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) {
      return {
        label: 'Out of Stock',
        className:
          'bg-red-100 text-red-700 border-red-200',
      };
    }

    if (stock <= 5) {
      return {
        label: 'Low Stock',
        className:
          'bg-amber-100 text-amber-700 border-amber-200',
      };
    }

    return {
      label: 'In Stock',
      className:
        'bg-green-100 text-green-700 border-green-200',
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Inventory
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage product stock and delivered sales.
          </p>
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? 'animate-spin' : ''
            }`}
          />

          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search product name or SKU..."
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          Loading inventory...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <Boxes className="mx-auto h-10 w-10 text-gray-300" />

          <p className="mt-3 text-sm font-medium text-gray-700">
            No products found.
          </p>

          {search && (
            <p className="mt-1 text-xs text-gray-500">
              Try another product name or SKU.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map((product) => {
            const stock = Math.max(
              0,
              Math.floor(Number(product.stock) || 0)
            );

            const sold = Math.max(
              0,
              Math.floor(
                Number(
                  soldByProduct[product.id] || 0
                )
              )
            );

            const status = getStockStatus(stock);

            return (
              <div
                key={product.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                {/* Product information */}
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={
                          product.name_en ||
                          product.name_bn ||
                          'Product'
                        }
                        className="h-16 w-16 flex-shrink-0 rounded-xl border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400">
                        No Image
                      </div>
                    )}

                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-gray-900">
                        {product.name_en ||
                          product.name_bn ||
                          'Unnamed Product'}
                      </h3>

                      {product.name_bn &&
                        product.name_en && (
                          <p className="mt-1 text-sm text-gray-500">
                            {product.name_bn}
                          </p>
                        )}

                      <p className="mt-1 text-xs text-gray-400">
                        SKU:{' '}
                        <span className="font-medium text-gray-600">
                          {product.sku || 'Not set'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Inventory information */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[620px]">
                    {/* Current Stock */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">
                        Current Stock
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={stock}
                          onChange={(e) => {
                            const value =
                              Math.max(
                                0,
                                Math.floor(
                                  Number(
                                    e.target.value
                                  ) || 0
                                )
                              );

                            setProducts((current) =>
                              current.map(
                                (item) =>
                                  item.id ===
                                  product.id
                                    ? {
                                        ...item,
                                        stock:
                                          value,
                                      }
                                    : item
                              )
                            );
                          }}
                          onBlur={(e) =>
                            updateStock(
                              product.id,
                              e.target.value
                            )
                          }
                          className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-200"
                        />
                      </div>

                      {savingId === product.id && (
                        <p className="mt-1 text-xs text-gray-500">
                          Saving...
                        </p>
                      )}
                    </div>

                    {/* Sold */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">
                        Sold
                      </p>

                      <p className="mt-2 text-xl font-bold text-gray-900">
                        {sold}
                      </p>

                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Delivered orders
                      </p>
                    </div>

                    {/* Status */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">
                        Status
                      </p>

                      <span
                        className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Product ID / count */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">
                        Product
                      </p>

                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        Active
                      </p>

                      <p className="mt-0.5 text-[11px] text-gray-400">
                        Inventory item
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Information */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <strong>Sold quantity:</strong> Only quantities from
        Delivered orders are counted.
      </div>
    </div>
  );
}

/* =========================================================
   REPORTS
========================================================= */

function ReportsView() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } =
        await supabase
          .from('orders')
          .select('*')
          .order('created_at', {
            ascending: false,
          });

      if (error) throw error;

      setOrders(data || []);
    } catch (err: any) {
      setError(
        err.message ||
          'Reports load failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const delivered =
    orders.filter(
      (order) =>
        order.status ===
        'Delivered'
    );

  const nonCancelled =
    orders.filter(
      (order) =>
        order.status !==
        'Cancelled'
    );

  const realizedRevenue =
    delivered.reduce(
      (sum, order) =>
        sum +
        Number(
          order.grand_total ??
            order.total ??
            0
        ),
      0
    );

  const nonCancelledValue =
    nonCancelled.reduce(
      (sum, order) =>
        sum +
        Number(
          order.grand_total ??
            order.total ??
            0
        ),
      0
    );

  const averageDeliveredOrder =
    delivered.length > 0
      ? realizedRevenue /
        delivered.length
      : 0;

  const deliveryRate =
    nonCancelled.length > 0
      ? (delivered.length /
          nonCancelled.length) *
        100
      : 0;

  const statusCounts =
    ORDER_STATUSES.map(
      (status) => ({
        status,
        count: orders.filter(
          (order) =>
            order.status ===
            status
        ).length,
      })
    );

  const monthly = useMemo(() => {
    const result: {
      label: string;
      value: number;
    }[] = [];

    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      );

      const value = delivered
        .filter((order) => {
          const date = new Date(
            order.created_at
          );

          return (
            date.getFullYear() ===
              d.getFullYear() &&
            date.getMonth() ===
              d.getMonth()
          );
        })
        .reduce(
          (sum, order) =>
            sum +
            Number(
              order.grand_total ??
                order.total ??
                0
            ),
          0
        );

      result.push({
        label:
          d.toLocaleDateString(
            'en-US',
            {
              month: 'short',
            }
          ),
        value,
      });
    }

    return result;
  }, [orders]);

  if (loading) return <LoadingBox />;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Sales, orders and delivery performance"
        action={
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg border bg-white flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      <ErrorBox error={error} retry={load} />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Realized Revenue"
          value={money(
            realizedRevenue
          )}
          icon={BarChart3}
        />

        <StatCard
          title="Delivered AOV"
          value={money(
            averageDeliveredOrder
          )}
          icon={ShoppingBag}
        />

        <StatCard
          title="Delivery Rate"
          value={`${deliveryRate.toFixed(
            1
          )}%`}
          icon={CheckCircle2}
        />

        <StatCard
          title="Non-cancelled Order Value"
          value={money(
            nonCancelledValue
          )}
          icon={Package}
        />
      </div>

      <div className="grid xl:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-lg mb-5">
            Sales — Last 6 Months
          </h3>

          <div className="h-64 flex items-end gap-3">
            {monthly.map((item) => {
              const max = Math.max(
                ...monthly.map(
                  (x) => x.value
                ),
                1
              );

              const height =
                item.value > 0
                  ? Math.max(
                      (item.value /
                        max) *
                        100,
                      5
                    )
                  : 4;

              return (
                <div
                  key={item.label}
                  className="flex-1 h-full flex flex-col justify-end items-center gap-2"
                >
                  <div className="text-[10px] text-gray-500">
                    {item.value
                      ? money(
                          item.value
                        )
                      : ''}
                  </div>

                  <div
                    className="w-full max-w-12 bg-primary rounded-t"
                    style={{
                      height: `${height}%`,
                    }}
                  />

                  <div className="text-xs text-gray-500">
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-bold text-lg mb-5">
            Order Status
          </h3>

          <div className="space-y-4">
            {statusCounts.map(
              (item) => {
                const percentage =
                  orders.length > 0
                    ? (item.count /
                        orders.length) *
                      100
                    : 0;

                return (
                  <div
                    key={item.status}
                  >
                    <div className="flex justify-between text-sm mb-1">
                      <span>
                        {item.status}
                      </span>

                      <span className="font-medium">
                        {item.count}
                      </span>
                    </div>

                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 mt-6">
        <h3 className="font-bold text-lg mb-2">
          Revenue Calculation
        </h3>

        <p className="text-sm text-gray-600">
          Realized Revenue শুধু{' '}
          <strong>
            Delivered
          </strong>{' '}
          orders থেকে হিসাব করা হচ্ছে। Cancelled,
          Pending বা Processing orders-কে
          completed revenue হিসেবে ধরা হচ্ছে না।
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   PLACEHOLDER
========================================================= */

function PlaceholderView({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: any;
}) {
  return (
    <div>
      <PageHeader title={title} />

      <div className="bg-white rounded-xl border p-10 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="w-7 h-7" />
        </div>

        <h3 className="font-bold text-xl mt-4">
          {title}
        </h3>

        <p className="text-gray-500 max-w-xl mx-auto mt-2 text-sm">
          {description}
        </p>

        <div className="mt-5 inline-flex items-center gap-2 text-xs text-gray-400">
          <Settings className="w-4 h-4" />
          Database configuration required
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FORM COMPONENTS
========================================================= */

function Input({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}

        {required && (
          <span className="text-red-500 ml-1">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        rows={4}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        {options.map(
          (option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          )
        )}
      </select>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (
    checked: boolean
  ) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(
            e.target.checked
          )
        }
        className="w-4 h-4 accent-primary"
      />

      <span>{label}</span>
    </label>
  );
}