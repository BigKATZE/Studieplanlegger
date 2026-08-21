create table public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  requests smallint not null default 1 check (requests > 0),
  primary key (user_id, usage_date)
);

alter table public.ai_daily_usage enable row level security;
revoke all on public.ai_daily_usage from anon, authenticated;

create or replace function public.consume_ai_request(target_user_id uuid, request_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean;
begin
  insert into public.ai_daily_usage (user_id, requests)
  values (target_user_id, 1)
  on conflict (user_id, usage_date) do update
    set requests = public.ai_daily_usage.requests + 1
    where public.ai_daily_usage.requests < request_limit
  returning true into allowed;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.consume_ai_request(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_request(uuid, integer) to service_role;
