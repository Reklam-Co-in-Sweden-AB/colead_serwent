-- Formulärvisningar — spårar varje visning av bestillingsformuläret
create table if not exists public.serwent_form_views (
  id uuid primary key default gen_random_uuid(),
  form_id text,
  session_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  fbclid text,
  gclid text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_form_views_created on public.serwent_form_views (created_at desc);
create index if not exists idx_form_views_session on public.serwent_form_views (session_id);

-- Konverteringshändelser — spårar inskickade formulär
create table if not exists public.serwent_conversions (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  session_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  fbclid text,
  gclid text,
  meta_sent boolean not null default false,
  google_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_conversions_created on public.serwent_conversions (created_at desc);
create index if not exists idx_conversions_order on public.serwent_conversions (order_id);

-- RLS
alter table public.serwent_form_views enable row level security;
alter table public.serwent_conversions enable row level security;

create policy "Authenticated full access form_views"
  on public.serwent_form_views for all to authenticated
  using (true) with check (true);

create policy "Service role form_views"
  on public.serwent_form_views for all
  using (true) with check (true);

create policy "Authenticated full access conversions"
  on public.serwent_conversions for all to authenticated
  using (true) with check (true);

create policy "Service role conversions"
  on public.serwent_conversions for all
  using (true) with check (true);
