import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';

const baseUrl = (process.env.AI_GUARDIAN_BASE_URL || 'https://homemade-beauty-care.vercel.app').replace(/\/$/, '');
const reportPath = 'ai-guardian-report.json';
const report = JSON.parse(await readFile(reportPath, 'utf8'));
const profiles = [
  { name: 'desktop', viewport: { width: 1365, height: 900 }, isMobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true },
];
const results = [];
const findings = [];
let browser;

try {
  browser = await chromium.launch({ headless: true });
  for (const profile of profiles) {
    const context = await browser.newContext({ viewport: profile.viewport, isMobile: profile.isMobile });
    await context.addInitScript(() => {
      const product = {
        id: 'ai-guardian-checkout-smoke-test',
        name: 'Guardian Test Product',
        name_bn: 'Guardian Test Product',
        slug: 'guardian-test-product',
        price: 370,
        stock: 99,
        is_active: true,
        image_url: '',
      };
      localStorage.setItem('hbc_cart', JSON.stringify([{ product, quantity: 1 }]));
    });
    const page = await context.newPage();
    let orderRpcCalls = 0;
    page.on('request', request => {
      if (/\/rest\/v1\/rpc\/create_guest_order(?:\?|$)/i.test(request.url())) orderRpcCalls += 1;
    });

    try {
      const response = await page.goto(`${baseUrl}/checkout`, { waitUntil: 'domcontentloaded', timeout: 25000 });

      // The global header also contains a search form (hidden on mobile).
      // Identify checkout by its customer-facing submit button, not form order.
      const checkoutForm = page.locator('form').filter({
        has: page.getByRole('button', { name: /Place Order|অর্ডার নিশ্চিত করুন/i }),
      });
      await checkoutForm.waitFor({ state: 'visible', timeout: 20000 });
      const submitButton = checkoutForm.getByRole('button', { name: /Place Order|অর্ডার নিশ্চিত করুন/i });
      await submitButton.waitFor({ state: 'visible', timeout: 10000 });

      if (!response || response.status() >= 400) {
        throw new Error(`Checkout page returned HTTP ${response?.status() ?? 'no response'}.`);
      }

      // Bypass browser-native required-field blocking while still using the
      // browser's submit event so React's real onSubmit handler is exercised.
      await checkoutForm.evaluate(form => {
        form.noValidate = true;
        form.requestSubmit();
      });

      const validationMessage = checkoutForm.getByText(
        /Please fill in all required fields|প্রয়োজনীয় তথ্য পূরণ করুন/i
      );
      await validationMessage.waitFor({ state: 'visible', timeout: 5000 });

      if (orderRpcCalls !== 0) {
        throw new Error('Safety check failed: order-creation RPC was called during the smoke test.');
      }

      results.push({ device: profile.name, status: 'passed', validation: 'passed', order_rpc_calls: orderRpcCalls });
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : 'Unknown checkout test failure';
      results.push({ device: profile.name, status: 'failed', message, order_rpc_calls: orderRpcCalls });
      findings.push({
        category: 'checkout',
        severity: 'critical',
        title: 'Checkout smoke test failed',
        page: '/checkout',
        message: `${profile.name}: ${message}`,
      });
    } finally {
      await context.close();
    }
  }
} catch (error) {
  findings.push({
    category: 'checkout',
    severity: 'critical',
    title: 'Checkout test runner failed',
    page: '/checkout',
    message: error instanceof Error ? error.message.slice(0, 600) : 'Unknown checkout test runner error',
  });
} finally {
  if (browser) await browser.close().catch(() => {});
}

report.metrics.checkout_test = {
  status: findings.length ? 'failed' : 'passed',
  profiles: results,
  order_creation_rpc_calls: results.reduce((sum, result) => sum + result.order_rpc_calls, 0),
  real_orders_created: false,
};
report.findings = [...(report.findings || []), ...findings];
const weights = { critical: 35, high: 20, medium: 8, low: 2 };
report.health_score = Math.max(0, 100 - Math.min(100, report.findings.reduce((sum, item) => sum + (weights[item.severity] || 0), 0)));
const criticalCount = report.findings.filter(item => item.severity === 'critical').length;
const highCount = report.findings.filter(item => item.severity === 'high').length;
report.status = criticalCount || highCount ? 'partial' : 'completed';
report.summary = report.findings.length
  ? `Checked ${report.metrics.pages_checked} page/device combinations and ran checkout smoke tests on ${profiles.length} devices. Found ${report.findings.length} issue(s), including ${criticalCount} critical and ${highCount} high-severity issue(s).`
  : `Checked ${report.metrics.pages_checked} page/device combinations and checkout smoke tests on desktop and mobile. No blocking website issues were detected.`;
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.metrics.checkout_test, null, 2));
