-- Delingslenke for skrivebeskyttet oversikt av hele semesteret. Offentlig
-- lesing går kun gjennom Edge Function-en `shared-semester`, som returnerer
-- et eksplisitt feltutvalg (aldri rå user_data).

create table if not exists public.shared_semester_links (
  token text primary key check (token ~ '^[A-Za-z0-9_-]{32}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

-- Kun én aktiv lenke per bruker.
create unique index if not exists shared_semester_links_active_unique
  on public.shared_semester_links (user_id)
  where revoked_at is null;

alter table public.shared_semester_links enable row level security;

drop policy if exists "Owners manage their semester link" on public.shared_semester_links;
create policy "Owners manage their semester link" on public.shared_semester_links
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.shared_semester_links from public;
revoke all on public.shared_semester_links from anon;
revoke all on public.shared_semester_links from authenticated;
grant select, insert, update, delete on public.shared_semester_links to service_role;
