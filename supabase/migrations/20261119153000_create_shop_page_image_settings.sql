create table if not exists public.shop_page_settings (
  id integer primary key default 1 check (id = 1),
  desktop_image_url text,
  mobile_image_url text,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.shop_page_settings enable row level security;

grant select on public.shop_page_settings to anon;
grant select, insert, update on public.shop_page_settings to authenticated;

drop policy if exists "Anyone can view active shop page image" on public.shop_page_settings;
create policy "Anyone can view active shop page image"
on public.shop_page_settings for select
to anon
using (is_active = true);

drop policy if exists "Staff can view shop page image settings" on public.shop_page_settings;
create policy "Staff can view shop page image settings"
on public.shop_page_settings for select
to authenticated
using (has_staff_permission('banners'));

drop policy if exists "Staff can insert shop page image settings" on public.shop_page_settings;
create policy "Staff can insert shop page image settings"
on public.shop_page_settings for insert
to authenticated
with check (has_staff_permission('banners'));

drop policy if exists "Staff can update shop page image settings" on public.shop_page_settings;
create policy "Staff can update shop page image settings"
on public.shop_page_settings for update
to authenticated
using (has_staff_permission('banners'))
with check (has_staff_permission('banners'));

insert into public.shop_page_settings (id, is_active)
values (1, false)
on conflict (id) do nothing;
