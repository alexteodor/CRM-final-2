-- Rulează acest fișier o singură dată în Supabase: SQL Editor > New query > Run.
create table if not exists public.leads (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);

alter table public.leads enable row level security;
alter table public.settings enable row level security;

-- Doar utilizatorii autentificați (contul tău) citesc și scriu.
drop policy if exists "leads_auth_all" on public.leads;
create policy "leads_auth_all" on public.leads for all to authenticated using (true) with check (true);
drop policy if exists "settings_auth_all" on public.settings;
create policy "settings_auth_all" on public.settings for all to authenticated using (true) with check (true);
