-- Migrasjon: Lagre alle skjema-svar (label + verdi) per bestilling
-- Kjøres i Supabase SQL Editor
--
-- Løser problemet at verdier fra dynamiske skjemafelt uten "mapping"
-- forsvant helt ved submit (de ble sendt fra klienten men aldri lagret).

alter table public.orders
  add column if not exists form_svar jsonb;
