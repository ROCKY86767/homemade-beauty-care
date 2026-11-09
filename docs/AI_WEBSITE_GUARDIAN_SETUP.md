# AI Website Guardian setup

This feature is intentionally isolated on the `feature/ai-website-guardian` branch.

## What it does

- Runs a production-site browser audit every six hours (and supports manual workflow dispatch).
- Builds the current Vite application and checks public routes on desktop and mobile with Playwright.
- Records page availability, JavaScript errors, first-party request failures, mobile horizontal overflow, and LCP/TTFB measurements.
- Uses Gemini only when findings exist and the API key is configured.
- Allows Gemini to propose changes only in a small allowlist of public UI files. Checkout, cart, orders, payments, authentication, admin, Supabase configuration, database migrations, environment files, and package manifests are excluded.
- Rebuilds and re-audits the generated changes. A regression prevents a pull request.
- Opens a separate GitHub pull request for review. It never pushes directly to `main` or merges into production.
- Stores the audit history in the private `ai_guardian_reports` table for the Admin Dashboard.

## One-time setup after reviewing the Preview

1. Apply `supabase/migrations/20261108120000_create_ai_guardian_reports.sql` to the Homemade Beauty Care Supabase project.
2. Deploy the new Edge Function:
   `supabase functions deploy ai-guardian-report --project-ref ccowyndqzlkpilygpepx`
3. Generate a long random secret (for example, `openssl rand -hex 32`). Set it as the Supabase Edge Function secret named `AI_GUARDIAN_INGEST_SECRET`.
4. Add the same value as a GitHub Actions repository secret named `AI_GUARDIAN_INGEST_SECRET`.
5. Add a Google AI Studio API key as a GitHub Actions repository secret named `GEMINI_API_KEY`.
6. Optional: set the GitHub Actions repository variable `AI_GUARDIAN_AUTO_FIX` to `false` to pause AI code changes while keeping scheduled audits active. It defaults to `true`.

Secrets are never committed to the repository. Do not paste API keys or service-role keys into source files or chat.

## Free-tier and usage notes

GitHub Actions usage, Gemini API quota, Supabase Edge Function/database limits, and Vercel Preview deployment limits are controlled by their respective providers. The audit is scheduled every six hours, but free-tier quotas and provider availability can delay or pause runs. Gemini is called only when the audit finds issues and the key is configured.

## Safety and release policy

AI-generated code changes are restricted to the public UI allowlist, checked with a build and a second browser audit, and submitted as a pull request. A human review of the Vercel Preview is still required before merging to `main`, preserving the site's existing release rule. The first version does not automatically modify customer/order data or production database schemas.

## Checkout, performance, and instant alerts

- Each scheduled audit runs a read-only checkout smoke test on desktop and mobile. It seeds a disposable browser-only cart, verifies the checkout form and required-field validation, and asserts that the `create_guest_order` RPC is never called. It does not create a real order, reserve stock, or initiate payment.
- Performance reports now include average LCP, CLS, and TTFB values across the audited routes and device profiles. Per-route values are retained in each report's metrics JSON and can be compared in the Admin Guardian history.
- Email alerts are sent only when the audit reports findings or a non-completed status. Healthy audits do not send email.

### Enable email alerts (one-time)

1. Create a Resend account and verify a sender domain/address there.
2. Add the Resend API key as a GitHub Actions repository secret named `RESEND_API_KEY`.
3. Add these GitHub Actions repository variables:
   - `AI_GUARDIAN_ALERT_TO`: the email address that should receive website alerts.
   - `AI_GUARDIAN_ALERT_FROM`: the verified sender, for example `Website Guardian <alerts@your-verified-domain.com>`.
4. Run the workflow manually once and confirm that a test finding or an actual detected issue results in an email. Normal healthy runs remain silent.

If the Resend credentials are not configured, audits and dashboard reporting continue normally and the email step is skipped.
