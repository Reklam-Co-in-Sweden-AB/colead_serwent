-- Migrasjon: Marker ordrer som "ekstra tømming" automatisk basert på tidligere tømming på samme adresse.
-- Flagget settes ved innsending (logic i /api/orders/submit).

alter table public.orders
  add column if not exists er_ekstra boolean not null default false,
  add column if not exists ekstra_grunn text;

create index if not exists idx_orders_er_ekstra on public.orders (er_ekstra) where er_ekstra = true;
