import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const baseUrl = (process.env.AI_GUARDIAN_BASE_URL || 'https://homemade-beauty-care.vercel.app').replace(/\/$/, '');
const outputPath = process.env.AI_GUARDIAN_OUTPUT || 'ai-guardian-report.json';
const triggerSource = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' ? 'manual' : 'schedule';
const startedAt = new Date().toISOString();
const findings = [];
if (process.env.AI_GUARDIAN_BUILD_STATUS === 'failure') {
  findings.push({ category: 'build', severity: 'high', title: 'Project build failed', page: 'repository', message: 'The current source code did not pass npm run build. Review the GitHub Actions build log.' });
}
const metrics = { pages_checked: 0, device_profiles: 2, average_lcp_ms: null, build_status: process.env.AI_GUARDIAN_BUILD_STATUS || 'not_run' };
const lcpValues = [];

function safeUrl(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 350);
  } catch {
    return String(value || '').slice(0, 350);
  }
}

function addFinding(finding) {
  const key = [finding.category, finding.page, finding.message].join('|');
  if (!findings.some(item => [item.category, item.page, item.message].join('|') === key)) {
    findings.push(finding);
  }
}

const routes = [
  '/',
  '/shop',
  '/product/ghorowa-hairpack',
  '/hairpack',
  '/cart',
  '/checkout',
  '/returns-refunds',
  '/delivery-information',
  '/contact',
];

