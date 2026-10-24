import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderTree, ShoppingBag, Users, MessageCircle,
  Star, Tag, ImageIcon, Boxes, BarChart3, Settings, Menu, X, Plus,
  Trash2, Edit, Save, Loader2, Search, Upload, Eye, CheckCircle2,
  XCircle, RefreshCw, AlertCircle, Copy, Bookmark, ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminLogin from './AdminLogin';
import ModeratorView from './ModeratorView';
import { ChatAdminView } from '../components/LiveChat';
import AdminIntegrationCenter from '../components/AdminIntegrationCenter';
import AdminSettingsCenter from '../components/AdminSettingsCenter';
import OrderManagementIntegrationCenter from '../components/OrderManagementIntegrationCenter';
import { formatPrice } from '../lib/format';
import { getSettings, updateSettings, getDeliveryCharge } from '../lib/settings';
import { getDistricts, getThanas, DHAKA_CITY_THANAS } from '../lib/bangladeshLocations';

type Tab = 'dashboard' | 'products' | 'categories' | 'orders' | 'customers' | 'chat' | 'quick-responses' | 'reviews' | 'coupons' | 'banners' | 'inventory' | 'reports' | 'settings' | 'settings-general' | 'settings-store' | 'settings-homepage' | 'settings-products' | 'settings-checkout' | 'settings-shipping' | 'settings-payments' | 'settings-customers' | 'settings-notifications' | 'settings-social' | 'settings-marketing' | 'settings-seo' | 'settings-security' | 'settings-integrations' | 'settings-order-management' | 'combo' | 'moderators';
type Product = any; type Category = any; type Order = any; type OrderItem = any; type Review = any; type Banner = any;

