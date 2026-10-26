alter table public.site_visitor_presence add column if not exists ip_address text;
alter table public.site_page_view_events add column if not exists ip_address text;
alter table public.site_visitor_journey_events add column if not exists ip_address text;
create index if not exists idx_site_visitor_presence_ip_last_seen on public.site_visitor_presence (ip_address, last_seen_at desc);
create index if not exists idx_site_visitor_journey_ip_created on public.site_visitor_journey_events (ip_address, created_at desc);
create index if not exists idx_site_page_view_ip_created on public.site_page_view_events (ip_address, created_at desc);
