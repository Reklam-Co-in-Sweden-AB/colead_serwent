-- Komtek enskilda tömningar — sparar alla rader från importerade filer
create table if not exists public.serwent_komtek_tomming (
  id uuid primary key default gen_random_uuid(),
  sone_id uuid not null references public.serwent_soner(id) on delete cascade,
  kommune text not null,
  aar integer not null,
  uke integer not null,
  tomme_dato timestamptz not null,
  kunde text,
  adresse text,
  postnummer text,
  poststed text,
  eiendom text,
  anleggstype text,
  type_tomming text,
  tomme_volum numeric,
  tommer text,
  avvik text,
  rodenavn text not null,
  import_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_komtek_tomming_sone_uke on public.serwent_komtek_tomming (sone_id, aar, uke);
create index if not exists idx_komtek_tomming_import on public.serwent_komtek_tomming (import_id);

alter table public.serwent_komtek_tomming enable row level security;

create policy "Authenticated full access komtek_tomming"
  on public.serwent_komtek_tomming for all to authenticated
  using (true) with check (true);

create policy "Service role komtek_tomming"
  on public.serwent_komtek_tomming for all
  using (true) with check (true);

-- Komtek importlogg — spårar alla importer från Komtek
create table if not exists public.serwent_komtek_log (
  id uuid primary key default gen_random_uuid(),
  kommune text not null,
  filnamn text not null,
  total_rader integer not null default 0,
  importerade integer not null default 0,
  hoppade_over integer not null default 0,
  sone_uker integer not null default 0,
  skapade_soner text[] not null default '{}',
  soner text[] not null default '{}',
  period_fra date,
  period_til date,
  importert_av text,
  created_at timestamptz not null default now()
);

create index if not exists idx_komtek_log_kommune on public.serwent_komtek_log (kommune);
create index if not exists idx_komtek_log_created on public.serwent_komtek_log (created_at desc);

-- RLS
alter table public.serwent_komtek_log enable row level security;

create policy "Authenticated full access komtek_log"
  on public.serwent_komtek_log for all to authenticated
  using (true) with check (true);

create policy "Service role komtek_log"
  on public.serwent_komtek_log for all
  using (true) with check (true);
