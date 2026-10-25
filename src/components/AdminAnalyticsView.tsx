import { useCallback, useEffect, useState } from 'react';
import { Activity, Eye, Users, Globe, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Report = { activeUsers: number; todayUsers: number; pageViews: number; topPages: { page: string; views: number }[]; sources: { source: string; sessions: number }[] };
const number = (v: unknown) => Number(v || 0).toLocaleString();

export default function AdminAnalyticsView() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(true), 60000);
    return () => window.clearInterval(t);
  }, [load]);

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-gray-900">Website Analytics</h1><p className="mt-1 text-sm text-gray-500">Google Analytics 4 traffic for Homemade Beauty Care.</p></div>
      <div className="flex gap-2"><button onClick={() => void load(true)} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button><a href="https://analytics.google.com/analytics/web/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">Open Google Analytics <ExternalLink className="h-4 w-4" /></a></div>
    </div>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Analytics connection needs setup</div><p className="mt-2 break-words">{error}</p></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[
      ['Live Visitors', report?.activeUsers, Activity], ["Today's Visitors", report?.todayUsers, Users], ['Page Views Today', report?.pageViews, Eye]
    ].map(([title, value, Icon]: any) => <div key={title} className="rounded-xl border border-gray-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-500">{title}</span><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span></div><div className="mt-4 text-3xl font-bold text-gray-900">{loading ? '—' : number(value)}</div></div>)}</div>

    <div className="rounded-xl border border-primary/15 bg-primary/5 p-5">
      <h2 className="font-semibold text-gray-900">Failed Orders</h2>
      <p className="mt-1 text-sm text-gray-600">Failed checkout leads are now managed directly from the Orders section, with the same View, Edit, Status, Invoice and Delete controls as other orders.</p>
    </div>

    <div className="grid gap-6 xl:grid-cols-2"><section className="overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold">Top Pages Today</h2></div>{report?.topPages?.length ? <div className="divide-y">{report.topPages.map(x => <div key={x.page} className="flex justify-between px-5 py-3 text-sm"><span>{x.page || '/'}</span><b>{number(x.views)}</b></div>)}</div> : <div className="p-5 text-sm text-gray-500">No page-view data yet.</div>}</section><section className="overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold">Traffic Sources</h2></div>{report?.sources?.length ? <div className="divide-y">{report.sources.map(x => <div key={x.source} className="flex justify-between px-5 py-3 text-sm"><span className="flex items-center gap-2"><Globe className="h-4 w-4 text-gray-400" />{x.source || '(direct) / (none)'}</span><b>{number(x.sessions)}</b></div>)}</div> : <div className="p-5 text-sm text-gray-500">No source data yet.</div>}</section></div>
    <p className="text-xs text-gray-400">Automatically refreshes every minute.</p>
  </div>;
}
