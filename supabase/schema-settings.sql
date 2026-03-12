-- Serwent Bestilling — Site Settings Schema
-- Kör detta i Supabase SQL Editor

-- Inställningstabell (nyckel-värde med JSONB)
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Auto-uppdatera updated_at
create trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.update_updated_at();

-- RLS
alter table public.site_settings enable row level security;

-- Alla kan läsa inställningar (behövs för publika sidan)
create policy "Anyone can read settings"
  on public.site_settings for select
  using (true);

-- Bara autentiserade användare kan ändra
create policy "Authenticated users can insert settings"
  on public.site_settings for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update settings"
  on public.site_settings for update
  to authenticated
  using (true)
  with check (true);

-- Skapa storage bucket för loggor
insert into storage.buckets (id, name, public)
  values ('logos', 'logos', true)
  on conflict do nothing;

-- Tillåt autentiserade användare att ladda upp loggor
create policy "Authenticated users can upload logos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos');

create policy "Authenticated users can update logos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos');

create policy "Authenticated users can delete logos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos');

-- Alla kan läsa loggor (publikt)
create policy "Anyone can view logos"
  on storage.objects for select
  using (bucket_id = 'logos');
