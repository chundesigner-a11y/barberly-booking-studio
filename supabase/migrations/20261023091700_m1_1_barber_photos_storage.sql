-- M1.1: public-read barber-photos bucket; only the owning shop writes under <barber_id>/...
insert into storage.buckets (id, name, public)
values ('barber-photos','barber-photos', true)
on conflict (id) do update set public = true;

create policy "barber_photos_read" on storage.objects
  for select using ( bucket_id = 'barber-photos' );

create policy "barber_photos_write_own" on storage.objects
  for all using (
    bucket_id = 'barber-photos'
    and exists (
      select 1 from public.barbers s
      where s.shop_id = auth.uid()
        and s.id::text = split_part(storage.objects.name, '/', 1)
    )
  ) with check (
    bucket_id = 'barber-photos'
    and exists (
      select 1 from public.barbers s
      where s.shop_id = auth.uid()
        and s.id::text = split_part(storage.objects.name, '/', 1)
    )
  );
