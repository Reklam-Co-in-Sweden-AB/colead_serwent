-- Serwent Scheduled Automations
-- Kör detta i Supabase SQL Editor EFTER schema-automations.sql

-- ════════════════════════════════════════════════════
-- Utöka trigger_type med 'scheduled'
-- ════════════════════════════════════════════════════

-- Droppa gammal constraint och skapa ny med 'scheduled'
alter table public.automations
  drop constraint if exists automations_trigger_type_check;

alter table public.automations
  add constraint automations_trigger_type_check
  check (trigger_type in ('new_order', 'status_change', 'scheduled'));

-- Lägg till schemaläggningsfält
alter table public.automations
  add column if not exists last_run_at timestamptz,
  add column if not exists next_run_at timestamptz;

-- Index för cron-jobbet: hitta schemalagda automationer som ska köras
create index if not exists idx_automations_scheduled
  on public.automations (next_run_at)
  where trigger_type = 'scheduled' and enabled = true;
i