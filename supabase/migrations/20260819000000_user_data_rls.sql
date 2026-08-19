-- Sikrer at RLS er påslått for alle tabeller med brukerdata,
-- og at hver bruker kun kan lese/skrive egne rader.
-- Kjør i Supabase SQL Editor (kun tabellen public.user_data finnes).

-- Gjør idempotent: tabellen finnes allerede fra manuell oppsett.
alter table public.user_data enable row level security;

-- Eksisterende policy (hvis den finnes) erstattes for å garantere riktig definisjon.
drop policy if exists "own data" on public.user_data;

-- "for all" dekker select/insert/update/delete i én policy.
create policy "own data" on public.user_data
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Sjekk: ingen anonyme/ikke-autentiserte roller skal ha tilgang.
revoke all on public.user_data from anon;
revoke all on public.user_data from authenticated;
grant select, insert, update, delete on public.user_data to authenticated;