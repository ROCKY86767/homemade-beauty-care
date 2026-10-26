alter table public.site_visitor_presence add column if not exists city text;
alter table public.site_visitor_presence add column if not exists region text;
alter table public.site_visitor_presence add column if not exists country text;
alter table public.site_visitor_presence add column if not exists country_code text;

alter table public.site_page_view_events add column if not exists city text;
alter table public.site_page_view_events add column if not exists region text;
alter table public.site_page_view_events add column if not exists country text;
alter table public.site_page_view_events add column if not exists country_code text;

alter table public.site_visitor_journey_events add column if not exists city text;
alter table public.site_visitor_journey_events add column if not exists region text;
alter table public.site_visitor_journey_events add column if not exists country text;
alter table public.site_visitor_journey_events add column if not exists country_code text;