const ORDER_STATUSES = [
  'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned',
];

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'); }
function money(value: any) { return formatPrice(Number(value || 0)); }
function dateTime(value: any) { if (!value) return '-'; return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }); }
function dateOnly(value: any) { if (!value) return '-'; return new Date(value).toLocaleDateString('en-US', { dateStyle: 'medium' }); }
function normalizePhone(value: any) { return String(value || '').replace(/\D/g, '').replace(/^88/, ''); }
function displayOrderNumber(order: Order) { const raw = String(order.order_number || order.id?.slice(0, 8) || ''); return raw.replace(/^HBC/i, 'GRC'); }
function buildOrderCopyText(order: Order, orderItems: OrderItem[]) { const address = [order.district, order.area, order.address].filter(Boolean).join(', '); const itemsText = orderItems.length ? orderItems.map((item) => { const lineTotal = Number(item.price || 0) * Number(item.quantity || 0); return '• ' + (item.product_name || 'Product') + ' — ' + item.quantity + ' × ' + money(item.price) + ' = ' + money(lineTotal); }).join('\n') : '• No items found'; return ['🧾 ORDER DETAILS','━━━━━━━━━━━━━━━━━━━━','Order ID: ' + displayOrderNumber(order),'Date: ' + dateTime(order.created_at),'','👤 CUSTOMER','Name: ' + (order.customer_name || '—'),'Phone: ' + (order.mobile || order.customer_phone || '—'),'','Address: ' + (address || '—'),order.order_note || order.note ? 'Note: ' + (order.order_note || order.note) : '','','🛍️ ITEMS',itemsText,'','💳 PAYMENT','Method: ' + (order.payment_method || 'COD'),'Delivery: ' + (Number(order.delivery_charge || 0) === 0 ? 'FREE' : money(order.delivery_charge)),'Advance Paid: ' + money(order.advance_payment),'Due: ' + money(Math.max(0, Number(order.grand_total ?? order.total ?? 0) - Number(order.advance_payment || 0))),'Total: ' + money(order.grand_total ?? order.total),'━━━━━━━━━━━━━━━━━━━━','Homemade Beauty Care'].filter(Boolean).join('\n'); }
function customerKey(order: Order) { const mobile = normalizePhone(order.mobile || order.customer_phone); if (mobile) return `mobile:${mobile}`; const email = String(order.email || '').trim().toLowerCase(); if (email) return `email:${email}`; return `order:${order.id}`; }
function sanitizeFileName(value: string) { return value.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 60) || 'image'; }
async function uploadImage(file: File, folder: 'products' | 'categories' | 'banners') { if (file.size > 5 * 1024 * 1024) throw new Error('Image size must be 5MB or less.'); const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'; const safeBase = sanitizeFileName(file.name); const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}.${extension}`; const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type }); if (error) throw error; return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl; }

export default function AdminPage() {
  const location = useLocation();
  const [session, setSession] = useState<any>(null); const [staffAccess, setStaffAccess] = useState<any>(null); const [checkingAuth, setCheckingAuth] = useState(true); const [mobileMenu, setMobileMenu] = useState(false);
  const getTabFromPath = (): Tab => { const value = new URLSearchParams(location.search).get('tab') || 'dashboard'; const valid: Tab[] = ['dashboard','products','categories','orders','customers','chat','quick-responses','reviews','coupons','banners','inventory','reports','settings','settings-general','settings-store','settings-homepage','settings-products','settings-checkout','settings-shipping','settings-payments','settings-customers','settings-notifications','settings-social','settings-marketing','settings-seo','settings-security','settings-integrations','settings-order-management','combo','moderators']; return valid.includes(value as Tab) ? value as Tab : 'dashboard'; };
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromPath());
  useEffect(() => { setActiveTab(getTabFromPath()); }, [location.search]);
  useEffect(() => { let mounted = true; supabase.auth.getSession().then(({ data }) => { if (!mounted) return; setSession(data.session); if (data.session) supabase.rpc('get_staff_access').then(({ data: access }) => setStaffAccess(access)); setCheckingAuth(false); }); const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => { if (!mounted) return; setSession(currentSession); if (currentSession) supabase.rpc('get_staff_access').then(({ data: access }) => setStaffAccess(access)); else setStaffAccess(null); setCheckingAuth(false); }); return () => { mounted = false; listener.subscription.unsubscribe(); }; }, []);
  const navigateTab = (tab: Tab) => { setActiveTab(tab); setMobileMenu(false); const params = new URLSearchParams(); params.set('tab', tab); window.history.replaceState({}, '', `${location.pathname}?${params.toString()}`); };
  const logout = async () => { await supabase.auth.signOut(); };
  if (checkingAuth) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  if (!session) return <AdminLogin />;
  const navItems = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard }, { id: 'products' as Tab, label: 'Products', icon: Package }, { id: 'categories' as Tab, label: 'Categories', icon: FolderTree }, { id: 'orders' as Tab, label: 'Orders', icon: ShoppingBag }, { id: 'customers' as Tab, label: 'Customers', icon: Users }, { id: 'chat' as Tab, label: 'Live Chat', icon: MessageCircle }, { id: 'quick-responses' as Tab, label: 'Quick Responses', icon: MessageCircle }, { id: 'reviews' as Tab, label: 'Reviews', icon: Star }, { id: 'coupons' as Tab, label: 'Coupons', icon: Tag }, { id: 'banners' as Tab, label: 'Banners', icon: ImageIcon }, { id: 'inventory' as Tab, label: 'Inventory', icon: Package }, { id: 'reports' as Tab, label: 'Reports', icon: BarChart3 }, { id: 'settings' as Tab, label: 'Settings', icon: Settings }, { id: 'combo' as Tab, label: 'Homepage Combo Offer', icon: Bookmark }, { id: 'moderators' as Tab, label: 'Moderators', icon: Users },
  ];
  const isAdmin = staffAccess?.role === 'admin'; const visibleNavItems = navItems.filter((item) => item.id === 'moderators' ? isAdmin : isAdmin || staffAccess?.permissions?.[item.id] === true);
  return <div className={`bg-gray-50 ${activeTab === 'chat' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}><div className={`${activeTab === 'chat' ? 'h-full' : 'min-h-screen'} flex`}><aside className={`fixed z-50 inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ${mobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}><div className="h-full flex flex-col"><div className="h-16 px-5 flex items-center justify-between border-b"><Link to="/" className="font-bold text-lg text-gray-900">Homemade Beauty Care</Link><button onClick={() => setMobileMenu(false)} className="lg:hidden"><X className="w-5 h-5" /></button></div><nav className="p-3 space-y-1 flex-1 overflow-y-auto">{visibleNavItems.map((item) => { const Icon = item.icon; const isSettingsItem = item.id === 'settings'; const active = isSettingsItem ? activeTab === 'settings' || activeTab.startsWith('settings-') : activeTab === item.id; return <div key={item.id}><button onClick={() => { if (isSettingsItem) navigateTab(activeTab.startsWith('settings-') ? 'settings' : 'settings-general'); else navigateTab(item.id); setMobileMenu(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition ${active ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}><Icon className="w-4 h-4" /><span className="flex-1">{item.label}</span>{isSettingsItem && <ChevronDown className={`w-4 h-4`} />}</button></div>; })}</nav><div className="p-3 border-t"><button onClick={logout} className="w-full rounded-lg border px-3 py-2 text-sm">Logout</button></div></div></aside><main className="flex-1 lg:ml-64 min-w-0"><div className="lg:hidden h-14 bg-white border-b flex items-center px-4"><button onClick={() => setMobileMenu(true)}><Menu className="w-5 h-5" /></button><span className="ml-3 font-semibold">Homemade Beauty Care</span></div><div className="p-4 sm:p-6">{activeTab === 'orders' ? <OrdersView isAdmin={isAdmin} staffAccess={staffAccess} session={session} /> : activeTab === 'dashboard' ? <DashboardView /> : activeTab === 'products' ? <ProductsView /> : activeTab === 'categories' ? <CategoriesView /> : activeTab === 'customers' ? <CustomersView /> : activeTab === 'chat' ? <ChatAdminView /> : activeTab === 'quick-responses' ? <QuickResponsesView /> : activeTab === 'reviews' ? <ReviewsView /> : activeTab === 'coupons' ? <CouponsView /> : activeTab === 'banners' ? <BannersView /> : activeTab === 'inventory' ? <InventoryView /> : activeTab === 'reports' ? <ReportsView /> : activeTab === 'settings' ? <AdminSettingsCenter /> : activeTab.startsWith('settings-') ? <SettingsSubPage tab={activeTab} /> : activeTab === 'combo' ? <ComboView /> : activeTab === 'moderators' ? <ModeratorView /> : null}</div></main></div></div>;
}

function OrdersView({ isAdmin, staffAccess, session }: { isAdmin: boolean; staffAccess: any; session: any }) {
  // Compact order rows + dedicated View modal.
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [districts, setDistricts] = useState<any[]>([]);
  const [thanas, setThanas] = useState<any[]>([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [editDiscount, setEditDiscount] = useState('');
  const [editFreeDelivery, setEditFreeDelivery] = useState(false);
  const [editAdvancePayment, setEditAdvancePayment] = useState('0');
  const [editDeliveryCharge, setEditDeliveryCharge] = useState('0');
  const [editStatus, setEditStatus] = useState('Pending');
  const [editCustomerForm, setEditCustomerForm] = useState<any>({});
  const [internalOrderNotes, setInternalOrderNotes] = useState<any[]>([]);
  const [internalNoteDraft, setInternalNoteDraft] = useState('');
  const [editItemDrafts, setEditItemDrafts] = useState<Record<string, { price: string; quantity: string }>>({});
  const [editAddingProduct, setEditAddingProduct] = useState('');
  const [editAddingQty, setEditAddingQty] = useState('1');
  const [savingOrderEdit, setSavingOrderEdit] = useState(false);
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualForm, setManualForm] = useState({ name:'', phone:'', district:'', area:'', address:'', note:'', discount:'0', freeDelivery:false });
  const [manualItems, setManualItems] = useState<{ productId: string; quantity: string }[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState('Confirmed');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [
        { data: ordersData, error: ordersError },
        { data: itemsData, error: itemsError },
        { data: productsData, error: productsError },
      ] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false }),

        supabase
          .from('order_items')
          .select('*')
          .order('created_at', { ascending: true }),

        supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .order('name_en', { ascending: true }),
      ]);

      if (ordersError) throw ordersError;
      if (itemsError) throw itemsError;
      if (productsError) throw productsError;

      setOrders(ordersData || []);
      setItems(itemsData || []);
      setProducts(productsData || []);
    } catch (err: any) {
      setError(err.message || 'Orders load failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getSettings().then(setSettings).catch((err) => {
      console.error('Settings load failed:', err);
    });
    getDistricts()
      .then((data) => {
        setDistricts(data || []);
      })
      .catch((err) => {
        console.error('District load failed:', err);
      })
      .finally(() => setLocationLoading(false));
  }, []);

  useEffect(() => {
    if (!manualForm.district || districts.length === 0) {
      setThanas([]);
      return;
    }

    const selected = districts.find(
      (item) => item.bn_name === manualForm.district
    );
    if (!selected) return;

    getThanas(selected.id)
      .then((data) => {
        const locationList =
          manualForm.district === 'ঢাকা'
            ? [
                ...DHAKA_CITY_THANAS.map((name: string, index: number) => ({
                  id: `dhaka-city-${index}`,
                  name,
                  bn_name: name,
                })),
                ...(data || []),
              ]
            : (data || []);

        setThanas(locationList);

        if (
          manualForm.area &&
          !locationList.some(
            (item) => item.bn_name === manualForm.area
          )
        ) {
          setManualForm((prev) => ({ ...prev, area: '' }));
        }
      })
      .catch((err) => {
        console.error('Thana load failed:', err);
        setThanas([]);
      });
  }, [manualForm.district, districts]);

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

      // When an admin confirms an order, send it to every enabled
      // order-management connector configured in Admin > Settings.
      if (status === 'Confirmed' && order.status !== 'Confirmed') {
        try {
          const { data: connectors, error: connectorError } =
            await supabase.rpc('get_admin_order_management_integrations');

          if (!connectorError) {
            const enabledIds = (connectors || [])
              .filter((item: any) => item.enabled && item.id)
              .map((item: any) => item.id);

            if (enabledIds.length > 0) {
              const { data: transferResult, error: transferError } =
                await supabase.functions.invoke('order-management', {
                  body: {
                    action: 'create',
                    order_id: order.id,
                    integration_ids: enabledIds,
                  },
                });

              if (transferError) {
                console.error('Order Management integration error:', transferError);
              } else if (transferResult?.results) {
                const failed = transferResult.results.filter((item: any) => item.success === false);
                if (failed.length) {
                  console.error('Order Management transfer failed:', failed);
                }
              }
            }
          } else {
            console.error('Order Management connector load failed:', connectorError);
          }
        } catch (integrationError) {
          console.error('Order Management integration error:', integrationError);
        }
      }

      // When an admin confirms an order, create its Pathao shipment
      // automatically if Pathao is enabled in Admin > Integrations.
      if (status === 'Confirmed' && order.status !== 'Confirmed') {
        const { data: integrationResult, error: integrationError } =
          await supabase.functions.invoke('integrations', {
            body: {
              action: 'create_pathao_order',
              order_id: order.id,
            },
          });

        if (integrationError) {
          console.error('Pathao integration error:', integrationError);
        } else if (integrationResult?.success === false && !integrationResult?.skipped) {
          console.error('Pathao integration error:', integrationResult.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Status update failed.');
    } finally {
      setUpdating(null);
    }
  };


  const openOrderEditor = (order: Order) => {
    setViewOrder(order);
    setEditDiscount(String(Number(order.discount || 0)));
    setEditFreeDelivery(Number(order.delivery_charge || 0) === 0);
    setEditAdvancePayment(String(Number(order.advance_payment || 0)));
    setEditDeliveryCharge(String(Number(order.delivery_charge || 0)));
    setEditStatus(String(order.status || 'Pending') === 'Order Placed' ? 'Pending' : String(order.status || 'Pending'));
    const savedNotes = Array.isArray(order.internal_order_notes) ? order.internal_order_notes : [];
    setInternalOrderNotes(savedNotes.length ? savedNotes : (order.admin_note ? [{ text: String(order.admin_note), created_at: order.updated_at || order.created_at || new Date().toISOString(), legacy: true }] : []));
    setInternalNoteDraft('');
    setEditCustomerForm({ customer_name: order.customer_name || '', mobile: order.mobile || order.customer_phone || '', alt_phone: order.alt_phone || '', email: order.email || order.customer_email || '', district: order.district || '', area: order.area || '', address: order.address || '', order_note: order.order_note || order.note || '', admin_note: order.admin_note || '', payment_method: order.payment_method || 'Cash on Delivery', payment_status: order.payment_status || 'Unpaid' });
    setEditItemDrafts(Object.fromEntries(items.filter((item) => item.order_id === order.id).map((item) => [item.id, { price: String(Number(item.price || 0)), quantity: String(Number(item.quantity || 1)) }])));
  };

  const addInternalOrderNote = async () => {
    const noteText = internalNoteDraft.trim();
    if (!viewOrder || !noteText || savingOrderEdit) return;

    setSavingOrderEdit(true);
    setError('');
    try {
      const { data, error } = await supabase.rpc('add_internal_order_note', {
        p_order_id: viewOrder.id,
        p_text: noteText,
      });
      if (error) throw error;

      const nextNotes = Array.isArray(data) ? data : [...internalOrderNotes, {
        text: noteText,
        created_at: new Date().toISOString(),
        author: staffAccess?.display_name || session?.user?.email || (staffAccess?.role === 'admin' ? 'Admin' : 'Moderator'),
        role: staffAccess?.role === 'admin' ? 'Admin' : 'Moderator',
      }];
      const updated = { ...viewOrder, internal_order_notes: nextNotes };
      setInternalOrderNotes(nextNotes);
      setViewOrder(updated);
      setOrders((prev) => prev.map((order) => order.id === updated.id ? updated : order));
      setInternalNoteDraft('');
    } catch (err: any) {
      setError(err.message || 'Internal note could not be saved.');
    } finally {
      setSavingOrderEdit(false);
    }
  };

  const deleteInternalOrderNote = async (displayIndex: number) => {
    if (!isAdmin || !viewOrder) return;
    const noteIndex = internalOrderNotes.length - 1 - displayIndex;
    if (noteIndex < 0 || noteIndex >= internalOrderNotes.length) return;
    if (!window.confirm('এই internal note-টি মুছে ফেলবেন?')) return;

    setSavingOrderEdit(true);
    setError('');
    try {
      const { data, error } = await supabase.rpc('delete_internal_order_note', {
        p_order_id: viewOrder.id,
        p_note_index: noteIndex,
      });
      if (error) throw error;
      const nextNotes = Array.isArray(data) ? data : internalOrderNotes.filter((_, index) => index !== noteIndex);
      const updated = { ...viewOrder, internal_order_notes: nextNotes };
      setInternalOrderNotes(nextNotes);
      setViewOrder(updated);
      setOrders((prev) => prev.map((order) => order.id === updated.id ? updated : order));
    } catch (err: any) {
      setError(err.message || 'Internal note could not be deleted.');
    } finally {
      setSavingOrderEdit(false);
    }
  };

  const deleteOrder = async (order: Order) => {
    const orderNumber = displayOrderNumber(order);
    if (!window.confirm(`Delete order #${orderNumber} permanently? This cannot be undone.`)) return;
    setUpdating(order.id); setError('');
    try {
      const { error } = await supabase.from('orders').delete().eq('id', order.id);
      if (error) throw error;
      setOrders((prev) => prev.filter((item) => item.id !== order.id));
      setItems((prev) => prev.filter((item) => item.order_id !== order.id));
      if (viewOrder?.id === order.id) setViewOrder(null);
    } catch (err: any) { setError(err.message || 'Order delete failed.'); }
    finally { setUpdating(null); }
  };

  const saveOrderEdits = async () => {
    if (!viewOrder) return;
    setSavingOrderEdit(true); setError('');
    try {
      const orderItems = itemsForOrder(viewOrder.id);
      const subtotal = orderItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
      const discount = Math.min(subtotal, Math.max(0, Number(editDiscount || 0)));
      const delivery = editFreeDelivery ? 0 : Math.max(0, Number(editDeliveryCharge || 0));
      const grandTotal = Math.max(0, subtotal - discount + delivery);
      const advancePayment = Math.min(grandTotal, Math.max(0, Number(editAdvancePayment || 0)));
      const customerName = String(editCustomerForm.customer_name || '').trim();
      const mobile = String(editCustomerForm.mobile || '').trim();
      if (!customerName || !mobile) throw new Error('Customer name and mobile number are required.');
      const customerUpdates = {
        customer_name: customerName, mobile, customer_phone: mobile,
        alt_phone: String(editCustomerForm.alt_phone || '').trim() || null,
        email: String(editCustomerForm.email || '').trim() || null,
        customer_email: String(editCustomerForm.email || '').trim() || null,
        district: String(editCustomerForm.district || '').trim() || null,
        area: String(editCustomerForm.area || '').trim() || null,
        address: String(editCustomerForm.address || '').trim() || null,
        order_note: String(editCustomerForm.order_note || '').trim() || null,
        admin_note: String(editCustomerForm.admin_note || '').trim() || null,
        payment_method: String(editCustomerForm.payment_method || '').trim() || 'Cash on Delivery',
        payment_status: String(editCustomerForm.payment_status || '').trim() || 'Unpaid',
        internal_order_notes: internalOrderNotes,
      };
      const dueAfterAdvance = Math.max(0, grandTotal - advancePayment);
      const { error } = await supabase.from('orders').update({ ...customerUpdates, subtotal, discount, delivery_charge: delivery, grand_total: grandTotal, total: dueAfterAdvance, advance_payment: advancePayment, updated_at: new Date().toISOString() }).eq('id', viewOrder.id);
      if (error) throw error;
      const updated = { ...viewOrder, ...customerUpdates, subtotal, discount, delivery_charge: delivery, grand_total: grandTotal, total: dueAfterAdvance, advance_payment: advancePayment };
      setViewOrder(updated); setOrders((prev) => prev.map((o) => o.id === updated.id ? updated : o));
      setEditDiscount(String(discount)); setEditDeliveryCharge(String(delivery)); setEditAdvancePayment(String(advancePayment));
      if (editStatus !== viewOrder.status) await updateStatus(updated, editStatus);
      setViewOrder(null);
    } catch (err:any) { setError(err.message || 'Order save failed.'); }
    finally { setSavingOrderEdit(false); }
  };

  const addProductToOrder = async () => {
    if (!viewOrder || !editAddingProduct) return;

    const product = products.find((p) => p.id === editAddingProduct);
    const quantity = Math.max(1, Number(editAddingQty || 1));
    if (!product) return;

    setSavingOrderEdit(true);
    setError('');

    try {
      const existing = items.find(
        (i) => i.order_id === viewOrder.id && i.product_id === product.id
      );

      if (existing) {
        const newQty = Number(existing.quantity || 0) + quantity;
        const { error } = await supabase
          .from('order_items')
          .update({ quantity: newQty })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('order_items')
          .insert({
            order_id: viewOrder.id,
            product_id: product.id,
            product_name: product.name_en || product.name_bn || product.name || 'Product',
            price: Number(product.sale_price ?? product.price ?? 0),
            quantity,
            image_url: product.image_url || null,
          });
        if (error) throw error;
      }

      const { data: refreshedItems, error: refreshError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', viewOrder.id)
        .order('created_at', { ascending: true });
      if (refreshError) throw refreshError;

      setItems((prev) => [
        ...prev.filter((i) => i.order_id !== viewOrder.id),
        ...(refreshedItems || []),
      ]);

      const subtotal = (refreshedItems || []).reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
      );
      const discount = Math.min(subtotal, Math.max(0, Number(editDiscount || 0)));
      const delivery = editFreeDelivery ? 0 : Math.max(0, Number(editDeliveryCharge || 0));
      const grandTotal = Math.max(0, subtotal - discount + delivery);
      const advancePayment = Math.min(grandTotal, Math.max(0, Number(editAdvancePayment || 0)));
      const dueAfterAdvance = Math.max(0, grandTotal - advancePayment);

      const { error: totalError } = await supabase
        .from('orders')
        .update({
          subtotal,
          discount,
          delivery_charge: delivery,
          grand_total: grandTotal,
          total: dueAfterAdvance,
          advance_payment: advancePayment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', viewOrder.id);
      if (totalError) throw totalError;

      const updatedView = {
        ...viewOrder,
        subtotal,
        discount,
        delivery_charge: delivery,
        grand_total: grandTotal,
        total: dueAfterAdvance,
        advance_payment: advancePayment,
      };
      setViewOrder(updatedView);
      setOrders((prev) => prev.map((o) => o.id === updatedView.id ? updatedView : o));

      setEditAddingProduct('');
      setEditAddingQty('1');
      setEditDeliveryCharge(String(delivery));
      setEditAdvancePayment(String(advancePayment));
      setEditItemDrafts(Object.fromEntries((refreshedItems || []).map((item: OrderItem) => [item.id, { price: String(Number(item.price || 0)), quantity: String(Number(item.quantity || 1)) }])));
    } catch (err:any) {
      setError(err.message || 'Product add failed.');
    } finally {
      setSavingOrderEdit(false);
    }
  };

  const saveOrderItemDraft = async (item: OrderItem) => {
    if (!viewOrder) return;
    const draft = editItemDrafts[item.id];
    const quantity = Math.floor(Number(draft?.quantity || 0));
    const price = Number(draft?.price || 0);
    if (!Number.isFinite(quantity) || quantity < 1 || !Number.isFinite(price) || price < 0) { setError('Quantity must be at least 1 and price cannot be negative.'); return; }
    setSavingOrderEdit(true); setError('');
    try {
      const { error } = await supabase.from('order_items').update({ quantity, price }).eq('id', item.id).eq('order_id', viewOrder.id);
      if (error) throw error;
      const updatedItems = items.map((current) => current.id === item.id ? { ...current, quantity, price } : current);
      setItems(updatedItems);
      const subtotal = updatedItems.filter((current) => current.order_id === viewOrder.id).reduce((sum, current) => sum + Number(current.price || 0) * Number(current.quantity || 0), 0);
      const discount = Math.min(subtotal, Math.max(0, Number(editDiscount || 0)));
      const delivery = editFreeDelivery ? 0 : Math.max(0, Number(editDeliveryCharge || 0));
      const grandTotal = Math.max(0, subtotal - discount + delivery);
      const advancePayment = Math.min(grandTotal, Math.max(0, Number(editAdvancePayment || 0)));
       const dueAfterAdvance = Math.max(0, grandTotal - advancePayment);
      const { error: totalError } = await supabase.from('orders').update({ subtotal, discount, delivery_charge: delivery, grand_total: grandTotal, total: dueAfterAdvance, advance_payment: advancePayment, updated_at: new Date().toISOString() }).eq('id', viewOrder.id);
      if (totalError) throw totalError;
      const updatedOrder = { ...viewOrder, subtotal, discount, delivery_charge: delivery, grand_total: grandTotal, total: dueAfterAdvance, advance_payment: advancePayment };
      setViewOrder(updatedOrder); setOrders((prev) => prev.map((order) => order.id === updatedOrder.id ? updatedOrder : order));
      setEditDiscount(String(discount)); setEditDeliveryCharge(String(delivery)); setEditAdvancePayment(String(advancePayment));
    } catch (err: any) { setError(err.message || 'Product update failed.'); }
    finally { setSavingOrderEdit(false); }
  };

  const removeProductFromOrder = async (item: OrderItem) => {
    if (!viewOrder) return;
    if (!window.confirm(`Remove "${item.product_name || 'this product'}" from order #${displayOrderNumber(viewOrder)}?`)) return;
    setSavingOrderEdit(true); setError('');
    try {
      const { error } = await supabase.from('order_items').delete().eq('id', item.id).eq('order_id', viewOrder.id);
      if (error) throw error;

      // Re-read the remaining items from the database so the totals never rely on stale React state.
      const { data: remaining, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', viewOrder.id)
        .order('created_at', { ascending: true });
      if (itemsError) throw itemsError;

      const updatedItems = [
        ...items.filter((current) => current.order_id !== viewOrder.id),
        ...(remaining || []),
      ];
      setItems(updatedItems);
      const subtotal = (remaining || []).reduce((sum, current) => sum + Number(current.price || 0) * Number(current.quantity || 0), 0);
      const discount = Math.min(subtotal, Math.max(0, Number(editDiscount || 0)));
      const delivery = editFreeDelivery ? 0 : Math.max(0, Number(editDeliveryCharge || 0));
      const grandTotal = Math.max(0, subtotal - discount + delivery);
      const advancePayment = Math.min(grandTotal, Math.max(0, Number(editAdvancePayment || 0)));
      const dueAfterAdvance = Math.max(0, grandTotal - advancePayment);
      const { data: savedOrder, error: totalError } = await supabase
        .from('orders')
        .update({ subtotal, discount, delivery_charge: delivery, grand_total: grandTotal, total: dueAfterAdvance, advance_payment: advancePayment, updated_at: new Date().toISOString() })
        .eq('id', viewOrder.id)
        .select('*')
        .single();
      if (totalError) throw totalError;

      const updatedOrder = { ...viewOrder, ...savedOrder, subtotal, discount, delivery_charge: delivery, grand_total: grandTotal, total: dueAfterAdvance, advance_payment: advancePayment };
      setViewOrder(updatedOrder);
      setOrders((prev) => prev.map((order) => order.id === updatedOrder.id ? updatedOrder : order));
      setEditItemDrafts(Object.fromEntries((remaining || []).map((current: OrderItem) => [current.id, { price: String(Number(current.price || 0)), quantity: String(Number(current.quantity || 1)) }])));
      setEditDiscount(String(discount));
      setEditDeliveryCharge(String(delivery));
      setEditAdvancePayment(String(advancePayment));
    } catch (err: any) { setError(err.message || 'Product removal failed.'); }
    finally { setSavingOrderEdit(false); }
  };

  const createManualOrder = async () => {
    const validItems = manualItems.map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Number(item.quantity || 1)),
    })).filter((item) => item.productId);

    if (!manualForm.name.trim() || !manualForm.phone.trim() || validItems.length === 0) {
      setError('Customer name, phone and at least one product are required.');
      return;
    }

    setManualSaving(true);
    setError('');

    try {
      const orderLines = validItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) throw new Error('One of the selected products could not be found.');
        const price = Number(product.sale_price ?? product.price ?? 0);
        return { product, productId: item.productId, quantity: item.quantity, price, lineTotal: price * item.quantity };
      });

      const subtotal = orderLines.reduce((sum, item) => sum + item.lineTotal, 0);
      const discount = Math.max(0, Number(manualForm.discount || 0));
      const delivery = manualForm.freeDelivery || !settings ? 0 : getDeliveryCharge(settings, manualForm.district, subtotal, manualForm.area);
      const grandTotal = Math.max(0, subtotal - discount + delivery);

      const { data: order, error: orderError } = await supabase.from('orders').insert({
        customer_name: manualForm.name.trim(),
        customer_phone: manualForm.phone.trim(),
        mobile: manualForm.phone.trim(),
        district: manualForm.district.trim() || null,
        area: manualForm.area.trim() || null,
        address: manualForm.address.trim() || null,
        order_note: manualForm.note.trim() || null,
        payment_method: 'COD',
        payment_status: 'Unpaid',
        status: 'Pending',
        subtotal,
        discount,
        delivery_charge: delivery,
        grand_total: grandTotal,
        total: grandTotal,
      }).select().single();

      if (orderError) throw orderError;

      const { data: insertedItems, error: itemError } = await supabase.from('order_items').insert(
        orderLines.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          product_name: item.product.name_en || item.product.name_bn || item.product.name || 'Product',
          price: item.price,
          quantity: item.quantity,
          image_url: item.product.image_url || null,
        }))
      ).select();

      if (itemError) throw itemError;

      setOrders((prev) => [order, ...prev]);
      setItems((prev) => [...(insertedItems || []), ...prev]);
      setShowManualOrder(false);
      setManualForm({ name:'', phone:'', district:'', area:'', address:'', note:'', discount:'0', freeDelivery:false });
      setManualItems([]);
    } catch (err:any) {
      setError(err.message || 'Manual order create failed.');
    } finally {
      setManualSaving(false);
    }
  };

  const addManualProduct = () => {
    setManualItems((current) => [...current, { productId: '', quantity: '1' }]);
  };

  const removeManualProduct = (index: number) => {
    setManualItems((current) => current.filter((_, i) => i !== index));
  };

  const updateManualProduct = (index: number, field: 'productId' | 'quantity', value: string) => {
    setManualItems((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
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
    }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
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

  // Map legacy records to Pending; "Order Placed" is no longer a valid status.
  const normalizeOrderStatus = (status: unknown) =>
    String(status || 'Pending') === 'Order Placed' ? 'Pending' : String(status || 'Pending');

  const selectedOrders = orders.filter((order) => selectedOrderIds.includes(order.id));

  const handleBulkStatusChange = async () => {
    if (!selectedOrders.length || bulkBusy) return;
    setBulkBusy(true);
    setBulkMessage('');
    try {
      for (const order of selectedOrders) await updateStatus(order, bulkStatus);
      setSelectedOrderIds([]);
      setBulkMessage(`Status update completed for ${selectedOrders.length} order(s).`);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkCourierSubmit = async () => {
    if (!selectedOrders.length || bulkBusy) return;
    setBulkBusy(true);
    setBulkMessage('');
    let succeeded = 0;
    const failed: string[] = [];
    try {
      for (const order of selectedOrders) {
        try {
          const { data, error } = await supabase.functions.invoke('integrations', {
            body: { action: 'create_pathao_order', order_id: order.id },
          });
          if (error) throw error;
          if (data?.success === false && !data?.skipped) throw new Error(data.message || 'Courier submission failed');
          if (data?.skipped) failed.push(`#${displayOrderNumber(order)}: Pathao is not enabled`);
          else succeeded += 1;
        } catch (err: any) {
          failed.push(`#${displayOrderNumber(order)}: ${err?.message || 'Failed'}`);
        }
      }
      setBulkMessage(`Pathao submitted: ${succeeded}; failed/skipped: ${failed.length}.${failed.length ? ' ' + failed.slice(0, 3).join('; ') : ''}`);
      if (!failed.length) setSelectedOrderIds([]);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkInvoicePrint = () => {
    if (!selectedOrders.length) return;
    // Open one tab synchronously from the click to avoid popup blockers,
    // then render all selected invoices in one print-ready document.
    const invoiceUrl = `/invoice?order_ids=${selectedOrders.map((order) => encodeURIComponent(order.id)).join(',')}`;
    const invoiceWindow = window.open(invoiceUrl, '_blank');
    if (!invoiceWindow) {
      setBulkMessage('Browser popup blocked the invoice page. Please allow pop-ups for this website and try again.');
      return;
    }
    setBulkMessage(`Opened one print-ready page with ${selectedOrders.length} invoices. Click “সব Invoice একসাথে Print” to print them together.`);
  };

  // Only the newer order is marked as duplicate when an older order
  // with the same mobile number is still active (not Delivered/Cancelled).
  const duplicateOrderIds = useMemo(() => {
    const ids = new Set<string>();

    orders.forEach((order) => {
      const mobile = String(order.mobile || order.customer_phone || '')
        .replace(/\s/g, '')
        .trim();

      if (!mobile || order.status === 'Delivered' || order.status === 'Cancelled') return;

      const hasOlderActiveOrder = orders.some((older) => {
        const olderMobile = String(older.mobile || older.customer_phone || '')
          .replace(/\s/g, '')
          .trim();

        return (
          older.id !== order.id &&
          olderMobile === mobile &&
          older.status !== 'Delivered' &&
          older.status !== 'Cancelled' &&
          new Date(older.created_at).getTime() < new Date(order.created_at).getTime()
        );
      });

      if (hasOlderActiveOrder) ids.add(order.id);
    });

    return ids;
  }, [orders]);

  if (loading) {
    return <LoadingBox />;
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`${orders.length} total orders`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowManualOrder(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4" />
              Manual Order
            </button>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        }
      />

      <ErrorBox error={error} retry={load} />

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID, customer, phone, email..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          >
            <option value="">All Status</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          >
            <option value="">All Payment</option>
            {paymentStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

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

        {dateFilter === 'custom' && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">From Date</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">To Date</label>
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

        <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filtered.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{orders.length}</span> orders
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

      {selectedOrderIds.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/20 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-900">{selectedOrderIds.length} order(s) selected</p>
            <button onClick={() => setSelectedOrderIds([])} className="text-xs font-medium text-gray-600 underline">Clear selection</button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
              {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button onClick={handleBulkStatusChange} disabled={bulkBusy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{bulkBusy ? 'Working...' : 'Change Status'}</button>
            <button onClick={handleBulkCourierSubmit} disabled={bulkBusy} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">{bulkBusy ? 'Working...' : 'Submit to Pathao'}</button>
            <button onClick={handleBulkInvoicePrint} disabled={bulkBusy} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50">Open / Print Invoices</button>
          </div>
          {bulkMessage && <p className="text-xs text-gray-600">{bulkMessage}</p>}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-[#f7f5ed] px-3 py-2.5">
          <input
            type="checkbox"
            aria-label="Select all visible orders"
            checked={filtered.length > 0 && filtered.every((order) => selectedOrderIds.includes(order.id))}
            onChange={(e) => setSelectedOrderIds((prev) => e.target.checked
              ? Array.from(new Set([...prev, ...filtered.map((order) => order.id)]))
              : prev.filter((id) => !filtered.some((order) => order.id === id)))}
            className="h-4 w-4 rounded border-gray-300"
          />
          <h3 className="text-sm font-bold text-gray-800">All Orders · Sorted by creation time (newest first)</h3>
          <span className="ml-auto rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-700">{filtered.length} orders</span>
        </div>
        {filtered.map((order) => {
          const orderItems = itemsForOrder(order.id);
          const normalizedStatus = normalizeOrderStatus(order.status);
          const knownStatuses = ORDER_STATUSES;

          return (
            <div
              key={order.id}
              className={`overflow-hidden rounded-lg border shadow-sm ${duplicateOrderIds.has(order.id) ? 'border-red-300 bg-red-50/40' : 'border-gray-200 bg-white'}`}
            >
              <div className="px-3 py-2.5">
                <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
                  <div className="flex items-center gap-2 xl:pr-1">
                    <input
                      type="checkbox"
                      aria-label={`Select order #${displayOrderNumber(order)}`}
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={(e) => setSelectedOrderIds((prev) => e.target.checked ? [...prev, order.id] : prev.filter((id) => id !== order.id))}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </div>
                  <div className="min-w-0 xl:w-[20%]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className={`text-sm font-semibold ${duplicateOrderIds.has(order.id) ? 'text-red-700' : 'text-gray-900'}`}>
                          #{displayOrderNumber(order)}
                        </h3>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(buildOrderCopyText(order, orderItems));
                            } catch {
                              setError('Order info copy করা যায়নি।');
                            }
                          }}
                          title="Copy order info"
                          aria-label="Copy order info"
                          className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <StatusBadge status={normalizedStatus} />
                      {duplicateOrderIds.has(order.id) && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          DUPLICATE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">{dateTime(order.created_at)}</p>
                  </div>

                  <div className="min-w-0 xl:w-[22%]">
                    <p className="truncate text-sm font-medium text-gray-900">{order.customer_name || '—'}</p>
                    <p className="text-xs text-gray-600">{order.mobile || order.customer_phone || '—'}</p>
                    {(() => { const notes = Array.isArray(order.internal_order_notes) ? order.internal_order_notes : []; const latest = notes.length ? notes[notes.length - 1] : (order.admin_note ? { text: order.admin_note } : null); return latest?.text ? <div className="mt-1 rounded-md bg-amber-50 px-2 py-1.5" title={latest.text}><p className="line-clamp-2 text-[11px] text-amber-900">Internal note: {latest.text}</p><p className="mt-0.5 text-[10px] text-amber-700">{latest.author || ''}{latest.role ? ' · ' + latest.role : ''}{latest.created_at ? ' · ' + dateTime(latest.created_at) : ''}</p></div> : null; })()}
                  </div>

                  <div className="xl:w-[13%]">
                    <p className="text-sm font-bold text-gray-900">Due: {formatPrice(Math.max(0, Number(order.grand_total ?? order.total ?? 0) - Number(order.advance_payment || 0)))}</p>
                    <p className="text-[11px] font-medium text-emerald-700">Paid: {formatPrice(Number(order.advance_payment || 0))}</p>
                    <p className="text-[11px] text-gray-500">{order.payment_method || 'COD'}</p>
                  </div>

                  <div className="xl:w-[17%]">
                    <select
                      value={normalizedStatus}
                      disabled={updating === order.id}
                      onChange={(e) => updateStatus(order, e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-gray-500 disabled:bg-gray-100"
                    >
                      {knownStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-1.5 xl:ml-auto xl:w-auto">
                    <button
                      onClick={() => openOrderEditor(order)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>

                    <Link
                      to={`/invoice?order_id=${encodeURIComponent(order.id)}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                    >
                      Invoice
                    </Link>

                    {order.status !== 'Cancelled' && order.status !== 'Delivered' && (
                      <button
                        onClick={() => cancelOrder(order)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    )}
                    <button onClick={() => deleteOrder(order)} disabled={updating === order.id} className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                  </div>
                </div>
              </div>
            </div>
          );

        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState text="No orders found. Try changing your search or filters." />
      )}

      {showManualOrder && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowManualOrder(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between"><h3 className="text-lg font-bold">Create Manual Order</h3><button onClick={() => setShowManualOrder(false)}><X className="h-5 w-5" /></button></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Customer Name" value={manualForm.name} onChange={(v) => setManualForm((f) => ({...f,name:v}))} required />
              <Input label="Phone" value={manualForm.phone} onChange={(v) => setManualForm((f) => ({...f,phone:v}))} required />
              <div>
                <label className="block text-sm font-medium mb-1.5">District</label>
                <select
                  required
                  value={manualForm.district}
                  disabled={locationLoading}
                  onChange={(e) => setManualForm((f) => ({...f, district:e.target.value, area:''}))}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                >
                  <option value="">Select District</option>
                  {districts.map((d) => <option key={d.id} value={d.bn_name}>{d.bn_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Thana / Upazila</label>
                <select
                  required
                  value={manualForm.area}
                  disabled={locationLoading || !manualForm.district || thanas.length === 0}
                  onChange={(e) => setManualForm((f) => ({...f, area:e.target.value}))}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm"
                >
                  <option value="">{locationLoading ? 'Loading locations...' : 'Select Thana / Upazila'}</option>
                  {thanas.map((t) => <option key={t.id} value={t.bn_name}>{t.bn_name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><Input label="Address" value={manualForm.address} onChange={(v) => setManualForm((f) => ({...f,address:v}))} /></div>
              <div className="sm:col-span-2"><Input label="Order Note" value={manualForm.note} onChange={(v) => setManualForm((f) => ({...f,note:v}))} /></div>
              <div className="sm:col-span-2 rounded-xl border bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div><h4 className="font-semibold text-gray-900">Products</h4><p className="text-xs text-gray-500">একাধিক product একসাথে যোগ করতে পারবে।</p></div>
                  <button type="button" onClick={addManualProduct} disabled={products.length === 0} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-50"><Plus className="h-3.5 w-3.5" />Add Product</button>
                </div>
                {manualItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed bg-white px-4 py-6 text-center text-sm text-gray-500">No product added yet. Click “Add Product”.</div>
                ) : (
                  <div className="space-y-2">
                    {manualItems.map((item,index) => {
                      const product=products.find((p)=>p.id===item.productId);
                      const lineTotal=Number(product?.sale_price ?? product?.price ?? 0)*Math.max(1,Number(item.quantity||1));
                      return <div key={index} className="grid gap-2 rounded-lg border bg-white p-2 sm:grid-cols-[1fr_90px_auto] sm:items-center">
                        <select value={item.productId} onChange={(e)=>updateManualProduct(index,'productId',e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
                          <option value="">Select Product</option>
                          {products.map((p)=><option key={p.id} value={p.id}>{p.name_en||p.name_bn||p.name}</option>)}
                        </select>
                        <input type="number" min="1" value={item.quantity} onChange={(e)=>updateManualProduct(index,'quantity',e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" aria-label="Quantity" />
                        <div className="flex items-center justify-between gap-2 sm:justify-end"><span className="text-sm font-semibold">{money(lineTotal)}</span><button type="button" onClick={()=>removeManualProduct(index)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" title="Remove product" aria-label="Remove product"><Trash2 className="h-4 w-4" /></button></div>
                      </div>;
                    })}
                  </div>
                )}
              </div>
              <Input label="Discount" type="number" value={manualForm.discount} onChange={(v) => setManualForm((f) => ({...f,discount:v}))} />
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm pb-2">
                  <input type="checkbox" checked={manualForm.freeDelivery} onChange={(e) => setManualForm((f) => ({...f,freeDelivery:e.target.checked}))} />
                  Free delivery
                </label>
              </div>
              <div className="sm:col-span-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2 text-sm">
                Delivery Charge: <strong>{money(
  manualForm.freeDelivery || !settings
    ? 0
    : getDeliveryCharge(
        settings,
        manualForm.district,
        manualItems.reduce((sum, item) => {
          const product = products.find((p: any) => p.id === item.productId);
          const price = Number(product?.sale_price ?? product?.price ?? 0);
          const quantity = Math.max(1, Number(item.quantity || 1));
          return sum + price * quantity;
        }, 0),
        manualForm.area
      )
)}</strong>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowManualOrder(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button onClick={createManualOrder} disabled={manualSaving} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{manualSaving ? 'Creating...' : 'Create Order'}</button></div>
          </div>
        </div>
      )}

      {viewOrder && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setViewOrder(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <h3 className="text-lg font-bold">
                  Order #{displayOrderNumber(viewOrder)}
                </h3>
                <p className="text-xs text-gray-500">{dateTime(viewOrder.created_at)}</p>
              </div>
              <button
                onClick={() => setViewOrder(null)}
                className="rounded-lg p-2 hover:bg-gray-100"
                aria-label="Close order view"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2 rounded-xl border bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3"><h4 className="font-semibold">Customer & Delivery Details</h4><span className="text-xs text-gray-500">Editable by admin</span></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-gray-600">Customer Name *<input value={editCustomerForm.customer_name || ''} onChange={(e) => setEditCustomerForm((v: any) => ({ ...v, customer_name: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" required /></label>
                  <label className="text-xs font-medium text-gray-600">Mobile Number *<input value={editCustomerForm.mobile || ''} onChange={(e) => setEditCustomerForm((v: any) => ({ ...v, mobile: e.target.value.replace(/[^0-9+]/g, '').slice(0, 16) }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" required /></label>
                  <label className="text-xs font-medium text-gray-600">Alternative Mobile<input value={editCustomerForm.alt_phone || ''} onChange={(e) => setEditCustomerForm((v: any) => ({ ...v, alt_phone: e.target.value.replace(/[^0-9+]/g, '').slice(0, 16) }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>
                  <label className="text-xs font-medium text-gray-600">Email<input type="email" value={editCustomerForm.email || ''} onChange={(e) => setEditCustomerForm((v: any) => ({ ...v, email: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>
                  <label className="text-xs font-medium text-gray-600">District<input value={editCustomerForm.district || ''} onChange={(e) => setEditCustomerForm((v: any) => ({ ...v, district: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>
                  <label className="text-xs font-medium text-gray-600">Thana / Upazila<input value={editCustomerForm.area || ''} onChange={(e) => setEditCustomerForm((v: any) => ({ ...v, area: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>
                  <label className="text-xs font-medium text-gray-600 sm:col-span-2">Full Delivery Address<textarea rows={2} value={editCustomerForm.address || ''} onChange={(e) => setEditCustomerForm((v: any) => ({ ...v, address: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>
                  <label className="text-xs font-medium text-gray-600 sm:col-span-2">Customer Order Note<textarea rows={2} value={editCustomerForm.order_note || ''} onChange={(e) => setEditCustomerForm((v: any) => ({ ...v, order_note: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>
                  <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2"><label className="text-xs font-semibold text-amber-900">Internal Order Notes (Admin only)</label><span className="text-[11px] text-amber-800">{internalOrderNotes.length} note(s)</span></div>
                    {internalOrderNotes.length > 0 && <div className="mb-3 max-h-44 space-y-2 overflow-y-auto">{[...internalOrderNotes].reverse().map((note: any, index: number) => <div key={`${note.created_at || 'note'}-${index}`} className="rounded-md border border-amber-100 bg-white p-2.5"><div className="mb-1 flex flex-wrap items-center justify-between gap-1"><span className="text-[11px] font-semibold text-amber-900">{note.role || 'Staff'} · {note.author || 'Previous staff'}</span><div className="flex items-center gap-2"><span className="text-[10px] text-gray-500">{note.created_at ? dateTime(note.created_at) : 'Time unavailable'}</span>{isAdmin && <button type="button" onClick={() => deleteInternalOrderNote(index)} disabled={savingOrderEdit} className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50" title="Delete note"><Trash2 className="h-3 w-3" /> Delete</button>}</div></div><p className="whitespace-pre-wrap text-sm text-gray-800">{note.text}</p></div>)}</div>}
                    <textarea rows={2} value={internalNoteDraft} onChange={(e) => setInternalNoteDraft(e.target.value)} placeholder="Write a new internal note..." className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm" />
                    <div className="mt-2 flex justify-end"><button type="button" onClick={addInternalOrderNote} disabled={savingOrderEdit || !internalNoteDraft.trim()} className="rounded-lg bg-amber-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingOrderEdit ? 'Saving...' : 'Add Note'}</button></div>
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2 rounded-xl border bg-white p-4">
                <h4 className="mb-3 font-semibold">Order Status & Payment</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-medium text-gray-600">Order Status<select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm">{ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                  <label className="text-xs font-medium text-gray-600">Payment Method<input value={editCustomerForm.payment_method || ''} onChange={(e) => setEditCustomerForm((v: any) => ({ ...v, payment_method: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" /></label>
                  <label className="text-xs font-medium text-gray-600">Payment Status<select value={editCustomerForm.payment_status || 'Unpaid'} onChange={(e) => setEditCustomerForm((v: any) => ({ ...v, payment_status: e.target.value }))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm">{[...new Set(['Unpaid', 'Partial', 'Paid', String(editCustomerForm.payment_status || '')].filter(Boolean))].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                </div>
              </div>
              <div className="sm:col-span-2 rounded-xl border bg-gray-50 p-4">
                <h4 className="mb-3 font-semibold">Price, Delivery & Advance</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-xs text-gray-600">Discount (৳)<input type="number" min="0" value={editDiscount} onChange={(e) => setEditDiscount(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
                  <label className="text-xs text-gray-600">Delivery Charge (৳)<input type="number" min="0" value={editDeliveryCharge} disabled={editFreeDelivery} onChange={(e) => setEditDeliveryCharge(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-100" /></label>
                  <label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" checked={editFreeDelivery} onChange={(e) => { setEditFreeDelivery(e.target.checked); if (e.target.checked) setEditDeliveryCharge('0'); }} /> Free delivery</label>
                  <label className="text-xs text-gray-600">Advance Payment (৳)<input type="number" min="0" value={editAdvancePayment} onChange={(e) => setEditAdvancePayment(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></label>
                  <div><p className="text-xs text-gray-500">Due After Advance</p><p className="mt-1 text-lg font-bold">{money(Math.max(0, itemsForOrder(viewOrder.id).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0) - Math.max(0, Number(editDiscount || 0)) + (editFreeDelivery ? 0 : Math.max(0, Number(editDeliveryCharge || 0))) - Number(editAdvancePayment || 0)))}</p></div>
                  <div><p className="text-xs text-gray-500">Estimated Total</p><p className="mt-1 text-lg font-bold">{money(Math.max(0, itemsForOrder(viewOrder.id).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0) - Math.max(0, Number(editDiscount || 0)) + (editFreeDelivery ? 0 : Math.max(0, Number(editDeliveryCharge || 0)))))}</p></div>
                </div>
                <div className="mt-4 flex justify-end"><button onClick={saveOrderEdits} disabled={savingOrderEdit} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Save className="h-4 w-4" />{savingOrderEdit ? 'Saving...' : 'Save All Order Changes'}</button></div>
              </div>
              <div className="sm:col-span-2">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="font-semibold">Order Items ({itemsForOrder(viewOrder.id).length})</h4>
                  {true && (
                    <div className="flex gap-2">
                      <select value={editAddingProduct} onChange={(e) => setEditAddingProduct(e.target.value)} className="rounded-lg border px-2 py-1.5 text-xs">
                        <option value="">Add product...</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name_en || p.name_bn || p.name}</option>)}
                      </select>
                      <input value={editAddingQty} onChange={(e) => setEditAddingQty(e.target.value)} type="number" min="1" className="w-16 rounded-lg border px-2 py-1.5 text-xs" />
                      <button onClick={addProductToOrder} disabled={!editAddingProduct || savingOrderEdit} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Add</button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {itemsForOrder(viewOrder.id).length === 0 ? (
                    <p className="text-sm text-gray-500">No items found for this order.</p>
                  ) : (
                    itemsForOrder(viewOrder.id).map((item) => {
                      const draft = editItemDrafts[item.id] || { price: String(Number(item.price || 0)), quantity: String(Number(item.quantity || 1)) };
                      return (
                        <div key={item.id} className="flex flex-col gap-3 rounded-lg border bg-gray-50 p-3 sm:flex-row sm:items-center">
                          {item.image_url ? <img src={item.image_url} alt={item.product_name || 'Product'} className="h-12 w-12 rounded-lg object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-200 text-[10px] text-gray-500">No Image</div>}
                          <div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.product_name}</p><p className="text-xs text-gray-500">Line total: {money(Number(draft.price || 0) * Number(draft.quantity || 0))}</p></div>
                          <label className="text-xs text-gray-600">Unit Price<input type="number" min="0" value={draft.price} onChange={(e) => setEditItemDrafts((prev) => ({ ...prev, [item.id]: { ...draft, price: e.target.value } }))} className="mt-1 w-24 rounded-lg border px-2 py-1.5 text-sm" /></label>
                          <label className="text-xs text-gray-600">Qty<input type="number" min="1" step="1" value={draft.quantity} onChange={(e) => setEditItemDrafts((prev) => ({ ...prev, [item.id]: { ...draft, quantity: e.target.value } }))} className="mt-1 w-20 rounded-lg border px-2 py-1.5 text-sm" /></label>
                          <div className="flex gap-2"><button onClick={() => saveOrderItemDraft(item)} disabled={savingOrderEdit} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" />Save</button><button onClick={() => removeProductFromOrder(item)} disabled={savingOrderEdit} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete</button></div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   CUSTOMERS
========================================================= */
