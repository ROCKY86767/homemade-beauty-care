import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, Users, Globe, RefreshCw, ExternalLink, AlertCircle, CalendarDays, Filter, MousePointerClick, Clock, UserRoundSearch } from 'lucide-react';
import { supabase } from '../lib/supabase';

type JourneyEvent = {
  id: number;
  visitor_id: string;
  ip_address: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  country_code?: string | null;
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

export default function AdminAnalyticsView({ journeyOnly = false }: { journeyOnly?: boolean }) {
  const navigate = useNavigate();
  const today = localDate();
  const [report, setReport] = useState<Report | null>(null);
  const [liveVisitors, setLiveVisitors] = useState<number | null>(null);
  const [liveVisitorDetails, setLiveVisitorDetails] = useState<{ ipAddress: string | null; city?: string | null; region?: string | null; country?: string | null; countryCode?: string | null; page: string; title: string; source: string; referrerHost: string; lastSeenAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [journeyEvents, setJourneyEvents] = useState<JourneyEvent[]>([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [visitorSearch, setVisitorSearch] = useState('');
  const [showJourneyDetails, setShowJourneyDetails] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [appliedStartDate, setAppliedStartDate] = useState(today);
  const [appliedEndDate, setAppliedEndDate] = useState(today);

  const load = useCallback(async (quiet = false, from = appliedStartDate, to = appliedEndDate) => {
    quiet ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const { data, error: e } = await supabase.functions.invoke('analytics-report', { body: { startDate: from, endDate: to } });
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
      const { data, error: requestError } = await supabase.functions.invoke('visitor-presence', { body: { mode: 'journey-report', startDate: from, endDate: to } });
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
      const { data, error: liveError } = await supabase.functions.invoke('visitor-presence', { body: { mode: 'count' } });
      if (!disposed && !liveError && typeof data?.activeVisitors === 'number') {
        setLiveVisitors(data.activeVisitors);
        setLiveVisitorDetails(Array.isArray(data.visitors) ? data.visitors : []);
      }
    };
    void loadLiveVisitors();
    const timer = window.setInterval(() => void loadLiveVisitors(), 20000);
    return () => { disposed = true; window.clearInterval(timer); };
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
    return [event.ip_address, event.visitor_id, event.session_id, event.page_path, event.page_title, event.traffic_source, event.element_text, event.element_href].some(value => String(value || '').toLowerCase().includes(query));
  });

  const uniqueJourneyVisitors = (() => {
    const lastSeen = new Map<string, number>();
    let sessions = 0;
    for (const event of [...journeyEvents].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())) {
      const identity = event.ip_address ? `ip:${event.ip_address}` : `id:${event.visitor_id}`;
      const current = new Date(event.created_at).getTime();
      const previous = lastSeen.get(identity);
      if (previous === undefined || current - previous > 20 * 60 * 1000) sessions++;
      lastSeen.set(identity, current);
    }
    return sessions;
  })();

  const journeyClicks = journeyEvents.filter(event => event.event_type === 'click').length;
  const journeySeconds = journeyEvents.filter(event => event.event_type === 'page_exit').reduce((sum, event) => sum + Number(event.duration_seconds || 0), 0);
  const formatDuration = (seconds: number) => seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const periodLabel = appliedStartDate === appliedEndDate ? appliedStartDate : `${appliedStartDate} – ${appliedEndDate}`;

  return <div className="visitor-activity-page space-y-6">
    {!journeyOnly && <>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-gray-900">Website Analytics</h1><p className="mt-1 text-sm text-gray-700">Google Analytics 4 traffic for Homemade Beauty Care.</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { void load(true); void loadJourney(); }} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh</button>
        <a href="https://analytics.google.com/analytics/web/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">Open Google Analytics <ExternalLink className="h-4 w-4" /></a>
      </div>
    </div>
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><CalendarDays className="h-5 w-5 text-primary" /> Filter by date</div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm text-gray-700">Start date<input type="date" value={startDate} max={endDate || undefined} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
        <label className="block text-sm text-gray-700">End date<input type="date" value={endDate} min={startDate || undefined} max={today} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
        <button onClick={applyDateFilter} disabled={loading || refreshing} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"><Filter className="h-4 w-4" /> Apply Filter</button>
      </div>
      <p className="mt-2 text-xs text-gray-700">Selected period: {periodLabel}. Online count includes public-site sessions active within the last 75 seconds. GA4 reports may take time to process new visits.</p>
    </section>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><div className="flex items-center gap-2 font-semibold"><AlertCircle className="h-4 w-4" /> Analytics connection needs attention</div><p className="mt-2 break-words">{error}</p></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[['Visitors Online Now', liveVisitors ?? 0, Activity], ['Unique Visitors', report?.todayUsers, Users], ['Page Views in Selected Period', report?.pageViews, Eye]].map(([title, value, Icon]: any) => <div key={title} className="rounded-xl border border-gray-200 bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-gray-700">{title}</span><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span></div><div className="mt-4 text-3xl font-bold text-gray-900">{loading ? '—' : number(value)}</div></div>)}</div>
    <section className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
      <div className="border-b px-5 py-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-gray-900">Live Visitors</h2><p className="mt-1 text-xs text-gray-700">Pages and traffic sources for visitors active in the last 75 seconds. Refreshes every 20 seconds.</p></div><span className="rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">{number(liveVisitors ?? 0)} online</span></div></div>
      {liveVisitorDetails.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-700"><tr><th className="px-5 py-3 font-semibold">IP Address</th><th className="px-5 py-3 font-semibold">Approx. location</th><th className="px-5 py-3 font-semibold">Current page</th><th className="px-5 py-3 font-medium">Traffic source</th><th className="px-5 py-3 font-medium">Referrer</th><th className="px-5 py-3 font-medium">Last active</th></tr></thead><tbody className="divide-y">{liveVisitorDetails.map((visitor, index) => <tr key={index}><td className="whitespace-nowrap px-5 py-3 font-mono text-xs font-semibold text-gray-800">{visitor.ipAddress || 'Unavailable'}</td><td className="min-w-[160px] px-5 py-3 text-gray-700"><div className="font-medium">{[visitor.city, visitor.region].filter(Boolean).join(", ") || "Location unavailable"}</div><div className="mt-1 text-xs">{visitor.country || ""}{visitor.countryCode ? ` (${visitor.countryCode})` : ""}</div></td><td className="max-w-[280px] px-5 py-3"><div className="break-all font-medium text-gray-900">{visitor.page || '/'}</div>{visitor.title && <div className="mt-1 truncate text-xs text-gray-700">{visitor.title}</div>}</td><td className="px-5 py-3">{visitor.source || 'Direct / none'}</td><td className="px-5 py-3">{visitor.referrerHost || '—'}</td><td className="whitespace-nowrap px-5 py-3 text-gray-700">{visitor.lastSeenAt ? new Date(visitor.lastSeenAt).toLocaleTimeString() : 'Just now'}</td></tr>)}</tbody></table></div> : <div className="p-5 text-sm text-gray-700">No active visitor details yet. Keep a public website page open for a few seconds; visitor page/source details update on the next heartbeat.</div>}
    </section>
    </>}
    {!journeyOnly && <button type="button" onClick={() => navigate('/admin?tab=visitor-activity')} className="group flex w-full items-center justify-between gap-4 rounded-xl border border-primary/20 bg-white p-5 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md"><div className="flex min-w-0 items-center gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRoundSearch className="h-6 w-6" /></span><span className="min-w-0"><span className="block font-semibold text-gray-900">Visitor Activity & Journey</span><span className="mt-1 block text-sm text-gray-700">প্রতিটি ভিজিটরের পেজ, ক্লিক, সোর্স ও সময়ের বিস্তারিত দেখুন · {periodLabel}</span><span className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700"><span className="rounded-full bg-gray-100 px-2 py-1">{number(uniqueJourneyVisitors)} visits</span><span className="rounded-full bg-gray-100 px-2 py-1">{number(journeyClicks)} clicks</span></span></span></div><span className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white">{showJourneyDetails ? 'Close details' : 'Open details'} <span aria-hidden="true">{showJourneyDetails ? '−' : '+'}</span></span></button>}
    {(showJourneyDetails || journeyOnly) && <section className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="border-b border-gray-300 bg-gray-50 px-5 py-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div>{journeyOnly && <button onClick={() => navigate('/admin?tab=analytics')} className="mb-3 inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">← Back to Website Analytics</button>}<h2 className="text-lg font-semibold text-gray-900">Visitor Journey</h2><p className="mt-1 text-sm text-gray-700">একই IP-এর ২০ মিনিটের মধ্যে একাধিক activity এক visitor হিসেবে ধরা হয়। ২০ মিনিট পরে আবার এলে নতুন visit গণনা হয়। সময়: {periodLabel}</p></div><button onClick={() => void loadJourney()} disabled={journeyLoading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${journeyLoading ? 'animate-spin' : ''}`} /> Refresh</button></div></div>{/* journey table continues */}</section>}
  </div>;
}
