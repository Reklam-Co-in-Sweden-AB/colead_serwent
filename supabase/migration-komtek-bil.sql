-- Migrasjon: Legg til bil-kolonne på komtek-tømminger for produksjonsdashboard per bil/operatør
-- Kjøres i Supabase SQL Editor

alter table public.serwent_komtek_tomming
  add column if not exists bil text;

create index if not exists idx_komtek_tomming_bil
  on public.serwent_komtek_tomming (kommune, aar, bil);

create index if not exists idx_komtek_tomming_tommer
  on public.serwent_komtek_tomming (kommune, aar, tommer);
