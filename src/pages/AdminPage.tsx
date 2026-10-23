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
  'Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled',
  'Returned',
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
  return <div className={`bg-gray-50 ${activeTab === 'chat' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}><div className={`${activeTab === 'chat' ? 'h-full' : 'min-h-screen'} flex`}><aside className={`fixed z-50 inset-y-0 left-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ${mobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}><div className="h-full flex flex-col"><div className="h-16 px-5 flex items-center justify-between border-b"><Link to="/" className="font-bold text-lg text-gray-900">Homemade Beauty Care</Link><button onClick={() => setMobileMenu(false)} className="lg:hidden"><X className="w-5 h-5" /></button></div><nav className="p-3 space-y-1 flex-1 overflow-y-auto">{visibleNavItems.map((item) => { const Icon = item.icon; const isSettingsItem = item.id === 'settings'; const active = isSettingsItem ? activeTab === 'settings' || activeTab.startsWith('settings-') : activeTab === item.id; return <div key={item.id}><button onClick={() => { if (isSettingsItem) navigateTab(activeTab.startsWith('settings-') ? 'settings' : 'settings-general'); else navigateTab(item.id); setMobileMenu(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition ${active ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`}><Icon className="w-4 h-4" /><span className="flex-1">{item.label}</span>{isSettingsItem && <ChevronDown className={`w-4 h-4`} />}</button></div>; })}</nav><div className="p-3 border-t"><button onClick={logout} className="w-full rounded-lg border px-3 py-2 text-sm">Logout</button></div></div></aside><main className="flex-1 lg:ml-64 min-w-0"><div className="lg:hidden h-14 bg-white border-b flex items-center px-4"><button onClick={() => setMobileMenu(true)}><Menu className="w-5 h-5" /></button><span className="ml-3 font-semibold">Homemade Beauty Care</span></div><div className="p-4 sm:p-6">{activeTab === 'orders' ? <OrdersView isAdmin={isAdmin} staffAccess={staffAccess} /> : activeTab === 'dashboard' ? <DashboardView /> : activeTab === 'products' ? <ProductsView /> : activeTab === 'categories' ? <CategoriesView /> : activeTab === 'customers' ? <CustomersView /> : activeTab === 'chat' ? <ChatAdminView /> : activeTab === 'quick-responses' ? <QuickResponsesView /> : activeTab === 'reviews' ? <ReviewsView /> : activeTab === 'coupons' ? <CouponsView /> : activeTab === 'banners' ? <BannersView /> : activeTab === 'inventory' ? <InventoryView /> : activeTab === 'reports' ? <ReportsView /> : activeTab === 'settings' ? <AdminSettingsCenter /> : activeTab.startsWith('settings-') ? <SettingsSubPage tab={activeTab} /> : activeTab === 'combo' ? <ComboView /> : activeTab === 'moderators' ? <ModeratorView /> : null}</div></main></div></div>;
}

function OrdersView({ isAdmin, staffAccess }: { isAdmin: boolean; staffAccess: any }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [dateFilter, setDateFilter] = useState('All');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState('Pending');
  const [saving, setSaving] = useState(false);

  const loadOrders = async () => { setLoading(true); const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }); setOrders(data || []); setLoading(false); };
  useEffect(() => { void loadOrders(); }, []);
  const filtered = useMemo(() => orders.filter((order) => { const q = search.trim().toLowerCase(); if (q && ![order.order_number, order.customer_name, order.mobile, order.customer_phone].some((v) => String(v || '').toLowerCase().includes(q))) return false; if (statusFilter !== 'All' && String(order.status || '') !== statusFilter) return false; if (paymentFilter !== 'All' && String(order.payment_status || '') !== paymentFilter) return false; return true; }).sort((a,b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()), [orders, search, statusFilter, paymentFilter, dateFilter, customFrom, customTo]);

  const returnedOrders = filtered.filter((order) => String(order.status || '').toLowerCase() === 'returned');
  const activeOrders = filtered.filter((order) => String(order.status || '').toLowerCase() !== 'returned');

  const saveStatus = async () => { if (!editingOrder) return; setSaving(true); await supabase.from('orders').update({ status: editStatus }).eq('id', editingOrder.id); setSaving(false); setEditingOrder(null); await loadOrders(); };
  const toggleSelect = (id: string) => setSelectedOrderIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll = (list: Order[]) => setSelectedOrderIds((prev) => list.every((o) => prev.includes(o.id)) ? prev.filter((id) => !list.some((o) => o.id === id)) : Array.from(new Set([...prev, ...list.map((o) => o.id)])));

  const renderOrder = (order: Order) => <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><input type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={() => toggleSelect(order.id)} className="mt-1 h-4 w-4" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-gray-900">{displayOrderNumber(order)}</span><span className="text-xs text-gray-500">{dateTime(order.created_at)}</span><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{order.status || 'Pending'}</span></div><div className="mt-1 text-sm text-gray-700">{order.customer_name || '—'} · {order.mobile || order.customer_phone || '—'}</div><div className="mt-1 text-xs text-gray-500">{[order.address, order.area, order.district].filter(Boolean).join(', ')}</div></div><button onClick={() => { setEditingOrder(order); setEditStatus(order.status || 'Pending'); }} className="rounded-lg border px-3 py-1.5 text-xs">Change Status</button></div></div>;

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Orders</h1><p className="text-sm text-gray-500">Manage orders and courier returns.</p></div></div><div className="flex flex-wrap gap-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order / customer / phone" className="input-field max-w-sm" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto"><option>All</option>{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>{returnedOrders.length > 0 && <section className="rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-4"><div className="flex flex-wrap items-center justify-between gap-2 mb-3"><div><h2 className="text-lg font-bold text-blue-900">Courier Returned Parcels</h2><p className="text-xs text-blue-700">Courier থেকে ফেরত আসা parcelগুলো এখানে আলাদা থাকবে।</p></div><span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">{returnedOrders.length} Returned</span></div><div className="space-y-2">{returnedOrders.map(renderOrder)}</div></section>}{activeOrders.length > 0 && <section><div className="flex items-center justify-between mb-3"><h2 className="text-lg font-bold">All Orders</h2><span className="text-xs text-gray-500">Newest first</span></div><div className="space-y-2">{activeOrders.map(renderOrder)}</div></section>}{!returnedOrders.length && !activeOrders.length && <div className="rounded-xl border border-dashed p-10 text-center text-gray-500">No orders found.</div>}{editingOrder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold">Change Order Status</h3><select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="input-field mt-4 w-full">{ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><div className="mt-5 flex justify-end gap-2"><button onClick={() => setEditingOrder(null)} className="btn-secondary">Cancel</button><button disabled={saving} onClick={saveStatus} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button></div></div></div>}</div>;
}
