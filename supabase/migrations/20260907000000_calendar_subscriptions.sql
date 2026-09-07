create table public.calendar_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  subject_ids text[] not null check (
    cardinality(subject_ids) between 1 and 100
    and array_ndims(subject_ids) = 1
    and array_position(subject_ids, null) is null
    and array_position(subject_ids, '') is null
  ),
  event_types text[] not null check (
    cardinality(event_types) between 1 and 4
    and array_ndims(event_types) = 1
    and array_position(event_types, null) is null
    and event_types <@ array['lectures', 'assignments', 'exams', 'reviews']::text[]
  ),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index calendar_subscriptions_active_owner
  on public.calendar_subscriptions (user_id) where revoked_at is null;
create index calendar_subscriptions_owner on public.calendar_subscriptions (user_id);

alter table public.calendar_subscriptions enable row level security;
revoke all on public.calendar_subscriptions from public, anon, authenticated, service_role;
grant select, insert on public.calendar_subscriptions to service_role;
-- Scope and credentials cannot be updated through the service-role Data API.
grant update (revoked_at) on public.calendar_subscriptions to service_role;
