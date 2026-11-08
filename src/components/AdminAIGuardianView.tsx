import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Finding = {
  title?: string;
  message?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | string;
  category?: string;
  page?: string;
};

type GuardianReport = {
  id: string;
  run_id: string;
  status: 'completed' | 'failed' | 'partial';
  trigger_source: string;
  started_at: string;
  completed_at: string | null;
  health_score: number | null;
  summary: string;
  findings: Finding[];
  metrics: Record<string, unknown>;
  fix_status: string;
  fix_branch: string | null;
  fix_pr_url: string | null;
  deployment_url: string | null;
  created_at: string;
};

const dateTime = (value: string | null) => value
  ? new Date(value).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not available';

const severityClass = (severity?: string) => {
  if (severity === 'critical' || severity === 'high') return 'bg-red-50 text-red-700 border-red-100';
  if (severity === 'medium') return 'bg-amber-50 text-amber-700 border-amber-100';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const fixLabel = (status: string) => ({
  not_attempted: 'Not attempted',
  no_fix_needed: 'No fix needed',
  pr_created: 'Fix PR created',
  failed: 'Fix failed tests',
  skipped: 'Auto-fix skipped',
}[status] || status.replaceAll('_', ' '));

export default function AdminAIGuardianView() {
  const [reports, setReports] = useState<GuardianReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');

    const { data, error: queryError } = await supabase
      .from('ai_guardian_reports')
      .select('id,run_id,status,trigger_source,started_at,completed_at,health_score,summary,findings,metrics,fix_status,fix_branch,fix_pr_url,deployment_url,created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (queryError) {
      setError(queryError.message.includes('ai_guardian_reports')
        ? 'AI Guardian database migration এখনো চালু হয়নি। Setup শেষ হলে এখানে Audit Report দেখা যাবে।'
        : queryError.message);
    } else {
      setReports((data || []) as GuardianReport[]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 60000);
    return () => window.clearInterval(timer);
  }, [load]);

  const latest = reports[0];
  const totalFindings = reports.reduce((total, report) => total + (Array.isArray(report.findings) ? report.findings.length : 0), 0);
  const latestFindings = Array.isArray(latest?.findings) ? latest.findings : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">AI Website Guardian</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">Website health monitoring, scheduled every 6 hours.</p>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh reports
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Latest health score</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{latest?.health_score ?? '—'}<span className="ml-1 text-base font-medium text-gray-400">/100</span></p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Latest findings</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{latestFindings.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Reports stored</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{reports.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-gray-500">Findings in history</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalFindings}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-sm text-gray-500">Loading AI Guardian reports…</div>
      ) : (
        <>
          {latest && (
            <section className="rounded-2xl border bg-white p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Latest Audit</h2>
                  <p className="mt-1 text-sm text-gray-500">Started {dateTime(latest.started_at)}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-xs font-semibold ${latest.status === 'completed' ? 'border-green-100 bg-green-50 text-green-700' : latest.status === 'failed' ? 'border-red-100 bg-red-50 text-red-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
                  {latest.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {latest.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-700">{latest.summary || 'No summary was provided.'}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700">Auto-fix: {fixLabel(latest.fix_status)}</span>
                <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700">Trigger: {latest.trigger_source}</span>
                {latest.fix_branch && <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700">Branch: {latest.fix_branch}</span>}
              </div>
              {(latest.fix_pr_url || latest.deployment_url) && (
                <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
                  {latest.fix_pr_url && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={latest.fix_pr_url} target="_blank" rel="noreferrer">Review AI fix PR <ExternalLink className="h-4 w-4" /></a>}
                  {latest.deployment_url && <a className="inline-flex items-center gap-1 text-primary hover:underline" href={latest.deployment_url} target="_blank" rel="noreferrer">Open Preview <ExternalLink className="h-4 w-4" /></a>}
                </div>
              )}
              {latestFindings.length > 0 && (
                <div className="mt-5 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900">Detected issues</h3>
                  {latestFindings.map((finding, index) => (
                    <div key={`${latest.run_id}-${index}`} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{finding.title || finding.category || 'Website issue'}</p>
                        <p className="mt-1 break-words text-sm text-gray-500">{finding.message || 'No additional details.'}</p>
                        {finding.page && <p className="mt-1 text-xs text-gray-400">{finding.page}</p>}
                      </div>
                      <span className={`shrink-0 self-start rounded-full border px-2.5 py-1 text-xs font-medium ${severityClass(finding.severity)}`}>{finding.severity || 'info'}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border bg-white">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold text-gray-900">Audit history</h2>
              <p className="mt-1 text-xs text-gray-500">The latest 30 automated reports are shown here.</p>
            </div>
            {reports.length === 0 ? (
              <div className="p-8 text-center">
                <Activity className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-700">No audit reports yet</p>
                <p className="mt-1 text-xs text-gray-500">The first report will appear after the scheduled audit completes.</p>
              </div>
            ) : (
              <div className="divide-y">
                {reports.map(report => (
                  <div key={report.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{dateTime(report.created_at)}</p>
                      <p className="mt-1 text-xs text-gray-500">{report.summary || 'Audit completed'} · {Array.isArray(report.findings) ? report.findings.length : 0} finding(s)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">{report.health_score ?? '—'}/100</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${report.fix_status === 'pr_created' ? 'bg-blue-50 text-blue-700' : report.fix_status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{fixLabel(report.fix_status)}</span>
                      {report.fix_pr_url && <a href={report.fix_pr_url} target="_blank" rel="noreferrer" aria-label="Open fix pull request" className="text-primary hover:underline"><ExternalLink className="h-4 w-4" /></a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
        AI-generated changes are prepared on a separate GitHub branch and tested before a Preview is created. Production changes remain subject to the existing review and release process.
      </div>
    </div>
  );
}