const ignoredHosts = [
  'googletagmanager.com',
  'google-analytics.com',
  'connect.facebook.net',
  'facebook.com',
  'doubleclick.net',
];

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const profiles = [
    { name: 'desktop', viewport: { width: 1365, height: 900 }, isMobile: false },
    { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
  ];

  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: profile.viewport,
      isMobile: profile.isMobile,
      deviceScaleFactor: profile.isMobile ? 1 : 1,
    });

    for (const route of routes) {
      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      const failedRequests = [];
      const serverErrors = [];

      await page.addInitScript(() => {
        window.__aiGuardianLcp = 0;
        try {
          new PerformanceObserver((entries) => {
            for (const entry of entries.getEntries()) {
              window.__aiGuardianLcp = Math.max(window.__aiGuardianLcp || 0, entry.startTime || 0);
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch {
          // LCP observer is not supported in every browser context.
        }
      });

      page.on('pageerror', error => pageErrors.push(error.message.slice(0, 500)));
      page.on('console', message => {
        if (message.type() === 'error') {
          const location = message.location()?.url || '';
          if (!ignoredHosts.some(host => location.includes(host))) {
            consoleErrors.push(message.text().slice(0, 500));
          }
        }
      });
      page.on('requestfailed', request => {
        const url = request.url();
        const failure = request.failure()?.errorText || 'Request failed';
        if (!ignoredHosts.some(host => url.includes(host)) && !failure.includes('ERR_ABORTED')) {
          if (url.startsWith(baseUrl) || url.includes('.supabase.co')) {
            failedRequests.push({ url: safeUrl(url), error: failure.slice(0, 200) });
          }
        }
      });
      page.on('response', response => {
        if (response.status() >= 500) {
          serverErrors.push({ url: safeUrl(response.url()), status: response.status() });
        }
      });

      const pageUrl = baseUrl + route;
      let responseStatus = null;
      try {
        const response = await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        responseStatus = response?.status() ?? null;
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(900);

        const pageInfo = await page.evaluate(() => ({
          title: document.title || '',
          bodyTextLength: document.body?.innerText?.trim().length || 0,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
          lcp: window.__aiGuardianLcp || 0,
          ttfb: performance.getEntriesByType('navigation')[0]?.responseStart || 0,
        }));

        metrics.pages_checked += 1;
        if (pageInfo.lcp > 0) lcpValues.push(pageInfo.lcp);

        if (responseStatus === null || responseStatus >= 500) {
          addFinding({ category: 'availability', severity: 'critical', title: 'Page unavailable', page: route, message: `The page returned HTTP ${responseStatus ?? 'no response'} on ${profile.name}.` });
        } else if (responseStatus >= 400) {
          addFinding({ category: 'routing', severity: 'high', title: 'Page returned an error', page: route, message: `The page returned HTTP ${responseStatus} on ${profile.name}.` });
        }

        if (pageInfo.bodyTextLength < 20) {
          addFinding({ category: 'content', severity: 'medium', title: 'Page appears empty', page: route, message: `Very little visible page content was found on ${profile.name}.` });
        }

        if (profile.isMobile && pageInfo.horizontalOverflow) {
          addFinding({ category: 'responsive', severity: 'medium', title: 'Horizontal overflow on mobile', page: route, message: 'The document is wider than the mobile viewport and may cause horizontal scrolling.' });
        }

        for (const error of pageErrors.slice(0, 5)) {
          addFinding({ category: 'javascript', severity: 'high', title: 'JavaScript runtime error', page: route, message: error });
        }
        for (const error of consoleErrors.slice(0, 3)) {
          addFinding({ category: 'console', severity: 'medium', title: 'Browser console error', page: route, message: error });
        }
        for (const failure of failedRequests.slice(0, 3)) {
          addFinding({ category: 'network', severity: 'medium', title: 'First-party request failed', page: route, message: `${failure.error}: ${failure.url}` });
        }
        for (const failure of serverErrors.slice(0, 3)) {
          addFinding({ category: 'server', severity: 'high', title: 'Server returned 5xx', page: route, message: `HTTP ${failure.status}: ${failure.url}` });
        }

        metrics[`${profile.name}_${route.replace(/[^a-z0-9]/gi, '_') || 'home'}`] = {
          status: responseStatus,
          lcp_ms: Math.round(pageInfo.lcp),
          ttfb_ms: Math.round(pageInfo.ttfb),
          horizontal_overflow: pageInfo.horizontalOverflow,
        };
      } catch (error) {
        addFinding({ category: 'availability', severity: 'critical', title: 'Page navigation failed', page: route, message: error instanceof Error ? error.message.slice(0, 500) : 'Unknown navigation error' });
      } finally {
        await page.close().catch(() => {});
      }
    }

    await context.close();
  }
} catch (error) {
  addFinding({ category: 'audit_runner', severity: 'critical', title: 'Browser audit could not run', page: baseUrl, message: error instanceof Error ? error.message.slice(0, 700) : 'Unknown browser error' });
} finally {
  if (browser) await browser.close().catch(() => {});
}

metrics.average_lcp_ms = lcpValues.length
  ? Math.round(lcpValues.reduce((sum, value) => sum + value, 0) / lcpValues.length)
  : null;

const weights = { critical: 35, high: 20, medium: 8, low: 2 };
const deductions = findings.reduce((sum, finding) => sum + (weights[finding.severity] || 0), 0);
const healthScore = Math.max(0, 100 - Math.min(100, deductions));
const criticalCount = findings.filter(item => item.severity === 'critical').length;
const highCount = findings.filter(item => item.severity === 'high').length;
const status = criticalCount || highCount ? 'partial' : 'completed';
const completedAt = new Date().toISOString();
const summary = findings.length
  ? `Checked ${metrics.pages_checked} page/device combinations and found ${findings.length} issue(s), including ${criticalCount} critical and ${highCount} high-severity issue(s).`
  : `Checked ${metrics.pages_checked} page/device combinations. No blocking website issues were detected.`;

const report = {
  run_id: process.env.GITHUB_RUN_ID ? `github-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || '1'}` : crypto.randomUUID(),
  status,
  trigger_source: triggerSource,
  started_at: startedAt,
  completed_at: completedAt,
  health_score: healthScore,
  summary,
  findings,
  metrics,
  fix_status: findings.length ? 'not_attempted' : 'no_fix_needed',
  fix_branch: null,
  fix_pr_url: null,
  deployment_url: null,
};

await writeFile(outputPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ health_score: healthScore, findings: findings.length, summary, output: outputPath }, null, 2));
