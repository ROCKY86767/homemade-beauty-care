import { readFile } from 'node:fs/promises';

const reportPath = 'ai-guardian-report.json';
const apiKey = process.env.RESEND_API_KEY || '';
const to = process.env.AI_GUARDIAN_ALERT_TO || '';
const from = process.env.AI_GUARDIAN_ALERT_FROM || '';

if (!apiKey || !to || !from) {
  console.log('Instant email alert skipped: configure RESEND_API_KEY, AI_GUARDIAN_ALERT_TO, and AI_GUARDIAN_ALERT_FROM in GitHub Actions.');
  process.exit(0);
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const findings = Array.isArray(report.findings) ? report.findings : [];
if (report.status === 'completed' && findings.length === 0) {
  console.log('No website issues detected; no alert email is needed.');
  process.exit(0);
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const findingRows = findings.slice(0, 20).map(item =>
  `<li><strong>${escapeHtml(item.severity)} — ${escapeHtml(item.title || item.category)}</strong><br>${escapeHtml(item.page || '')}<br>${escapeHtml(item.message || '')}</li>`
).join('');
const checkout = report.metrics?.checkout_test;
const subject = `[Homemade Beauty Care] Website alert — health ${report.health_score ?? 'unknown'}/100`;
const html = `
  <h2>AI Website Guardian detected an issue</h2>
  <p><strong>Health score:</strong> ${escapeHtml(report.health_score ?? 'Not available')}/100</p>
  <p>${escapeHtml(report.summary || 'The latest audit needs attention.')}</p>
  <p><strong>Checkout test:</strong> ${escapeHtml(checkout?.status || 'Not available')}</p>
  <p><strong>Average LCP:</strong> ${escapeHtml(report.metrics?.average_lcp_ms ?? 'N/A')} ms ·
     <strong>CLS:</strong> ${escapeHtml(report.metrics?.average_cls ?? 'N/A')} ·
     <strong>TTFB:</strong> ${escapeHtml(report.metrics?.average_ttfb_ms ?? 'N/A')} ms</p>
  <h3>Findings</h3><ol>${findingRows || '<li>Audit failed before findings could be collected.</li>'}</ol>
  <p>Review the AI Website Guardian report in the Admin Panel and the GitHub Actions run before making production changes.</p>
`;

const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
  body: JSON.stringify({ from, to: [to], subject, html }),
});
const result = await response.json().catch(() => ({}));
if (!response.ok) {
  throw new Error(`Resend email request failed: HTTP ${response.status} ${JSON.stringify(result).slice(0, 500)}`);
}
console.log(`Instant alert email accepted by Resend: ${result.id || 'message id unavailable'}`);
