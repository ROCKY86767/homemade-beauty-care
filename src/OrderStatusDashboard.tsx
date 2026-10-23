import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, Filter, RefreshCw } from 'lucide-react';
import { supabase } from './lib/supabase';

type Order = any;

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  Confirmed: '#6366f1',
  Processing: '#8b5cf6',
  Shipped: '#06b6d4',
  'In Courier': '#0891b2',
  Delivered: '#059669',
  Completed: '#047857',
  Cancelled: '#ef4444',
  Returned: '#2563eb',
  Hold: '#84cc16',
  'Pending Return': '#ec4899',
};

const FALLBACK_COLORS = ['#7c3aed', '#0f766e', '#ca8a04', '#be123c', '#64748b', '#db2777'];

function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function dateLabel(value: Date) {
  return value.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function OrderStatusDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [range, setRange] = useState<'this-month' | 'last-month' | '7-days' | '30-days' | 'all'>('this-month');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('orders').select('id,status,created_at').order('created_at', { ascending: false });
      if (!error) setOrders(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrders(); }, []);

  const visibleOrders = useMemo(() => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    if (range === 'this-month') ({ start, end } = monthRange(0));
    if (range === 'last-month') ({ start, end } = monthRange(-1));
    if (range === '7-days') {
      end = now;
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }
    if (range === '30-days') {
      end = now;
      start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    }
    return orders.filter((order) => {
      const created = new Date(order.created_at);
      if (Number.isNaN(created.getTime())) return false;
      return (!start || created >= start) && (!end || created <= end);
    });
  }, [orders, range]);

  const statuses = useMemo(() => {
    const counts = new Map<string, number>();
    visibleOrders.forEach((order) => {
      const status = String(order.status || 'Pending').trim() || 'Pending';
      counts.set(status, (counts.get(status) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [visibleOrders]);

  const segments = useMemo(() => {
    const total = visibleOrders.length || 1;
    let cursor = 0;
    return statuses.map((item, index) => {
      const color = STATUS_COLORS[item.status] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
      const start = cursor;
      cursor += (item.count / total) * 100;
      return `${color} ${start}% ${cursor}%`;
    });
  }, [statuses, visibleOrders.length]);

  const periodText = useMemo(() => {
    if (range === 'all') return 'All time';
    if (range === '7-days') {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return `${dateLabel(start)} – ${dateLabel(end)}`;
    }
    if (range === '30-days') {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      return `${dateLabel(start)} – ${dateLabel(end)}`;
    }
    const { start, end } = monthRange(range === 'last-month' ? -1 : 0);
    return `${dateLabel(start)} – ${dateLabel(end)}`;
  }, [range]);

  return (
    <section className="order-status-dashboard mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:px-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900">Order Status Percentage</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">{periodText}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadOrders()} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <label className="relative">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/80" />
            <select value={range} onChange={(e) => setRange(e.target.value as any)} className="h-9 appearance-none rounded-lg bg-primary pl-9 pr-8 text-xs font-semibold text-white outline-none">
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="7-days">Last 7 Days</option>
              <option value="30-days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
          </label>
        </div>
      </div>

      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[300px_1fr] lg:items-center">
        <div className="flex justify-center">
          <div className="relative h-64 w-64 rounded-full" style={{ background: `conic-gradient(${segments.length ? segments.join(',') : '#e5e7eb 0 100%'})` }}>
            <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
              <span className="text-4xl font-light tracking-tight text-gray-500">{visibleOrders.length}</span>
              <span className="mt-1 text-xs font-medium text-gray-400">Total Orders</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
          {statuses.map((item, index) => {
            const percentage = visibleOrders.length ? (item.count / visibleOrders.length) * 100 : 0;
            const color = STATUS_COLORS[item.status] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
            return (
              <div key={item.status} className="min-h-[70px] rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <span className="h-2.5 w-1 rounded-full" style={{ background: color }} />
                  <span className="truncate">{item.status}</span>
                </div>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <span className="text-lg font-bold text-gray-900">{item.count}</span>
                  <span className="text-[11px] font-semibold text-gray-400">{percentage.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
          {!statuses.length && <div className="col-span-full rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">No orders found for this period.</div>}
        </div>
      </div>
    </section>
  );
}
