-- Serwent Forms — Dynamic form configuration
-- Run this in Supabase SQL Editor AFTER schema.sql

-- Forms table
create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  headline text,
  description text,
  thank_you_title text default 'Bestilling mottatt',
  thank_you_message text default 'Din bestilling er mottatt og vil bli håndtert av vårt serviceteam.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Form steps
create table if not exists public.form_steps (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  title text not null,
  description text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Form fields
create table if not exists public.form_fields (
  id uuid primary key default gen_random_uuid(),
  step_id uuid not null references public.form_steps(id) on delete cascade,
  field_type text not null check (field_type in ('text', 'email', 'phone', 'textarea', 'number', 'select', 'radio', 'checkbox', 'address_lookup')),
  label text not null,
  placeholder text,
  required boolean not null default false,
  options jsonb,
  position int not null default 0,
  mapping text check (mapping in ('navn', 'epost', 'telefon', 'adresse', 'gnr', 'bnr', 'kommune', 'tomming_type', 'kommentar')),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_form_steps_form_id on public.form_steps (form_id, position);
create index if not exists idx_form_fields_step_id on public.form_fields (step_id, position);

-- Triggers
create trigger forms_updated_at
  before update on public.forms
  for each row execute function public.update_updated_at();

-- RLS
alter table public.forms enable row level security;
alter table public.form_steps enable row level security;
alter table public.form_fields enable row level security;

-- Published forms readable by everyone (for public rendering)
create policy "Published forms are public" on public.forms for select using (status = 'published');
create policy "Auth users manage forms" on public.forms for all to authenticated using (true) with check (true);
create policy "Steps of published forms are public" on public.form_steps for select using (
  exists (select 1 from public.forms where id = form_id and status = 'published')
);
create policy "Auth users manage steps" on public.form_steps for all to authenticated using (true) with check (true);
create policy "Fields of published forms are public" on public.form_fields for select using (
  exists (select 1 from public.form_steps s join public.forms f on f.id = s.form_id where s.id = step_id and f.status = 'published')
);
create policy "Auth users manage fields" on public.form_fields for all to authenticated using (true) with check (true);
-- Service role full access
create policy "Service role forms" on public.forms for all using (true) with check (true);
create policy "Service role steps" on public.form_steps for all using (true) with check (true);
create policy "Service role fields" on public.form_fields for all using (true) with check (true);

-- Update orders table to reference form
alter table public.orders add column if not exists form_id uuid references public.forms(id);

-- ════════════════════════════════════════════════════
-- SEED: Default Serwent bestillingsskjema
-- ════════════════════════════════════════════════════

insert into public.forms (id, name, slug, status, headline, description, thank_you_title, thank_you_message)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Bestillingstømming',
  'bestilling',
  'published',
  'Bestill tømming',
  'Fyll ut skjemaet nedenfor for å bestille slamsuging eller septiktømming.',
  'Bestilling mottatt',
  'Din bestilling er mottatt og vil bli håndtert av vårt serviceteam. Tømming vil bli utført iht. tidsfrister satt i rammeverk mellom oppdragsgiver og kommune, for den aktuelle tømmingen.'
);

-- Steg 1: Tjeneste
insert into public.form_steps (id, form_id, title, description, position)
values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Velg tjeneste', 'Velg kommune og type tømming', 0);

insert into public.form_fields (step_id, field_type, label, placeholder, required, options, position, mapping) values
('b0000000-0000-0000-0000-000000000001', 'select', 'Kommune', '– Velg –', true,
 '[{"value":"Vestre Toten","label":"Vestre Toten"},{"value":"Østre Toten","label":"Østre Toten"},{"value":"Nordre Land","label":"Nordre Land"},{"value":"Søndre Land","label":"Søndre Land"},{"value":"Stange","label":"Stange"},{"value":"Lillehammer","label":"Lillehammer"},{"value":"Gjøvik","label":"Gjøvik"},{"value":"Gausdal","label":"Gausdal"},{"value":"Øyer","label":"Øyer"}]',
 0, 'kommune'),
('b0000000-0000-0000-0000-000000000001', 'select', 'Type tømming', '– Velg –', true,
 '[{"value":"Lukket tank","label":"Lukket tank"},{"value":"Lukket tank ekstratømming (ekstra kostnader vil påløpe)","label":"Lukket tank ekstratømming"},{"value":"Slamavskiller / Infiltrasjonsanlegg","label":"Slamavskiller / Infiltrasjonsanlegg"},{"value":"Slamavskiller ekstratømming (ekstra kostnader vil påløpe)","label":"Slamavskiller ekstratømming"},{"value":"Minirenseanlegg","label":"Minirenseanlegg"},{"value":"Saneringstømming med rengjøring","label":"Saneringstømming med rengjøring"},{"value":"Saneringstømming uten rengjøring","label":"Saneringstømming uten rengjøring"},{"value":"Nødtømming (ekstra kostnader vil påløpe)","label":"Nødtømming"},{"value":"Tømming av delvis koblet anlegg","label":"Tømming av delvis koblet anlegg"}]',
 1, 'tomming_type');

-- Steg 2: Kontaktinfo
insert into public.form_steps (id, form_id, title, description, position)
values ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Kontaktinformasjon', 'Fyll inn dine opplysninger', 1);

insert into public.form_fields (step_id, field_type, label, placeholder, required, position, mapping) values
('b0000000-0000-0000-0000-000000000002', 'text', 'Fullt navn', 'Ola Nordmann', true, 0, 'navn'),
('b0000000-0000-0000-0000-000000000002', 'email', 'E-postadresse', 'din@epost.no', true, 1, 'epost'),
('b0000000-0000-0000-0000-000000000002', 'phone', 'Telefon', '12345678', true, 2, 'telefon');

-- Steg 3: Adresse
insert into public.form_steps (id, form_id, title, description, position)
values ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Anleggsadresse', 'Oppgi adresse for tømming', 2);

insert into public.form_fields (step_id, field_type, label, placeholder, required, position, mapping) values
('b0000000-0000-0000-0000-000000000003', 'address_lookup', 'Anleggsadresse', 'Søk adresse...', true, 0, 'adresse'),
('b0000000-0000-0000-0000-000000000003', 'text', 'Gnr', '', true, 1, 'gnr'),
('b0000000-0000-0000-0000-000000000003', 'text', 'Bnr', '', true, 2, 'bnr'),
('b0000000-0000-0000-0000-000000000003', 'textarea', 'Kommentar', 'Eventuell kommentar...', false, 3, 'kommentar');
