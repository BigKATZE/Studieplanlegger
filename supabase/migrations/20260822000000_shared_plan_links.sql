-- Delingslenker for skrivebeskyttede arbeidsplaner. Offentlig lesing går kun
-- gjennom Edge Function-en `shared-plan`, som returnerer et eksplisitt feltutvalg.

create table if not exists public.shared_plan_links (
  token text primary key check (token ~ '^[A-Za-z0-9_-]{32}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

alter table public.shared_plan_links
  add column if not exists expires_at timestamptz not null default (now() + interval '30 days');

create unique index if not exists shared_plan_links_active_unique
  on public.shared_plan_links (user_id, plan_id)
  where revoked_at is null;

create index if not exists shared_plan_links_owner_idx
  on public.shared_plan_links (user_id);

alter table public.shared_plan_links enable row level security;

drop policy if exists "Owners manage their plan links" on public.shared_plan_links;
create policy "Owners manage their plan links" on public.shared_plan_links
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.shared_plan_links from public;
revoke all on public.shared_plan_links from anon;
revoke all on public.shared_plan_links from authenticated;
grant select, insert, update, delete on public.shared_plan_links to service_role;
