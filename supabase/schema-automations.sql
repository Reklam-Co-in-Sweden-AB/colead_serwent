-- Serwent Automations & Messaging
-- Run this in Supabase SQL Editor AFTER schema.sql and schema-forms.sql

-- ════════════════════════════════════════════════════
-- MESSAGE TEMPLATES
-- ════════════════════════════════════════════════════

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('sms', 'email')),
  recipient_type text not null default 'customer' check (recipient_type in ('customer', 'company')),
  subject text,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger message_templates_updated_at
  before update on public.message_templates
  for each row execute function public.update_updated_at();

-- ════════════════════════════════════════════════════
-- MESSAGES (outgoing log)
-- ════════════════════════════════════════════════════

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  template_id uuid references public.message_templates(id),
  channel text not null check (channel in ('sms', 'email')),
  recipient text not null,
  subject text,
  body text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_order_id on public.messages (order_id);

-- ════════════════════════════════════════════════════
-- AUTOMATIONS
-- ════════════════════════════════════════════════════

create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  enabled boolean not null default true,
  trigger_type text not null check (trigger_type in ('new_order', 'status_change')),
  trigger_config jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger automations_updated_at
  before update on public.automations
  for each row execute function public.update_updated_at();

-- ════════════════════════════════════════════════════
-- AUTOMATION ACTIONS
-- ════════════════════════════════════════════════════

create table if not exists public.automation_actions (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  action_type text not null check (action_type in ('send_sms', 'send_email', 'change_status', 'webhook')),
  action_config jsonb default '{}',
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_automation_actions_automation_id on public.automation_actions (automation_id, position);

-- ════════════════════════════════════════════════════
-- AUTOMATION LOGS
-- ════════════════════════════════════════════════════

create table if not exists public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  automation_id uuid not null references public.automations(id) on delete cascade,
  order_id uuid references public.orders(id),
  status text not null check (status in ('success', 'failed')),
  details text,
  created_at timestamptz not null default now()
);

create index if not exists idx_automation_logs_automation_id on public.automation_logs (automation_id);

-- ════════════════════════════════════════════════════
-- RLS POLICIES
-- ════════════════════════════════════════════════════

alter table public.message_templates enable row level security;
alter table public.messages enable row level security;
alter table public.automations enable row level security;
alter table public.automation_actions enable row level security;
alter table public.automation_logs enable row level security;

-- Authenticated users full access
create policy "Auth manage templates" on public.message_templates for all to authenticated using (true) with check (true);
create policy "Auth manage messages" on public.messages for all to authenticated using (true) with check (true);
create policy "Auth manage automations" on public.automations for all to authenticated using (true) with check (true);
create policy "Auth manage automation_actions" on public.automation_actions for all to authenticated using (true) with check (true);
create policy "Auth manage automation_logs" on public.automation_logs for all to authenticated using (true) with check (true);

-- Service role full access
create policy "Service templates" on public.message_templates for all using (true) with check (true);
create policy "Service messages" on public.messages for all using (true) with check (true);
create policy "Service automations" on public.automations for all using (true) with check (true);
create policy "Service automation_actions" on public.automation_actions for all using (true) with check (true);
create policy "Service automation_logs" on public.automation_logs for all using (true) with check (true);
