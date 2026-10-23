-- M2.1: versioned commission ratio (the rate for a booking = greatest effective_from <= paid_at).
-- No transactions table and no fee columns on bookings — the split is computed at payout-build time (M2.2).
create table if not exists public.commission_rates (
  id             uuid primary key default gen_random_uuid(),
  effective_from date not null unique,
  platform_pct   numeric(5,4) not null check (platform_pct >= 0 and platform_pct < 1),
  note           text
);
insert into public.commission_rates (effective_from, platform_pct, note)
  values ('2026-01-01', 0.20, 'default 20% platform / 80% shop')
  on conflict (effective_from) do nothing;

alter table public.commission_rates enable row level security;
create policy "commission_rates_select_public" on public.commission_rates for select using (true);
create policy "commission_rates_write_admin"  on public.commission_rates for all using (public.is_admin()) with check (public.is_admin());

-- Reconciliation pointer + idempotency backstop stamped by the webhook.
alter table public.bookings add column if not exists stripe_payment_intent_id text;
create unique index if not exists uniq_bookings_pi on public.bookings(stripe_payment_intent_id);

-- Guards: also treat the service_role DB role (server functions using the secret key) as trusted,
-- and once money exists, customers may only cancel UNPAID bookings (refunds are a separate v2 flow).
create or replace function public.guard_booking_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.customer_id is distinct from old.customer_id
     or new.service_id is distinct from old.service_id
     or new.price      is distinct from old.price
     or new.paid_at    is distinct from old.paid_at
     or new.payout_id  is distinct from old.payout_id
     or new.created_at is distinct from old.created_at
     or new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id then
    raise exception 'only the booking status can be changed here';
  end if;
  if new.status is distinct from old.status
     and not (new.status = 'cancelled' and old.status = 'pending_payment') then
    raise exception 'only an unpaid booking can be cancelled here';
  end if;
  return new;
end; $$;

create or replace function public.guard_profile_role()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if coalesce(auth.role(), '') = 'service_role'
       or current_user in ('postgres', 'supabase_admin', 'service_role') then
      return new;
    end if;
    if old.role = 'customer' and new.role = 'shop' then
      return new;
    end if;
    raise exception 'role change from % to % is not allowed', old.role, new.role;
  end if;
  return new;
end; $$;

revoke execute on function public.guard_booking_update() from public, anon, authenticated;
revoke execute on function public.guard_profile_role() from public, anon, authenticated;
