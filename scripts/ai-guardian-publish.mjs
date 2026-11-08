import { readFile } from 'node:fs/promises';

const file = process.env.AI_GUARDIAN_REPORT_FILE || 'ai-guardian-report.json';
const report = JSON.parse(await readFile(file, 'utf8'));
const secret = process.env.AI_GUARDIAN_INGEST_SECRET || '';
const endpoint = process.env.AI_GUARDIAN_INGEST_URL || '';
report.fix_status = process.env.AI_GUARDIAN_FIX_STATUS || report.fix_status || 'not_attempted';
report.fix_branch = process.env.AI_GUARDIAN_FIX_BRANCH || null;
report.fix_pr_url = process.env.AI_GUARDIAN_PR_URL || null;

if (!secret || !endpoint) {
  console.log('AI Guardian report upload skipped: dashboard ingest secrets are not configured yet.');
  process.exit(0);
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-ai-guardian-secret': secret },
  body: JSON.stringify(report),
});
const result = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(`Dashboard report upload failed: HTTP ${response.status} ${JSON.stringify(result)}`);
  process.exitCode = 1;
} else {
  console.log(`Dashboard report saved: ${result.run_id || report.run_id}`);
}
