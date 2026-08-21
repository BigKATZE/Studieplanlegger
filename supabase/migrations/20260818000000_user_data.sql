-- Basistabell for én privat studieplan per bruker.
-- `if not exists` gjør migrasjonen trygg også for prosjekter der tabellen
-- opprinnelig ble opprettet manuelt i Supabase.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Realtime brukes av klienten for å oppdatere planen mellom åpne enheter.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_data'
  ) then
    alter publication supabase_realtime add table public.user_data;
  end if;
end
$$;
