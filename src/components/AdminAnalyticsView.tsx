import { useCallback, useEffect, useState } from 'react';
import { Activity, Eye, Users, Globe, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Report = {
  activeUsers: number;
  todayUsers: number;
  pageViews: number;
  topPages: { page: string; views: number }[];
  sources: { source: string; sessions: number }[];
  configured?: boolean;
};

const number = (value: unknown) => Number(value || 0).toLocaleString();

export default function AdminAnalyticsView() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('analytics-report');
      if (invokeError) throw invokeError;
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
    const timer = window.setInterval(() => void load(true), 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const cards = [
    { title: 'Live Visitors', value: report?.activeUsers, icon: Activity, note: 'Active users right now' },
    { title: "Today's Visitors", value: report?.todayUsers, icon: Users, note: 'Users so far today' },
    { title: 'Page Views Today', value: report?.pageViews, icon: Eye, note: 'Total pages viewed today' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Google Analytics 4 traffic for Homemade Beauty Care.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load(true)} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <a href="https://analytics.google.com/analytics/web/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
            Open Google Analytics <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-2 font-semibold"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Analytics connection needs setup</div>
          <p className="mt-2 break-words">{error}</p>
          <p className="mt-2">The admin section is ready, but the secure Google Analytics credentials/property configuration must be completed in Supabase before live numbers can appear.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return <div key={card.title} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{card.title}</span>
              <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>
            </div>
            <div className="mt-4 text-3xl font-bold text-gray-900">{loading ? '—' : number(card.value)}</div>
            <p className="mt-1 text-xs text-gray-500">{card.note}</p>
          </div>;
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b px-5 py-4"><h2 className="font-semibold text-gray-900">Top Pages Today</h2><p className="mt-1 text-xs text-gray-500">Pages receiving the most views</p></div>
          {loading ? <div className="p-5 text-sm text-gray-500">Loading report…</div> : report?.topPages?.length ? <div className="divide-y">{report.topPages.map((item) => <div key={item.page} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><span className="min-w-0 break-all text-gray-700">{item.page || '/'}</span><span className="shrink-0 font-semibold text-gray-900">{number(item.views)}</span></div>)}</div> : <div className="p-5 text-sm text-gray-500">No page-view data yet.</div>}
        </section>
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b px-5 py-4"><h2 className="font-semibold text-gray-900">Traffic Sources</h2><p className="mt-1 text-xs text-gray-500">Where visits came from today</p></div>
          {loading ? <div className="p-5 text-sm text-gray-500">Loading report…</div> : report?.sources?.length ? <div className="divide-y">{report.sources.map((item) => <div key={item.source} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><span className="flex min-w-0 items-center gap-2 break-all text-gray-700"><Globe className="h-4 w-4 shrink-0 text-gray-400" />{item.source || '(direct) / (none)'}</span><span className="shrink-0 font-semibold text-gray-900">{number(item.sessions)}</span></div>)}</div> : <div className="p-5 text-sm text-gray-500">No source data yet.</div>}
        </section>
      </div>
      <p className="text-xs text-gray-400">Automatically refreshes every minute. Google Analytics may take a short time to process standard reports; live visitors use the Realtime report.</p>
    </div>
  );
}
