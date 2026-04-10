-- Lägg till koordinater i orders-tabellen
alter table public.orders add column if not exists lat numeric;
alter table public.orders add column if not exists lng numeric;
