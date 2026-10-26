import { useCallback, useEffect, useState } from 'react';
import { Activity, Eye, Users, Globe, RefreshCw, ExternalLink, AlertCircle, CalendarDays, Filter, MousePointerClick, Clock, UserRoundSearch } from 'lucide-react';
import { supabase } from '../lib/supabase';

type JourneyEvent = {
  id: number;
  visitor_id: string;
  session_id: string;
  event_type: 'page_view' | 'click' | 'page_exit';
  page_path: string;
  page_title: string;
  traffic_source: string;
  referrer_host: string;
  element_text: string;
  element_tag: string;
  element_href: string;
  duration_seconds: number;
  created_at: string;
};

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
  const [liveVisitorDetails, setLiveVisitorDetails] = useState<{ page: string; title: string; source: string; referrerHost: string; lastSeenAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [journeyEvents, setJourneyEvents] = useState<JourneyEvent[]>([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [visitorSearch, setVisitorSearch] = useState('');
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

  const loadJourney = useCallback(async (from = appliedStartDate, to = appliedEndDate) => {
    setJourneyLoading(true);
    try {
      const { data, error: requestError } = await supabase.functions.invoke('visitor-presence', {
        body: { mode: 'journey-report', startDate: from, endDate: to },
      });
      if (requestError) throw requestError;
      if (data?.error) throw new Error(data.error);
      setJourneyEvents(Array.isArray(data?.events) ? data.events : []);
    } catch (e: any) {
      setError(e?.message || 'Visitor journey data could not be loaded.');
    } finally {
      setJourneyLoading(false);
    }
  }, [appliedStartDate, appliedEndDate]);

  useEffect(() => { void loadJourney(); }, [loadJourney]);

  useEffect(() => {
    let disposed = false;
    const loadLiveVisitors = async () => {
      const { data, error: liveError } = await supabase.functions.invoke('visitor-presence', {
        body: { mode: 'count' },
      });
      if (!disposed && !liveError && typeof data?.activeVisitors === 'number') {
        setLiveVisitors(data.activeVisitors);
        setLiveVisitorDetails(Array.isArray(data.visitors) ? data.visitors : []);
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
    void loadJourney(startDate, endDate);
  };

  const visibleJourneyEvents = journeyEvents.filter((event) => {
    const query = visitorSearch.trim().toLowerCase();
    if (!query) return true;
    return [event.visitor_id, event.session_id, event.page_path, event.page_title, event.traffic_source, event.element_text, event.element_href].some(value => String(value || '').toLowerCase().includes(query));
  });
  const uniqueJourneyVisitors = new Set(journeyEvents.map(event => event.visitor_id)).size;
  const journeyClicks = journeyEvents.filter(event => event.event_type === 'click').length;
  const journeySeconds = journeyEvents.filter(event => event.event_type === 'page_exit').reduce((sum, event) => sum + Number(event.duration_seconds || 0), 0);
  const formatDuration = (seconds: number) => seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  const periodLabel = appliedStartDate === appliedEndDate
    ? appliedStartDate
    : `${appliedStartDate} – ${appliedEndDate}`;

  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-gray-900">Website Analytics</h1><p className="mt-1 text-sm text-gray-500">Google Analytics 4 traffic for Homemade Beauty Care.</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { void load(true); void loadJourney(); }} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button>
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

    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-semibold text-gray-900">Live Visitors</h2><p className="mt-1 text-xs text-gray-500">Pages and traffic sources for visitors active in the last 75 seconds. Refreshes every 20 seconds.</p></div>
          <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">{number(liveVisitors ?? 0)} online</span>
        </div>
      </div>
      {liveVisitorDetails.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-5 py-3 font-medium">Current page</th><th className="px-5 py-3 font-medium">Traffic source</th><th className="px-5 py-3 font-medium">Referrer</th><th className="px-5 py-3 font-medium">Last active</th></tr></thead>
        <tbody className="divide-y">{liveVisitorDetails.map((visitor, index) => <tr key={index}>
          <td className="max-w-[280px] px-5 py-3"><div className="break-all font-medium text-gray-900">{visitor.page || '/'}</div>{visitor.title && <div className="mt-1 truncate text-xs text-gray-500">{visitor.title}</div>}</td>
          <td className="px-5 py-3">{visitor.source || 'Direct / none'}</td>
          <td className="px-5 py-3">{visitor.referrerHost || '—'}</td>
          <td className="whitespace-nowrap px-5 py-3 text-gray-500">{visitor.lastSeenAt ? new Date(visitor.lastSeenAt).toLocaleTimeString() : 'Just now'}</td>
        </tr>)}</tbody>
      </table></div> : <div className="p-5 text-sm text-gray-500">No active visitor details yet. Keep a public website page open for a few seconds; visitor page/source details update on the next heartbeat.</div>}
    </section>

    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold text-gray-900">Visitor Journey / User Activity</h2><p className="mt-1 text-xs text-gray-500">Per-browser visit history, page sequence, source, clicks and approximate time on page · {periodLabel}</p></div>
          <button onClick={() => void loadJourney()} disabled={journeyLoading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${journeyLoading ? 'animate-spin' : ''}`} /> Refresh activity</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3"><div className="flex items-center gap-2 text-xs text-gray-500"><Users className="h-4 w-4" /> Unique browsers</div><div className="mt-1 text-xl font-bold">{number(uniqueJourneyVisitors)}</div></div>
          <div className="rounded-lg bg-gray-50 p-3"><div className="flex items-center gap-2 text-xs text-gray-500"><MousePointerClick className="h-4 w-4" /> Tracked clicks</div><div className="mt-1 text-xl font-bold">{number(journeyClicks)}</div></div>
          <div className="rounded-lg bg-gray-50 p-3"><div className="flex items-center gap-2 text-xs text-gray-500"><Clock className="h-4 w-4" /> Measured page time</div><div className="mt-1 text-xl font-bold">{formatDuration(journeySeconds)}</div></div>
        </div>
        <label className="mt-4 block text-sm text-gray-600">Search visitor, page or activity
          <div className="relative mt-1"><UserRoundSearch className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input value={visitorSearch} onChange={e => setVisitorSearch(e.target.value)} placeholder="Paste visitor ID, page name, button text or source" className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
        </label>
      </div>
      {visibleJourneyEvents.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 font-medium">Date / time</th><th className="px-4 py-3 font-medium">Visitor / session</th><th className="px-4 py-3 font-medium">Event</th><th className="px-4 py-3 font-medium">Page</th><th className="px-4 py-3 font-medium">Click / element</th><th className="px-4 py-3 font-medium">Source</th><th className="px-4 py-3 font-medium">Time on page</th></tr></thead>
        <tbody className="divide-y">{visibleJourneyEvents.map(event => <tr key={event.id} className="align-top hover:bg-gray-50">
          <td className="whitespace-nowrap px-4 py-3 text-gray-600">{new Date(event.created_at).toLocaleString()}</td>
          <td className="px-4 py-3"><div className="font-medium text-gray-900">{event.visitor_id.slice(0, 8)}…</div><div className="mt-1 text-xs text-gray-500">Session {event.session_id.slice(0, 8)}…</div><button onClick={() => setVisitorSearch(event.visitor_id)} className="mt-1 text-xs text-primary underline">Show this visitor</button></td>
          <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-medium ${event.event_type === 'click' ? 'bg-blue-50 text-blue-700' : event.event_type === 'page_exit' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{event.event_type === 'page_view' ? 'Page viewed' : event.event_type === 'page_exit' ? 'Page left' : 'Click'}</span></td>
          <td className="max-w-[260px] px-4 py-3"><div className="break-all font-medium">{event.page_path || '/'}</div>{event.page_title && <div className="mt-1 text-xs text-gray-500">{event.page_title}</div>}</td>
          <td className="max-w-[260px] px-4 py-3"><div className="break-words">{event.element_text || '—'}</div>{event.element_tag && <div className="mt-1 text-xs text-gray-500">&lt;{event.element_tag}&gt;</div>}{event.element_href && <a href={event.element_href} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-primary underline">{event.element_href}</a>}</td>
          <td className="max-w-[180px] break-words px-4 py-3">{event.traffic_source || 'Direct / none'}{event.referrer_host && <div className="mt-1 text-xs text-gray-500">Referrer: {event.referrer_host}</div>}</td>
          <td className="whitespace-nowrap px-4 py-3">{event.event_type === 'page_exit' ? formatDuration(Number(event.duration_seconds || 0)) : '—'}</td>
        </tr>)}</tbody>
      </table></div> : <div className="p-5 text-sm text-gray-500">{journeyLoading ? 'Loading visitor activity…' : 'No visitor activity found for this date range. New page views, clicks and page time will appear after tracking starts.'}</div>}
      <div className="border-t bg-gray-50 px-5 py-3 text-xs text-gray-500">Visitor IDs are anonymous browser IDs, not real names. Click tracking records interactive elements (links/buttons), not every mouse click. Time on page is approximate and may not be recorded if a browser closes abruptly.</div>
    </section>

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
