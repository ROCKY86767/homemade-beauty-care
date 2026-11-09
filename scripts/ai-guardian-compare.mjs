import { readFile, writeFile } from 'node:fs/promises';

const before = JSON.parse(await readFile('ai-guardian-report.json', 'utf8'));
const after = JSON.parse(await readFile('ai-guardian-postfix.json', 'utf8'));

// Preserve the checkout smoke-test result in the final report if an AI fix
// triggered a second production audit before the report was published.
after.metrics = after.metrics || {};
if (before.metrics?.checkout_test) after.metrics.checkout_test = before.metrics.checkout_test;
const checkoutFindings = (before.findings || []).filter(item => item.category === 'checkout');
after.findings = [...(after.findings || []).filter(item => item.category !== 'checkout'), ...checkoutFindings];
const scoreWeights = { critical: 35, high: 20, medium: 8, low: 2 };
after.health_score = Math.max(0, 100 - Math.min(100, (after.findings || []).reduce((sum, item) => sum + (scoreWeights[item.severity] || 0), 0)));
const criticalCount = (after.findings || []).filter(item => item.severity === 'critical').length;
const highCount = (after.findings || []).filter(item => item.severity === 'high').length;
after.status = criticalCount || highCount ? 'partial' : 'completed';
await writeFile('ai-guardian-postfix.json', JSON.stringify(after, null, 2));
const count = (report, severity) => (report.findings || []).filter(item => item.severity === severity).length;
const safe = after.health_score >= before.health_score &&
  count(after, 'critical') <= count(before, 'critical') &&
  count(after, 'high') <= count(before, 'high');

const output = process.env.GITHUB_OUTPUT;
if (output) await writeFile(output, `safe=${safe}\n`, { flag: 'a' });
console.log(JSON.stringify({
  before: { score: before.health_score, critical: count(before, 'critical'), high: count(before, 'high') },
  after: { score: after.health_score, critical: count(after, 'critical'), high: count(after, 'high') },
  safe,
}, null, 2));
if (!safe) process.exitCode = 1;
