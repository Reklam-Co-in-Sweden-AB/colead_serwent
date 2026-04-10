-- Användarprofiler med roller
-- Roller: bruker (standard), admin, super_admin
create table if not exists public.serwent_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'bruker' check (role in ('bruker', 'admin', 'super_admin')),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.serwent_profiles enable row level security;

-- Användare kan läsa sin egen profil
create policy "Users can read own profile"
  on public.serwent_profiles for select to authenticated
  using (id = auth.uid());

-- Super admin kan läsa alla profiler
create policy "Super admin full access profiles"
  on public.serwent_profiles for all to authenticated
  using (
    exists (
      select 1 from public.serwent_profiles
      where id = auth.uid() and role = 'super_admin'
    )
  );

-- Service role full access
create policy "Service role profiles"
  on public.serwent_profiles for all
  using (true) with check (true);

-- Sätt befintlig admin-användare som super_admin
-- Kör manuellt efter migrering:
-- INSERT INTO public.serwent_profiles (id, role)
-- SELECT id, 'super_admin' FROM auth.users WHERE email = 'admin@serwent.no'
-- ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
