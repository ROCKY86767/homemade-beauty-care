alter table public.reviews
  add column if not exists media_urls text[] not null default '{}';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-media',
  'review-media',
  true,
  31457280,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read review media" on storage.objects;
create policy "public read review media"
on storage.objects for select to public
using (bucket_id = 'review-media');

drop policy if exists "public upload review media" on storage.objects;
create policy "public upload review media"
on storage.objects for insert to anon, authenticated
with check (bucket_id = 'review-media');
