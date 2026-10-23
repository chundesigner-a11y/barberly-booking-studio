-- M0: profiles.role stub (one row per auth user, role copied from sign-up metadata)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'customer' check (role in ('customer','shop','admin')),
  bank_account_name   text,
  bank_account_number text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'role',''), 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, email, role)
select u.id, u.email, coalesce(nullif(u.raw_user_meta_data->>'role',''), 'shop')
from auth.users u
on conflict (id) do nothing;
