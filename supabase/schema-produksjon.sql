-- Serwent Produksjon & Ruteplanlegger — databasschema
-- Tre nya tabeller för soner, ruteplaner och produksjonsdata

-- Soner (tömningsområden per kommun)
create table if not exists public.serwent_soner (
  id uuid primary key default gen_random_uuid(),
  kommune text not null,
  navn text not null,
  farge text not null default '#1B3A6B',
  sort_order integer not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_soner_kommune on public.serwent_soner (kommune);

-- Ruteplan (planerade tömningar per sone, år och vecka)
create table if not exists public.serwent_ruteplan (
  id uuid primary key default gen_random_uuid(),
  sone_id uuid not null references public.serwent_soner(id) on delete cascade,
  aar integer not null,
  uke integer not null check (uke between 1 and 53),
  planlagt integer not null default 0,
  status text not null default 'Utkast' check (status in ('Utkast', 'Publisert')),
  created_at timestamptz not null default now(),
  unique(sone_id, aar, uke)
);

create index if not exists idx_ruteplan_sone_aar on public.serwent_ruteplan (sone_id, aar);
create index if not exists idx_ruteplan_aar_status on public.serwent_ruteplan (aar, status);

-- Produksjon (registrerade utförda tömningar per sone, år och vecka)
create table if not exists public.serwent_produksjon (
  id uuid primary key default gen_random_uuid(),
  sone_id uuid not null references public.serwent_soner(id) on delete cascade,
  aar integer not null,
  uke integer not null check (uke between 1 and 53),
  kjort_rute integer not null default 0,
  kjort_best integer not null default 0,
  registrert_av text,
  oppdatert timestamptz not null default now(),
  unique(sone_id, aar, uke)
);

create index if not exists idx_produksjon_sone_aar on public.serwent_produksjon (sone_id, aar);

-- RLS — dessa tabeller är admin-only
alter table public.serwent_soner enable row level security;
alter table public.serwent_ruteplan enable row level security;
alter table public.serwent_produksjon enable row level security;

-- Autentiserade användare (admin) har full åtkomst
create policy "Authenticated full access soner"
  on public.serwent_soner for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access ruteplan"
  on public.serwent_ruteplan for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access produksjon"
  on public.serwent_produksjon for all to authenticated
  using (true) with check (true);

-- Service role full access (för server-side operationer)
create policy "Service role soner"
  on public.serwent_soner for all
  using (true) with check (true);

create policy "Service role ruteplan"
  on public.serwent_ruteplan for all
  using (true) with check (true);

create policy "Service role produksjon"
  on public.serwent_produksjon for all
  using (true) with check (true);
