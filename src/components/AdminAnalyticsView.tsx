import { useCallback, useEffect, useState } from 'react';
import { Activity, Eye, Users, Globe, RefreshCw, ExternalLink, AlertCircle, CalendarDays, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Report = {
  activeUsers: number;
  todayUsers: number;
  pageViews: number;
  topPages: { page: string; views: number }[];
  sources: { source: string; sessions: number }[];
};

const number = (v: unknown) => Number(v || 0).toLocaleString();
const localDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AdminAnalyticsView() {
  const today = localDate();
  const [report, setReport] = useState<Report | null>(null);
  const [liveVisitors, setLiveVisitors] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [appliedStartDate, setAppliedStartDate] = useState(today);
  const [appliedEndDate, setAppliedEndDate] = useState(today);

  const load = useCallback(async (quiet = false, from = appliedStartDate, to = appliedEndDate) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const { data, error: e } = await supabase.functions.invoke('analytics-report', {
        body: { startDate: from, endDate: to },
      });
      if (e) throw e;
      if (data?.error) throw new Error(data.error);
      setReport(data as Report);
    } catch (e: any) {
      setError(e?.message || 'Analytics report load failed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [appliedStartDate, appliedEndDate]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(true), 60000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    let disposed = false;
    const loadLiveVisitors = async () => {
      const { data, error: liveError } = await supabase.functions.invoke('visitor-presence', {
        body: { mode: 'count' },
      });
      if (!disposed && !liveError && typeof data?.activeVisitors === 'number') {
        setLiveVisitors(data.activeVisitors);
      }
    };
    void loadLiveVisitors();
    const timer = window.setInterval(() => void loadLiveVisitors(), 20000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  const applyDateFilter = () => {
    if (!startDate || !endDate || startDate > endDate) {
      setError('Please select a valid date range. Start date must be on or before end date.');
      return;
    }
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    void load(false, startDate, endDate);
  };

  const periodLabel = appliedStartDate === appliedEndDate
    ? appliedStartDate
    : `${appliedStartDate} – ${appliedEndDate}`;

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-gray-900">Website Analytics</h1><p className="mt-1 text-sm text-gray-500">Google Analytics 4 traffic for Homemade Beauty Care.</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void load(true)} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button>
        <a href="https://analytics.google.com/analytics/web/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">Open Google Analytics <ExternalLink className="h-4 w-4" /></a>
      </div>
    </div>

    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><CalendarDays className="h-5 w-5 text-primary" /> Filter by date</div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm text-gray-600">Start date
          <input type="date" value={startDate} max={endDate || undefined} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </label>
        <label className="block text-sm text-gray-600">End date
          <input type="date" value={endDate} min={startDate || undefined} max={today} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </label>
        <button onClick={applyDateFilter} disabled={loading || refreshing} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"><Filter className="h-4 w-4" /> Apply Filter</button>
      </div>
      <p className="mt-2 text-xs text-gray-500">Selected period: {periodLabel}. Online count includes public-site sessions active within the last 75 seconds. GA4 reports may take time to process new visits.</p>
    </section>

    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Analytics connection needs attention</div><p className="mt-2 break-words">{error}</p></div>}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[
      ['Visitors Online Now', liveVisitors ?? 0, Activity], ['Visitors in Selected Period', report?.todayUsers, Users], ['Page Views in Selected Period', report?.pageViews, Eye]
    ].map(([title, value, Icon]: any) => <div key={title} className="rounded-xl border border-gray-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-500">{title}</span><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span></div><div className="mt-4 text-3xl font-bold text-gray-900">{loading ? '—' : number(value)}</div></div>)}</div>

    <div className="rounded-xl border border-primary/15 bg-primary/5 p-5">
      <h2 className="font-semibold text-gray-900">Failed Orders</h2>
      <p className="mt-1 text-sm text-gray-600">Failed checkout leads are now managed directly from the Orders section, with the same View, Edit, Status, Invoice and Delete controls as other orders.</p>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Top Pages</h2><p className="mt-1 text-xs text-gray-500">{periodLabel}</p></div>
        {report?.topPages?.length ? <div className="divide-y">{report.topPages.map(x => <div key={x.page} className="flex items-start justify-between gap-4 px-5 py-3 text-sm"><span className="min-w-0 break-all">{x.page || '/'}</span><b className="shrink-0">{number(x.views)} views</b></div>)}</div> : <div className="p-5 text-sm text-gray-500">{loading ? 'Loading page data…' : 'No page-view data returned for this period. Confirm events in GA4 Realtime/DebugView; standard reports may take 24–48 hours to populate.'}</div>}
      </section>
      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Traffic Sources</h2><p className="mt-1 text-xs text-gray-500">{periodLabel}</p></div>
        {report?.sources?.length ? <div className="divide-y">{report.sources.map(x => <div key={x.source} className="flex items-start justify-between gap-4 px-5 py-3 text-sm"><span className="min-w-0 break-words flex items-center gap-2"><Globe className="h-4 w-4 shrink-0 text-gray-400" />{x.source || '(direct) / (none)'}</span><b className="shrink-0">{number(x.sessions)} sessions</b></div>)}</div> : <div className="p-5 text-sm text-gray-500">{loading ? 'Loading traffic sources…' : 'No traffic-source rows returned for this period. Check GA4 Realtime and allow time for standard reports to populate.'}</div>}
      </section>
    </div>
    <p className="text-xs text-gray-400">Automatically refreshes every minute using the selected date range.</p>
  </div>;
}
