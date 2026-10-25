import { useCallback, useEffect, useState } from 'react';
import { Activity, Eye, Users, Globe, RefreshCw, ExternalLink, AlertCircle, Phone, MapPin, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Report = { activeUsers: number; todayUsers: number; pageViews: number; topPages: { page: string; views: number }[]; sources: { source: string; sessions: number }[] };
type FailedCheckout = { session_id: string; customer_name: string | null; mobile: string | null; email: string | null; district: string | null; area: string | null; address: string | null; last_seen_at: string };
const number = (v: unknown) => Number(v || 0).toLocaleString();

export default function AdminAnalyticsView() {
  const [report, setReport] = useState<Report | null>(null);
  const [failed, setFailed] = useState<FailedCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadFailed = useCallback(async () => {
    const { data } = await supabase.rpc('get_failed_checkouts_admin');
    setFailed((data || []) as FailedCheckout[]);
  }, []);

  const load = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const { data, error: e } = await supabase.functions.invoke('analytics-report');
      if (e) throw e;
      if (data?.error) throw new Error(data.error);
      setReport(data as Report);
    } catch (e: any) {
      setError(e?.message || 'Analytics report load failed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    void loadFailed();
  }, [loadFailed]);

  useEffect(() => { void load(); const t = window.setInterval(() => void load(true), 60000); return () => window.clearInterval(t); }, [load]);

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-gray-900">Website Analytics</h1><p className="mt-1 text-sm text-gray-500">Google Analytics 4 traffic for Homemade Beauty Care.</p></div>
      <div className="flex gap-2"><button onClick={() => void load(true)} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button><a href="https://analytics.google.com/analytics/web/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">Open Google Analytics <ExternalLink className="h-4 w-4" /></a></div>
    </div>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Analytics connection needs setup</div><p className="mt-2 break-words">{error}</p></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[
      ['Live Visitors', report?.activeUsers, Activity], ["Today's Visitors", report?.todayUsers, Users], ['Page Views Today', report?.pageViews, Eye]
    ].map(([title, value, Icon]: any) => <div key={title} className="rounded-xl border border-gray-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-500">{title}</span><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span></div><div className="mt-4 text-3xl font-bold text-gray-900">{loading ? '—' : number(value)}</div></div>)}</div>

    <section className="overflow-hidden rounded-xl border border-amber-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b bg-amber-50 px-5 py-4"><div><h2 className="font-semibold text-gray-900">Failed Orders</h2><p className="mt-1 text-xs text-gray-500">Checkout visitors who entered information but did not confirm an order.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{failed.length}</span></div>
      {failed.length === 0 ? <div className="p-5 text-sm text-gray-500">No failed checkout leads yet.</div> : <div className="divide-y">{failed.map(lead => <div key={lead.session_id} className="p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="flex gap-2"><UserRound className="h-4 w-4 text-gray-400" /><div><div className="text-xs text-gray-400">Name</div><div className="text-sm font-medium">{lead.customer_name || 'Not provided'}</div></div></div><div className="flex gap-2"><Phone className="h-4 w-4 text-gray-400" /><div><div className="text-xs text-gray-400">Mobile</div><div className="text-sm font-medium">{lead.mobile || 'Not provided'}</div></div></div><div className="flex gap-2"><MapPin className="h-4 w-4 text-gray-400" /><div><div className="text-xs text-gray-400">Location</div><div className="text-sm font-medium">{[lead.area, lead.district].filter(Boolean).join(', ') || 'Not provided'}</div></div></div><div><div className="text-xs text-gray-400">Last seen</div><div className="text-sm font-medium">{new Date(lead.last_seen_at).toLocaleString()}</div></div></div>{lead.address && <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">Address: {lead.address}</div>}{lead.email && <div className="mt-2 text-xs text-gray-500">Email: {lead.email}</div>}</div>)}</div>}
    </section>

    <div className="grid gap-6 xl:grid-cols-2"><section className="overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold">Top Pages Today</h2></div>{report?.topPages?.length ? <div className="divide-y">{report.topPages.map(x => <div key={x.page} className="flex justify-between px-5 py-3 text-sm"><span>{x.page || '/'}</span><b>{number(x.views)}</b></div>)}</div> : <div className="p-5 text-sm text-gray-500">No page-view data yet.</div>}</section><section className="overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold">Traffic Sources</h2></div>{report?.sources?.length ? <div className="divide-y">{report.sources.map(x => <div key={x.source} className="flex justify-between px-5 py-3 text-sm"><span className="flex items-center gap-2"><Globe className="h-4 w-4 text-gray-400" />{x.source || '(direct) / (none)'}</span><b>{number(x.sessions)}</b></div>)}</div> : <div className="p-5 text-sm text-gray-500">No source data yet.</div>}</section></div>
    <p className="text-xs text-gray-400">Automatically refreshes every minute.</p>
  </div>;
}
