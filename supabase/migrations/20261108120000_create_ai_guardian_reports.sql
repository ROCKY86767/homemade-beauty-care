-- AI Website Guardian: private audit history for the admin dashboard.
create table if not exists public.ai_guardian_reports (
  id uuid primary key default gen_random_uuid(),
  run_id text not null unique,
  status text not null default 'completed'
    check (status in ('completed', 'failed', 'partial')),
  trigger_source text not null default 'schedule',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  health_score integer check (health_score between 0 and 100),
  summary text not null default '',
  findings jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  fix_status text not null default 'not_attempted'
    check (fix_status in ('not_attempted', 'no_fix_needed', 'pr_created', 'failed', 'skipped')),
  fix_branch text,
  fix_pr_url text,
  deployment_url text,
  created_at timestamptz not null default now()
);

create index if not exists ai_guardian_reports_created_at_idx
  on public.ai_guardian_reports (created_at desc);

alter table public.ai_guardian_reports enable row level security;

revoke all on table public.ai_guardian_reports from anon, authenticated;
grant select on table public.ai_guardian_reports to authenticated;
grant all on table public.ai_guardian_reports to service_role;

drop policy if exists "Admins can read AI Guardian reports" on public.ai_guardian_reports;
create policy "Admins can read AI Guardian reports"
  on public.ai_guardian_reports
  for select
  to authenticated
  using (public.is_admin_user());

comment on table public.ai_guardian_reports is
  'Private AI Website Guardian audit history. Reports contain technical findings only; no customer/order data.';
