-- Lägg till planlagt_dato för planerat tömningsdatum
alter table public.orders add column if not exists planlagt_dato date;

-- Flytta framtida created_at till planlagt_dato och sätt created_at till importdatum
update public.orders
set planlagt_dato = created_at::date,
    created_at = updated_at
where created_at > now()
  and order_id like 'BES-IMP-%';
