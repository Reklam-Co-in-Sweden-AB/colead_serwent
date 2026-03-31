-- Serwent Bestilling — Database Schema
-- Run this in Supabase SQL Editor

-- Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text unique not null,
  kommune text not null,
  tomming_type text not null,
  navn text not null,
  epost text not null,
  telefon text not null,
  adresse text not null,
  gnr text not null,
  bnr text not null,
  kommentar text,
  intern_kommentar text,
  status text not null default 'ny' check (status in ('ny', 'under_behandling', 'utfort')),
  colead_synced boolean not null default false,
  colead_lead_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for faster lookups
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_gnr_bnr on public.orders (gnr, bnr, kommune);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at();

-- RLS policies
alter table public.orders enable row level security;

-- Allow service_role full access (used by API routes)
-- Anon users can only insert (public form submission)
create policy "Service role has full access"
  on public.orders for all
  using (true)
  with check (true);

-- Allow anon to insert orders (public form)
create policy "Anyone can submit orders"
  on public.orders for insert
  to anon
  with check (true);

-- Authenticated users can read and update (admin panel)
create policy "Authenticated users can read orders"
  on public.orders for select
  to authenticated
  using (true);

create policy "Authenticated users can update orders"
  on public.orders for update
  to authenticated
  using (true)
  with check (true);
