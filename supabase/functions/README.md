# Supabase Edge Functions

These function sources were synced from the active Homemade Beauty Care Supabase project on 2026-10-21 so the deployed backend is version-controlled alongside the website.

## Functions

- `integrations` — Pathao shipment actions and Meta Conversions API events.
- `order-management` — external order-management integrations, shipment/status sync and related order actions.
- `create-moderator` — creates a moderator through Supabase Auth after checking the caller's active admin access.

## Deployment settings

The `verify_jwt` values in `config.toml` reflect the current deployed configuration. The first two functions perform their own action-specific authentication/token checks, so do not change those settings without reviewing the request routing first. The moderator function requires a valid JWT.

## Secrets

Never commit credentials. These functions expect secrets in Supabase Vault / Edge Function environment variables. Keep Pathao, Meta CAPI, external order-management credentials, and the Supabase service-role key out of browser code and Git history.

## Important

The files were copied from the active project; they are now tracked in Git, but this commit does not redeploy or change the live Supabase functions. Test in Supabase before deploying future edits.
