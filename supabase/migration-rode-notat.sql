-- Migrasjon: Rode-notater per sone og år (loggbok-stil)
--
-- Lar drift skrive flere anteckningar per sone under sesongen, slik at
-- erfaringer (snø, blött mark, adkomstproblem) fanges opp og er
-- tilgjengelige neste gang samme rute planlegges (typisk 24 mnd senere).
--
-- Kjøres i Supabase SQL Editor.

create table if not exists public.serwent_rode_notat (
  id uuid primary key default gen_random_uuid(),
  sone_id uuid not null references public.serwent_soner(id) on delete cascade,
  aar integer not null,
  notat text not null,
  forfatter text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rode_notat_sone_aar
  on public.serwent_rode_notat (sone_id, aar);

alter table public.serwent_rode_notat enable row level security;

create policy "Auth users read rode_notat"
  on public.serwent_rode_notat for select to authenticated using (true);

create policy "Auth users write rode_notat"
  on public.serwent_rode_notat for all to authenticated
  using (true) with check (true);

create policy "Service role rode_notat"
  on public.serwent_rode_notat for all using (true) with check (true);
