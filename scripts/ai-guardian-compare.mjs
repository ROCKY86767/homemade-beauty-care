import { readFile, writeFile } from 'node:fs/promises';

const before = JSON.parse(await readFile('ai-guardian-report.json', 'utf8'));
const after = JSON.parse(await readFile('ai-guardian-postfix.json', 'utf8'));
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
