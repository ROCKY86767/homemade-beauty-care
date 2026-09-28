import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Star,
  Tag,
  Image,
  Boxes,
  BarChart3,
  Settings,
  Menu,
  X,
  Plus,
  Trash2,
  Edit,
  Clock,
  Save,
  Loader2,
} from 'lucide-react';

import AdminLogin from './AdminLogin';
import type {
  Product,
  Category,
  Review,
  Banner,
} from '@/lib/types';
import { formatPrice } from '@/lib/format';

const SIDEBAR_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'categories', label: 'Categories', icon: FolderTree },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'banners', label: 'Banners', icon: Image },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const location = useLocation();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');

    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;

      case 'products':
        return <ProductsView />;

      case 'categories':
        return <CategoriesView />;

      case 'orders':
        return <OrdersView />;

      case 'customers':
        return <CustomersView />;

      case 'reviews':
        return <ReviewsView />;

      case 'banners':
        return <BannersView />;

      case 'inventory':
        return <InventoryView />;

      case 'coupons':
        return <PlaceholderView title="Coupons" />;

      case 'reports':
        return <ReportsView />;

      case 'settings':
        return <PlaceholderView title="Settings" />;

      default:
        return <DashboardView />;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return <AdminLogin />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-dark text-white z-50 transition-transform duration-300 ${
          sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/new-homemade-logo.png"
              alt="Homemade Beauty Care"
              className="h-9 w-9 rounded-md object-contain bg-white"
            />

            <span className="font-display text-base font-bold">
              Admin Panel
            </span>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/70"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="p-3 overflow-y-auto h-[calc(100vh-65px)]">
          <ul className="space-y-1">
            {SIDEBAR_ITEMS.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-primary text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-ink"
          >
            <Menu size={24} />
          </button>

          <span className="font-display font-bold text-dark">
            Admin Panel
          </span>

          <Link to="/" className="text-sm text-primary">
            View Site
          </Link>
        </div>

        <div className="p-4 lg:p-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Dashboard
============================================================ */

function DashboardView() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    pending: 0,
    delivered: 0,
    customers: 0,
    products: 0,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [
        { data: orders },
        { data: products },
        { data: customers },
        { data: recent },
      ] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('products').select('*'),
        supabase.from('newsletter').select('*'),
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const allOrders = orders || [];

      const totalSales = allOrders.reduce(
        (sum, o) =>
          sum +
          Number(
            o.grand_total ??
              o.total ??
              0
          ),
        0
      );

      const pending = allOrders.filter(
        o =>
          o.status !== 'Delivered' &&
          o.status !== 'Cancelled'
      ).length;

      const delivered = allOrders.filter(
        o => o.status === 'Delivered'
      ).length;

      setStats({
        totalSales,
        totalOrders: allOrders.length,
        pending,
        delivered,
        customers: (customers || []).length,
        products: (products || []).length,
      });

      setRecentOrders(recent || []);

      setTopProducts(
        ((products || []) as Product[])
          .sort(
            (a, b) =>
              Number(b.review_count || 0) -
              Number(a.review_count || 0)
          )
          .slice(0, 5)
      );

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Sales',
      value: formatPrice(stats.totalSales),
      icon: ShoppingBag,
      color: 'bg-primary/10 text-primary',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: Package,
      color: 'bg-accent/10 text-accent',
    },
    {
      label: 'Pending Orders',
      value: stats.pending,
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      label: 'Delivered Orders',
      value: stats.delivered,
      icon: Boxes,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Customers',
      value: stats.customers,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Products',
      value: stats.products,
      icon: Tag,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-dark mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}
              >
                <card.icon size={22} />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              {card.label}
            </p>

            <p className="font-display text-2xl font-bold text-ink mt-1">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
          <h3 className="font-display text-lg font-semibold text-ink mb-4">
            Sales Overview
          </h3>

          <div className="flex items-end gap-2 h-48">
            {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map(
              (h, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-primary/20 rounded-t-lg transition-all hover:bg-primary/40"
                  style={{ height: `${h}%` }}
                />
              )
            )}
          </div>

          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Jan</span>
            <span>Mar</span>
            <span>Jun</span>
            <span>Sep</span>
            <span>Dec</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
          <h3 className="font-display text-lg font-semibold text-ink mb-4">
            Top Products
          </h3>

          <div className="space-y-3">
            {topProducts.map((p, idx) => (
              <div
                key={p.id}
                className="flex items-center gap-3"
              >
                <span className="text-sm font-bold text-gray-300 w-5">
                  {idx + 1}
                </span>

                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package size={16} className="text-gray-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink line-clamp-1">
                    {p.name_bn}
                  </p>

                  <p className="text-xs text-gray-400">
                    {p.review_count || 0} reviews
                  </p>
                </div>

                <span className="text-sm font-semibold text-ink">
                  {formatPrice(p.price)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
        <h3 className="font-display text-lg font-semibold text-ink mb-4">
          Recent Orders
        </h3>

        {recentOrders.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            কোনো অর্ডার নেই।
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Order ID</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Total</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>

              <tbody>
                {recentOrders.map(o => (
                  <tr
                    key={o.id}
                    className="border-b border-gray-50"
                  >
                    <td className="py-3 font-medium text-ink">
                      {o.order_number}
                    </td>

                    <td className="py-3 text-gray-600">
                      {o.customer_name}
                    </td>

                    <td className="py-3 font-semibold text-ink">
                      {formatPrice(
                        Number(
                          o.grand_total ??
                            o.total ??
                            0
                        )
                      )}
                    </td>

                    <td className="py-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                          o.status === 'Cancelled'
                            ? 'bg-red-50 text-red-600'
                            : o.status === 'Delivered'
                            ? 'bg-green-50 text-green-600'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Products
============================================================ */

function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const emptyForm = {
    name_bn: '',
    name_en: '',
    slug: '',
    short_description_bn: '',
    description_bn: '',
    description_en: '',
    benefits_bn: '',
    how_to_use_bn: '',
    ingredients_bn: '',
    who_is_it_for_bn: '',
    storage_bn: '',
    notes_bn: '',
    category_id: '',
    subcategory: '',
    price: '',
    old_price: '',
    stock: '0',
    sku: '',
    image_url: '',
    size_bn: '',
    is_active: true,
    is_best_seller: false,
    is_new: false,
    is_on_sale: false,
    is_featured: false,
  };

  const [form, setForm] = useState(emptyForm);

  const loadData = async () => {
    setLoading(true);

    const [
      { data: productData, error: productError },
      { data: categoryData, error: categoryError },
    ] = await Promise.all([
      supabase
        .from('products')
        .select('*, category:categories(*)')
        .order('created_at', { ascending: false }),

      supabase
        .from('categories')
        .select('*')
        .order('sort_order', {
          ascending: true,
        }),
    ]);

    if (productError) {
      console.error(productError);
      setError(productError.message);
    }

    if (categoryError) {
      console.error(categoryError);
    }

    setProducts((productData || []) as Product[]);
    setCategories((categoryData || []) as Category[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddForm = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setError('');

    setForm({
      name_bn: product.name_bn || '',
      name_en: product.name_en || '',
      slug: product.slug || '',
      short_description_bn:
        product.short_description_bn || '',
      description_bn: product.description_bn || '',
      description_en: product.description_en || '',
      benefits_bn: product.benefits_bn || '',
      how_to_use_bn: product.how_to_use_bn || '',
      ingredients_bn: product.ingredients_bn || '',
      who_is_it_for_bn:
        product.who_is_it_for_bn || '',
      storage_bn: product.storage_bn || '',
      notes_bn: product.notes_bn || '',
      category_id: product.category_id || '',
      subcategory: product.subcategory || '',
      price: product.price?.toString() || '',
      old_price: product.old_price?.toString() || '',
      stock: product.stock?.toString() || '0',
      sku: product.sku || '',
      image_url: product.image_url || '',
      size_bn: product.size_bn || '',
      is_active: product.is_active ?? true,
      is_best_seller:
        product.is_best_seller ?? false,
      is_new: product.is_new ?? false,
      is_on_sale: product.is_on_sale ?? false,
      is_featured:
        product.is_featured ?? false,
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingProduct(null);
    setForm(emptyForm);
    setError('');
  };

  const updateField = (
    field: string,
    value: any
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleNameEnChange = (
    value: string
  ) => {
    setForm(prev => ({
      ...prev,
      name_en: value,
      slug: editingProduct
        ? prev.slug
        : createSlug(value),
    }));
  };

  const handleSave = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');

    if (!form.name_bn.trim()) {
      setError(
        'Product Name (Bangla) দিন।'
      );
      return;
    }

    if (!form.name_en.trim()) {
      setError(
        'Product Name (English) দিন।'
      );
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      setError(
        'সঠিক Product Price দিন।'
      );
      return;
    }

    if (!form.slug.trim()) {
      setError(
        'Product slug দিন।'
      );
      return;
    }

    setSaving(true);

    const productData: any = {
      name_bn: form.name_bn.trim(),
      name_en: form.name_en.trim(),
      slug: form.slug.trim(),

      short_description_bn:
        form.short_description_bn.trim() || null,

      description_bn:
        form.description_bn.trim() || null,

      description_en:
        form.description_en.trim() || null,

      benefits_bn:
        form.benefits_bn.trim() || null,

      how_to_use_bn:
        form.how_to_use_bn.trim() || null,

      ingredients_bn:
        form.ingredients_bn.trim() || null,

      who_is_it_for_bn:
        form.who_is_it_for_bn.trim() || null,

      storage_bn:
        form.storage_bn.trim() || null,

      notes_bn:
        form.notes_bn.trim() || null,

      category_id:
        form.category_id || null,

      subcategory:
        form.subcategory.trim() || null,

      price: Number(form.price),

      old_price: form.old_price
        ? Number(form.old_price)
        : null,

      stock: Number(form.stock) || 0,

      sku:
        form.sku.trim() || null,

      image_url:
        form.image_url.trim(),

      size_bn:
        form.size_bn.trim() || null,

      is_active: form.is_active,
      is_best_seller: form.is_best_seller,
      is_new: form.is_new,
      is_on_sale: form.is_on_sale,
      is_featured: form.is_featured,

      rating:
        editingProduct?.rating || 0,

      review_count:
        editingProduct?.review_count || 0,

      updated_at:
        new Date().toISOString(),
    };

    let result;

    if (editingProduct) {
      result = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id)
        .select('*, category:categories(*)')
        .single();
    } else {
      result = await supabase
        .from('products')
        .insert(productData)
        .select('*, category:categories(*)')
        .single();
    }

    if (result.error) {
      console.error(result.error);
      setError(result.error.message);
      setSaving(false);
      return;
    }

    if (editingProduct) {
      setProducts(prev =>
        prev.map(p =>
          p.id === editingProduct.id
            ? (result.data as Product)
            : p
        )
      );
    } else {
      setProducts(prev => [
        result.data as Product,
        ...prev,
      ]);
    }

    setSaving(false);
    closeForm();
  };

  const handleDelete = async (
    id: string
  ) => {
    if (
      !confirm(
        'এই পণ্যটি মুছে ফেলতে চান?'
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
      alert(
        `Product delete করা যায়নি: ${error.message}`
      );
      return;
    }

    setProducts(prev =>
      prev.filter(p => p.id !== id)
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark">
            Products
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            মোট {products.length} টি product
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="btn-primary text-sm py-2 px-5 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 font-medium">
                  Product
                </th>

                <th className="px-4 py-3 font-medium">
                  Category
                </th>

                <th className="px-4 py-3 font-medium">
                  Price
                </th>

                <th className="px-4 py-3 font-medium">
                  Stock
                </th>

                <th className="px-4 py-3 font-medium">
                  Status
                </th>

                <th className="px-4 py-3 font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    এখনো কোনো product যোগ করা হয়নি।
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt=""
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                            <Package size={20} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="font-medium text-ink line-clamp-1">
                            {p.name_bn}
                          </p>

                          <p className="text-xs text-gray-400 line-clamp-1">
                            {p.name_en}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {p.category?.name_en ||
                        p.category?.name_bn ||
                        '-'}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">
                        {formatPrice(p.price)}
                      </p>

                      {p.old_price &&
                        p.old_price > p.price && (
                          <p className="text-xs text-gray-400 line-through">
                            {formatPrice(
                              p.old_price
                            )}
                          </p>
                        )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={
                          p.stock > 0
                            ? 'text-green-600'
                            : 'text-red-500'
                        }
                      >
                        {p.stock}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {!p.is_active && (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] text-gray-500">
                            Inactive
                          </span>
                        )}

                        {p.is_new && (
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] text-blue-600">
                            New
                          </span>
                        )}

                        {p.is_best_seller && (
                          <span className="rounded-full bg-yellow-50 px-2 py-1 text-[10px] text-yellow-600">
                            Best Seller
                          </span>
                        )}

                        {p.is_on_sale && (
                          <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] text-red-500">
                            Sale
                          </span>
                        )}

                        {p.is_featured && (
                          <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] text-green-600">
                            Featured
                          </span>
                        )}

                        {p.is_active &&
                          !p.is_new &&
                          !p.is_best_seller &&
                          !p.is_on_sale &&
                          !p.is_featured && (
                            <span className="rounded-full bg-green-50 px-2 py-1 text-[10px] text-green-600">
                              Active
                            </span>
                          )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            openEditForm(p)
                          }
                          title="Edit Product"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                        >
                          <Edit size={15} />
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(p.id)
                          }
                          title="Delete Product"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="font-display text-xl font-bold text-dark">
                  {editingProduct
                    ? 'Edit Product'
                    : 'Add New Product'}
                </h2>

                <p className="text-xs text-gray-400 mt-1">
                  Product information এখানে পূরণ করুন
                </p>
              </div>

              <button
                onClick={closeForm}
                className="h-9 w-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="overflow-y-auto p-6 space-y-6"
            >
              <div>
                <h3 className="font-semibold text-ink mb-4">
                  Basic Information
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name (Bangla) *
                    </label>

                    <input
                      value={form.name_bn}
                      onChange={e =>
                        updateField(
                          'name_bn',
                          e.target.value
                        )
                      }
                      placeholder="যেমন: হারবাল হেয়ার প্যাক"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name (English) *
                    </label>

                    <input
                      value={form.name_en}
                      onChange={e =>
                        handleNameEnChange(
                          e.target.value
                        )
                      }
                      placeholder="Herbal Hair Pack"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug *
                    </label>

                    <input
                      value={form.slug}
                      onChange={e =>
                        updateField(
                          'slug',
                          e.target.value
                        )
                      }
                      placeholder="herbal-hair-pack"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>

                    <select
                      value={form.category_id}
                      onChange={e =>
                        updateField(
                          'category_id',
                          e.target.value
                        )
                      }
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary bg-white"
                    >
                      <option value="">
                        Select Category
                      </option>

                      {categories.map(cat => (
                        <option
                          key={cat.id}
                          value={cat.id}
                        >
                          {cat.name_en ||
                            cat.name_bn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategory
                    </label>

                    <input
                      value={form.subcategory}
                      onChange={e =>
                        updateField(
                          'subcategory',
                          e.target.value
                        )
                      }
                      placeholder="Hair Oil"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Size
                    </label>

                    <input
                      value={form.size_bn}
                      onChange={e =>
                        updateField(
                          'size_bn',
                          e.target.value
                        )
                      }
                      placeholder="100ml / 200g"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-4">
                  Price & Stock
                </h3>

                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price *
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={e =>
                        updateField(
                          'price',
                          e.target.value
                        )
                      }
                      placeholder="370"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Old Price
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={form.old_price}
                      onChange={e =>
                        updateField(
                          'old_price',
                          e.target.value
                        )
                      }
                      placeholder="450"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={e =>
                        updateField(
                          'stock',
                          e.target.value
                        )
                      }
                      placeholder="20"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>

                    <input
                      value={form.sku}
                      onChange={e =>
                        updateField(
                          'sku',
                          e.target.value
                        )
                      }
                      placeholder="HBC-001"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-4">
                  Product Image
                </h3>

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>

                <input
                  value={form.image_url}
                  onChange={e =>
                    updateField(
                      'image_url',
                      e.target.value
                    )
                  }
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                />

                {form.image_url && (
                  <div className="mt-3">
                    <img
                      src={form.image_url}
                      alt="Preview"
                      className="h-32 w-32 rounded-xl object-cover border border-gray-200"
                      onError={e => {
                        e.currentTarget.style.display =
                          'none';
                      }}
                    />
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-2">
                  আপাতত Image URL ব্যবহার করা হচ্ছে।
                  পরে সরাসরি image upload system যোগ করা হবে।
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-4">
                  Product Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Short Description
                    </label>

                    <textarea
                      rows={2}
                      value={
                        form.short_description_bn
                      }
                      onChange={e =>
                        updateField(
                          'short_description_bn',
                          e.target.value
                        )
                      }
                      placeholder="পণ্যের সংক্ষিপ্ত পরিচিতি..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Bangla)
                    </label>

                    <textarea
                      rows={4}
                      value={form.description_bn}
                      onChange={e =>
                        updateField(
                          'description_bn',
                          e.target.value
                        )
                      }
                      placeholder="পণ্যের বিস্তারিত বিবরণ..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (English)
                    </label>

                    <textarea
                      rows={3}
                      value={form.description_en}
                      onChange={e =>
                        updateField(
                          'description_en',
                          e.target.value
                        )
                      }
                      placeholder="Product description..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Benefits
                      </label>

                      <textarea
                        rows={4}
                        value={form.benefits_bn}
                        onChange={e =>
                          updateField(
                            'benefits_bn',
                            e.target.value
                          )
                        }
                        placeholder="পণ্যের উপকারিতা..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        How to Use
                      </label>

                      <textarea
                        rows={4}
                        value={form.how_to_use_bn}
                        onChange={e =>
                          updateField(
                            'how_to_use_bn',
                            e.target.value
                          )
                        }
                        placeholder="ব্যবহারের নিয়ম..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ingredients
                      </label>

                      <textarea
                        rows={4}
                        value={form.ingredients_bn}
                        onChange={e =>
                          updateField(
                            'ingredients_bn',
                            e.target.value
                          )
                        }
                        placeholder="উপাদান..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Who is it for?
                      </label>

                      <textarea
                        rows={4}
                        value={
                          form.who_is_it_for_bn
                        }
                        onChange={e =>
                          updateField(
                            'who_is_it_for_bn',
                            e.target.value
                          )
                        }
                        placeholder="কার জন্য উপযোগী..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Storage
                      </label>

                      <textarea
                        rows={3}
                        value={form.storage_bn}
                        onChange={e =>
                          updateField(
                            'storage_bn',
                            e.target.value
                          )
                        }
                        placeholder="সংরক্ষণের নিয়ম..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>

                      <textarea
                        rows={3}
                        value={form.notes_bn}
                        onChange={e =>
                          updateField(
                            'notes_bn',
                            e.target.value
                          )
                        }
                        placeholder="অতিরিক্ত তথ্য..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-4">
                  Product Options
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <label className="flex items-center gap-2 border border-gray-200 rounded-xl p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e =>
                        updateField(
                          'is_active',
                          e.target.checked
                        )
                      }
                    />
                    <span className="text-sm">
                      Active
                    </span>
                  </label>

                  <label className="flex items-center gap-2 border border-gray-200 rounded-xl p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        form.is_best_seller
                      }
                      onChange={e =>
                        updateField(
                          'is_best_seller',
                          e.target.checked
                        )
                      }
                    />
                    <span className="text-sm">
                      Best Seller
                    </span>
                  </label>

                  <label className="flex items-center gap-2 border border-gray-200 rounded-xl p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_new}
                      onChange={e =>
                        updateField(
                          'is_new',
                          e.target.checked
                        )
                      }
                    />
                    <span className="text-sm">
                      New
                    </span>
                  </label>

                  <label className="flex items-center gap-2 border border-gray-200 rounded-xl p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        form.is_on_sale
                      }
                      onChange={e =>
                        updateField(
                          'is_on_sale',
                          e.target.checked
                        )
                      }
                    />
                    <span className="text-sm">
                      On Sale
                    </span>
                  </label>

                  <label className="flex items-center gap-2 border border-gray-200 rounded-xl p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        form.is_featured
                      }
                      onChange={e =>
                        updateField(
                          'is_featured',
                          e.target.checked
                        )
                      }
                    />
                    <span className="text-sm">
                      Featured
                    </span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-4 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-6 py-3 flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {editingProduct
                        ? 'Update Product'
                        : 'Save Product'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Categories
============================================================ */

function CategoriesView() {
  const [categories, setCategories] =
    useState<Category[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const emptyForm = {
    name_bn: '',
    name_en: '',
    slug: '',
    description_bn: '',
    image_url: '',
    sort_order: '0',
    is_active: true,
  };

  const [form, setForm] =
    useState(emptyForm);

  const loadCategories = async () => {
    setLoading(true);

    const { data, error } =
      await supabase
        .from('categories')
        .select('*')
        .order('sort_order', {
          ascending: true,
        });

    if (error) {
      setError(error.message);
    }

    setCategories(
      (data || []) as Category[]
    );

    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openAdd = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEdit = (
    category: Category
  ) => {
    setEditingCategory(category);

    setForm({
      name_bn: category.name_bn || '',
      name_en: category.name_en || '',
      slug: category.slug || '',
      description_bn:
        category.description_bn || '',
      image_url:
        category.image_url || '',
      sort_order:
        category.sort_order?.toString() ||
        '0',
      is_active:
        category.is_active ?? true,
    });

    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingCategory(null);
    setForm(emptyForm);
    setError('');
  };

  const updateField = (
    field: string,
    value: any
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const makeSlug = (
    value: string
  ) => {
    return value
      .toLowerCase()
      .trim()
      .replace(
        /[^a-z0-9\s-]/g,
        ''
      )
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const saveCategory = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');

    if (!form.name_en.trim()) {
      setError(
        'Category English name দিন।'
      );
      return;
    }

    if (!form.slug.trim()) {
      setError(
        'Category slug দিন।'
      );
      return;
    }

    setSaving(true);

    const categoryData = {
      name_bn:
        form.name_bn.trim(),

      name_en:
        form.name_en.trim(),

      slug:
        form.slug.trim(),

      description_bn:
        form.description_bn.trim() ||
        null,

      image_url:
        form.image_url.trim() ||
        null,

      sort_order:
        Number(form.sort_order) || 0,

      is_active:
        form.is_active,
    };

    let result;

    if (editingCategory) {
      result = await supabase
        .from('categories')
        .update(categoryData)
        .eq(
          'id',
          editingCategory.id
        )
        .select('*')
        .single();
    } else {
      result = await supabase
        .from('categories')
        .insert(categoryData)
        .select('*')
        .single();
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    if (editingCategory) {
      setCategories(prev =>
        prev.map(c =>
          c.id === editingCategory.id
            ? (result.data as Category)
            : c
        )
      );
    } else {
      setCategories(prev => [
        ...prev,
        result.data as Category,
      ]);
    }

    setSaving(false);
    closeForm();
  };

  const deleteCategory = async (
    id: string
  ) => {
    if (
      !confirm(
        'এই category মুছে ফেলতে চান?'
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) {
      alert(
        `Category delete করা যায়নি: ${error.message}`
      );
      return;
    }

    setCategories(prev =>
      prev.filter(c => c.id !== id)
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark">
            Categories
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            মোট {categories.length} টি category
          </p>
        </div>

        <button
          onClick={openAdd}
          className="btn-primary text-sm py-2 px-5 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-50 text-gray-400">
          এখনো কোনো category যোগ করা হয়নি।
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50"
            >
              {cat.image_url ? (
                <img
                  src={cat.image_url}
                  alt=""
                  className="h-32 w-full rounded-xl object-cover mb-3"
                />
              ) : (
                <div className="h-32 w-full rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                  <FolderTree
                    size={30}
                    className="text-gray-300"
                  />
                </div>
              )}

              <h3 className="font-display text-base font-semibold text-ink">
                {cat.name_en ||
                  cat.name_bn}
              </h3>

              {cat.name_bn && (
                <p className="text-xs text-gray-400 mb-1">
                  {cat.name_bn}
                </p>
              )}

              <p className="text-xs text-gray-400 mb-3">
                {cat.slug}
              </p>

              <div className="flex items-center justify-between">
                <span
                  className={`text-xs rounded-full px-2 py-1 ${
                    cat.is_active
                      ? 'bg-green-50 text-green-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {cat.is_active
                    ? 'Active'
                    : 'Inactive'}
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      openEdit(cat)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                  >
                    <Edit size={15} />
                  </button>

                  <button
                    onClick={() =>
                      deleteCategory(cat.id)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-display text-xl font-bold text-dark">
                  {editingCategory
                    ? 'Edit Category'
                    : 'Add Category'}
                </h2>
              </div>

              <button
                onClick={closeForm}
                className="h-9 w-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveCategory}
              className="p-6 overflow-y-auto space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name (English) *
                </label>

                <input
                  value={form.name_en}
                  onChange={e => {
                    const value =
                      e.target.value;

                    setForm(prev => ({
                      ...prev,
                      name_en: value,
                      slug: editingCategory
                        ? prev.slug
                        : makeSlug(value),
                    }));
                  }}
                  placeholder="Hair Care"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name (Bangla)
                </label>

                <input
                  value={form.name_bn}
                  onChange={e =>
                    updateField(
                      'name_bn',
                      e.target.value
                    )
                  }
                  placeholder="চুলের যত্ন"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug *
                </label>

                <input
                  value={form.slug}
                  onChange={e =>
                    updateField(
                      'slug',
                      e.target.value
                    )
                  }
                  placeholder="hair-care"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={
                    form.description_bn
                  }
                  onChange={e =>
                    updateField(
                      'description_bn',
                      e.target.value
                    )
                  }
                  placeholder="Category description..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>

                <input
                  value={form.image_url}
                  onChange={e =>
                    updateField(
                      'image_url',
                      e.target.value
                    )
                  }
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>

                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e =>
                      updateField(
                        'sort_order',
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  />
                </div>

                <label className="flex items-center gap-2 border border-gray-200 rounded-xl p-3 mt-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e =>
                      updateField(
                        'is_active',
                        e.target.checked
                      )
                    }
                  />

                  <span className="text-sm">
                    Active
                  </span>
                </label>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-6 py-3 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Category
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Orders
============================================================ */

function OrdersView() {
  const [orders, setOrders] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);

    const { data, error } =
      await supabase
        .from('orders')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

    if (error) {
      console.error(error);
    }

    setOrders(data || []);
    setLoading(false);
  };

  const updateStatus = async (
    id: string,
    status: string
  ) => {
    const { error } =
      await supabase
        .from('orders')
        .update({
          status,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
      alert(
        `Order status update করা যায়নি: ${error.message}`
      );
      return;
    }

    setOrders(prev =>
      prev.map(o =>
        o.id === id
          ? {
              ...o,
              status,
              updated_at:
                new Date().toISOString(),
            }
          : o
      )
    );
  };

  const cancelOrder = async (
    order: any
  ) => {
    if (order.status === 'Cancelled') {
      return;
    }

    if (order.status === 'Delivered') {
      alert(
        'Delivered order cancel করা যাবে না।'
      );
      return;
    }

    const confirmed = confirm(
      `আপনি কি ${order.order_number} orderটি cancel করতে চান?`
    );

    if (!confirmed) {
      return;
    }

    await updateStatus(
      order.id,
      'Cancelled'
    );
  };

  const STATUSES = [
    'Order Placed',
    'Confirmed',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancelled',
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark">
            Orders
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            মোট {orders.length} টি order
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-50">
          কোনো অর্ডার নেই।
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => {
            const isCancelled =
              o.status === 'Cancelled';

            const isDelivered =
              o.status === 'Delivered';

            return (
              <div
                key={o.id}
                className={`bg-white rounded-2xl p-5 shadow-sm border ${
                  isCancelled
                    ? 'border-red-100 bg-red-50/30'
                    : 'border-gray-50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Order Information */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-ink">
                        {o.order_number}
                      </span>

                      <span className="text-sm text-gray-400">
                        — {o.customer_name}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500">
                      {o.mobile ||
                        o.customer_phone ||
                        '-'}{' '}
                      |{' '}
                      {o.district || '-'}
                      , {o.area || '-'}
                    </p>

                    {o.address && (
                      <p className="text-sm text-gray-500 mt-1">
                        ঠিকানা: {o.address}
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(
                        o.created_at
                      ).toLocaleString()}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="lg:text-right">
                    <p className="font-display text-lg font-bold text-primary">
                      {formatPrice(
                        Number(
                          o.grand_total ??
                            o.total ??
                            0
                        )
                      )}
                    </p>

                    <p className="text-xs text-gray-400">
                      {o.payment_method || '-'}
                    </p>
                  </div>

                  {/* Status + Cancel */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 min-w-[180px]">
                    <select
                      value={
                        o.status ||
                        'Order Placed'
                      }
                      onChange={e =>
                        updateStatus(
                          o.id,
                          e.target.value
                        )
                      }
                      className={`rounded-lg border px-3 py-2 text-sm font-medium outline-none cursor-pointer ${
                        isCancelled
                          ? 'border-red-200 bg-red-50 text-red-600'
                          : isDelivered
                          ? 'border-green-200 bg-green-50 text-green-600'
                          : 'border-gray-200 bg-white text-ink focus:border-primary'
                      }`}
                    >
                      {STATUSES.map(status => (
                        <option
                          key={status}
                          value={status}
                        >
                          {status}
                        </option>
                      ))}
                    </select>

                    {!isCancelled &&
                      !isDelivered && (
                        <button
                          type="button"
                          onClick={() =>
                            cancelOrder(o)
                          }
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          Cancel Order
                        </button>
                      )}

                    {isCancelled && (
                      <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-center text-sm font-medium text-red-600">
                        Order Cancelled
                      </div>
                    )}

                    {isDelivered && (
                      <div className="rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-center text-sm font-medium text-green-600">
                        Order Delivered
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Customers
============================================================ */

function CustomersView() {
  const [subscribers, setSubscribers] =
    useState<
      {
        id: string;
        email: string;
        created_at: string;
      }[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } =
        await supabase
          .from('newsletter')
          .select('*')
          .order('created_at', {
            ascending: false,
          });

      if (error) {
        console.error(error);
      }

      setSubscribers(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-dark mb-6">
        Customers
      </h1>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50">
          <p className="text-sm text-gray-500">
            Newsletter Subscribers
          </p>

          <p className="font-display text-2xl font-bold text-ink mt-1">
            {subscribers.length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 font-medium">
                  Email
                </th>

                <th className="px-4 py-3 font-medium">
                  Subscribed At
                </th>
              </tr>
            </thead>

            <tbody>
              {subscribers.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    কোনো subscriber নেই।
                  </td>
                </tr>
              ) : (
                subscribers.map(s => (
                  <tr
                    key={s.id}
                    className="border-b border-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      {s.email}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {new Date(
                        s.created_at
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Reviews
============================================================ */

function ReviewsView() {
  const [reviews, setReviews] =
    useState<
      (Review & {
        product_name?: string;
      })[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } =
        await supabase
          .from('reviews')
          .select(
            '*, product:products(name_bn)'
          )
          .order('created_at', {
            ascending: false,
          });

      if (error) {
        console.error(error);
      }

      setReviews(
        (data || []).map(
          (r: any) => ({
            ...r,
            product_name:
              r.product?.name_bn,
          })
        )
      );

      setLoading(false);
    })();
  }, []);

  const handleDelete = async (
    id: string
  ) => {
    if (
      !confirm(
        'এই রিভিউ মুছে ফেলতে চান?'
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from('reviews')
        .delete()
        .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    setReviews(prev =>
      prev.filter(r => r.id !== id)
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-dark mb-6">
        Reviews
      </h1>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
          কোনো review নেই।
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div
              key={r.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-ink">
                      {r.customer_name}
                    </span>

                    {r.location && (
                      <span className="text-sm text-gray-400">
                        — {r.location}
                      </span>
                    )}

                    {r.is_verified && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        Verified
                      </span>
                    )}
                  </div>

                  {r.product_name && (
                    <p className="text-sm text-gray-500 mb-1">
                      Product:{' '}
                      {r.product_name}
                    </p>
                  )}

                  <p className="text-sm text-gray-600">
                    "
                    {r.review_bn ||
                      (r as any)
                        .review_text ||
                      ''}
                    "
                  </p>

                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map(
                      s => (
                        <span
                          key={s}
                          className={
                            s <= r.rating
                              ? 'text-accent'
                              : 'text-gray-200'
                          }
                        >
                          ★
                        </span>
                      )
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    handleDelete(r.id)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Banners
============================================================ */

function BannersView() {
  const [banners, setBanners] =
    useState<Banner[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [showForm, setShowForm] =
    useState(false);

  const [editingBanner, setEditingBanner] =
    useState<Banner | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

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

  const [form, setForm] =
    useState(emptyForm);

  const loadBanners = async () => {
    setLoading(true);

    const { data, error } =
      await supabase
        .from('banners')
        .select('*')
        .order('sort_order', {
          ascending: true,
        });

    if (error) {
      setError(error.message);
    }

    setBanners(
      (data || []) as Banner[]
    );

    setLoading(false);
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const openAdd = () => {
    setEditingBanner(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEdit = (
    banner: Banner
  ) => {
    setEditingBanner(banner);

    setForm({
      small_text_bn:
        banner.small_text_bn || '',

      title_bn:
        banner.title_bn || '',

      description_bn:
        banner.description_bn || '',

      button_text_bn:
        banner.button_text_bn || '',

      button_link:
        banner.button_link || '',

      image_url:
        banner.image_url || '',

      sort_order:
        banner.sort_order?.toString() ||
        '0',

      is_active:
        banner.is_active ?? true,
    });

    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingBanner(null);
    setForm(emptyForm);
    setError('');
  };

  const updateField = (
    field: string,
    value: any
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveBanner = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError('');

    if (!form.title_bn.trim()) {
      setError(
        'Banner title দিন।'
      );
      return;
    }

    setSaving(true);

    const bannerData: any = {
      small_text_bn:
        form.small_text_bn.trim() ||
        null,

      title_bn:
        form.title_bn.trim(),

      description_bn:
        form.description_bn.trim() ||
        null,

      button_text_bn:
        form.button_text_bn.trim() ||
        null,

      button_link:
        form.button_link.trim() ||
        null,

      image_url:
        form.image_url.trim() ||
        null,

      sort_order:
        Number(form.sort_order) || 0,

      is_active:
        form.is_active,
    };

    let result;

    if (editingBanner) {
      result = await supabase
        .from('banners')
        .update(bannerData)
        .eq(
          'id',
          editingBanner.id
        )
        .select('*')
        .single();
    } else {
      result = await supabase
        .from('banners')
        .insert(bannerData)
        .select('*')
        .single();
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    if (editingBanner) {
      setBanners(prev =>
        prev.map(b =>
          b.id === editingBanner.id
            ? (result.data as Banner)
            : b
        )
      );
    } else {
      setBanners(prev => [
        ...prev,
        result.data as Banner,
      ]);
    }

    setSaving(false);
    closeForm();
  };

  const deleteBanner = async (
    id: string
  ) => {
    if (
      !confirm(
        'এই banner মুছে ফেলতে চান?'
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from('banners')
        .delete()
        .eq('id', id);

    if (error) {
      alert(
        `Banner delete করা যায়নি: ${error.message}`
      );
      return;
    }

    setBanners(prev =>
      prev.filter(b => b.id !== id)
    );
  };

  const toggleActive = async (
    banner: Banner
  ) => {
    const newValue =
      !banner.is_active;

    const { error } =
      await supabase
        .from('banners')
        .update({
          is_active: newValue,
        })
        .eq('id', banner.id);

    if (error) {
      alert(error.message);
      return;
    }

    setBanners(prev =>
      prev.map(b =>
        b.id === banner.id
          ? {
              ...b,
              is_active: newValue,
            }
          : b
      )
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark">
            Banners
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            মোট {banners.length} টি banner
          </p>
        </div>

        <button
          onClick={openAdd}
          className="btn-primary text-sm py-2 px-5 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Banner
        </button>
      </div>

      {banners.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
          এখনো কোনো banner যোগ করা হয়নি।
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map(b => (
            <div
              key={b.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-50 flex flex-col sm:flex-row"
            >
              {b.image_url ? (
                <img
                  src={b.image_url}
                  alt=""
                  className="h-40 sm:h-auto sm:w-56 object-cover"
                />
              ) : (
                <div className="h-40 sm:h-auto sm:w-56 bg-gray-100 flex items-center justify-center">
                  <Image
                    size={35}
                    className="text-gray-300"
                  />
                </div>
              )}

              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {b.small_text_bn && (
                      <p className="text-xs text-primary font-medium uppercase mb-1">
                        {b.small_text_bn}
                      </p>
                    )}

                    <h3 className="font-display text-lg font-semibold text-ink">
                      {b.title_bn}
                    </h3>

                    {b.description_bn && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {b.description_bn}
                      </p>
                    )}

                    {b.button_text_bn && (
                      <p className="text-xs text-gray-400 mt-2">
                        Button:{' '}
                        {b.button_text_bn}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        toggleActive(b)
                      }
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        b.is_active
                          ? 'bg-primary'
                          : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          b.is_active
                            ? 'translate-x-5'
                            : 'translate-x-0.5'
                        }`}
                      />
                    </button>

                    <button
                      onClick={() =>
                        openEdit(b)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                    >
                      <Edit size={15} />
                    </button>

                    <button
                      onClick={() =>
                        deleteBanner(b.id)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-display text-xl font-bold text-dark">
                {editingBanner
                  ? 'Edit Banner'
                  : 'Add Banner'}
              </h2>

              <button
                onClick={closeForm}
                className="h-9 w-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveBanner}
              className="p-6 overflow-y-auto space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Small Text
                </label>

                <input
                  value={
                    form.small_text_bn
                  }
                  onChange={e =>
                    updateField(
                      'small_text_bn',
                      e.target.value
                    )
                  }
                  placeholder="NEW COLLECTION"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banner Title *
                </label>

                <input
                  value={form.title_bn}
                  onChange={e =>
                    updateField(
                      'title_bn',
                      e.target.value
                    )
                  }
                  placeholder="আপনার সৌন্দর্যের যত্নে"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={
                    form.description_bn
                  }
                  onChange={e =>
                    updateField(
                      'description_bn',
                      e.target.value
                    )
                  }
                  placeholder="Banner description..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Text
                  </label>

                  <input
                    value={
                      form.button_text_bn
                    }
                    onChange={e =>
                      updateField(
                        'button_text_bn',
                        e.target.value
                      )
                    }
                    placeholder="Shop Now"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Link
                  </label>

                  <input
                    value={
                      form.button_link
                    }
                    onChange={e =>
                      updateField(
                        'button_link',
                        e.target.value
                      )
                    }
                    placeholder="/shop"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>

                <input
                  value={form.image_url}
                  onChange={e =>
                    updateField(
                      'image_url',
                      e.target.value
                    )
                  }
                  placeholder="https://..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>

                  <input
                    type="number"
                    value={
                      form.sort_order
                    }
                    onChange={e =>
                      updateField(
                        'sort_order',
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  />
                </div>

                <label className="flex items-center gap-2 border border-gray-200 rounded-xl p-3 mt-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      form.is_active
                    }
                    onChange={e =>
                      updateField(
                        'is_active',
                        e.target.checked
                      )
                    }
                  />

                  <span className="text-sm">
                    Active
                  </span>
                </label>
              </div>

              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="h-40 w-full object-cover rounded-xl border border-gray-200"
                />
              )}

              {error && (
                <div className="bg-red-50 text-red-600 rounded-xl p-3 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary px-6 py-3 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Banner
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Inventory
============================================================ */

function InventoryView() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } =
        await supabase
          .from('products')
          .select(
            '*, category:categories(*)'
          )
          .order('stock', {
            ascending: true,
          });

      if (error) {
        console.error(error);
      }

      setProducts(
        (data || []) as Product[]
      );

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-dark mb-6">
        Inventory
      </h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 font-medium">
                  Product
                </th>

                <th className="px-4 py-3 font-medium">
                  Stock
                </th>

                <th className="px-4 py-3 font-medium">
                  Status
                </th>

                <th className="px-4 py-3 font-medium">
                  Price
                </th>
              </tr>
            </thead>

            <tbody>
              {products.map(p => (
                <tr
                  key={p.id}
                  className="border-b border-gray-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package
                            size={16}
                            className="text-gray-400"
                          />
                        </div>
                      )}

                      <span className="font-medium text-ink line-clamp-1">
                        {p.name_bn}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-semibold text-ink">
                    {p.stock}
                  </td>

                  <td className="px-4 py-3">
                    {p.stock === 0 ? (
                      <span className="inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-500">
                        Out of Stock
                      </span>
                    ) : p.stock < 10 ? (
                      <span className="inline-block rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-600">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                        In Stock
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 font-semibold text-ink">
                    {formatPrice(p.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Reports
============================================================ */

function ReportsView() {
  const [orders, setOrders] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } =
        await supabase
          .from('orders')
          .select('*');

      if (error) {
        console.error(error);
      }

      setOrders(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const totalSales =
    orders.reduce(
      (sum, o) =>
        sum +
        Number(
          o.grand_total ??
            o.total ??
            0
        ),
      0
    );

  const avgOrder =
    orders.length > 0
      ? totalSales / orders.length
      : 0;

  const delivered =
    orders.filter(
      o =>
        o.status ===
        'Delivered'
    ).length;

  const deliveryRate =
    orders.length > 0
      ? (delivered /
          orders.length) *
        100
      : 0;

  const reportCards = [
    {
      label: 'Total Revenue',
      value:
        formatPrice(totalSales),
      color:
        'bg-primary/10 text-primary',
    },

    {
      label:
        'Average Order Value',
      value:
        formatPrice(avgOrder),
      color:
        'bg-accent/10 text-accent',
    },

    {
      label: 'Delivery Rate',
      value: `${deliveryRate.toFixed(
        0
      )}%`,
      color:
        'bg-green-100 text-green-600',
    },

    {
      label: 'Total Orders',
      value:
        orders.length.toString(),
      color:
        'bg-blue-100 text-blue-600',
    },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-dark mb-6">
        Reports
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {reportCards.map(
          (card, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-50"
            >
              <div
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${card.color} mb-3`}
              >
                <BarChart3
                  size={22}
                />
              </div>

              <p className="text-sm text-gray-500">
                {card.label}
              </p>

              <p className="font-display text-2xl font-bold text-ink mt-1">
                {card.value}
              </p>
            </div>
          )
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50">
        <h3 className="font-display text-lg font-semibold text-ink mb-4">
          Orders by Status
        </h3>

        <div className="space-y-3">
          {[
            'Order Placed',
            'Confirmed',
            'Processing',
            'Shipped',
            'Delivered',
            'Cancelled',
          ].map(status => {
            const count =
              orders.filter(
                o =>
                  o.status ===
                  status
              ).length;

            const pct =
              orders.length > 0
                ? (count /
                    orders.length) *
                  100
                : 0;

            return (
              <div key={status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">
                    {status}
                  </span>

                  <span className="font-medium text-ink">
                    {count}
                  </span>
                </div>

                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      status === 'Cancelled'
                        ? 'bg-red-400'
                        : 'bg-primary'
                    }`}
                    style={{
                      width: `${pct}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Placeholder
============================================================ */

function PlaceholderView({
  title,
}: {
  title: string;
}) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-dark mb-6">
        {title}
      </h1>

      <div className="bg-white rounded-2xl p-12 text-center border border-gray-50">
        <Settings
          size={48}
          className="mx-auto text-gray-300 mb-4"
        />

        <p className="text-gray-400">
          এই সেকশন শীঘ্রই আসছে।
        </p>
      </div>
    </div>
  );
}