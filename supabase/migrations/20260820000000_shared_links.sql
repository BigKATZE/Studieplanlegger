-- Delingslenker for enkeltfag. Ingen anonym/offentlig SELECT er tillatt –
-- offentlig lesing går kun gjennom Edge Function-en `shared-subject`, som
-- leser med service-role-nøkkel server-side og filtrerer til kun det faget.
-- Kjør i Supabase SQL Editor. Idempotent.

create table if not exists public.shared_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null,
  created_at timestamptz not null default now(),
  revoked boolean not null default false
);

-- Kun én aktiv lenke per fag per bruker.
create unique index if not exists shared_links_active_unique
  on public.shared_links (user_id, subject_id)
  where revoked = false;

alter table public.shared_links enable row level security;

drop policy if exists "own shared links" on public.shared_links;

-- "for all" dekker select/insert/update/delete i én policy.
create policy "own shared links" on public.shared_links
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sikrer at anon/offentlig aldri kan lese lenkene direkte.
revoke all on public.shared_links from anon;
revoke all on public.shared_links from public;
grant select, insert, update, delete on public.shared_links to authenticated;