-- Migrasjon: Legg til gruppefelt på soner for å samle flere roter (f.eks. Biri 1–6 under "Sone 1")
-- Kjøres i Supabase SQL Editor

alter table public.serwent_soner
  add column if not exists gruppe text;

create index if not exists idx_soner_kommune_gruppe
  on public.serwent_soner (kommune, gruppe);
