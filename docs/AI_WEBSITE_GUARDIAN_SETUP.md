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
