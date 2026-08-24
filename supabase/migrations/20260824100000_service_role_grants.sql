-- Edge Function-ene (shared-plan, shared-subject, shared-semester) leser
-- user_data og shared_links med service_role-nøkkelen. Nyere Supabase
-- eksponerer ikke nye tabeller automatisk for API-rollene, så service_role
-- trenger eksplisitte grants (RLS omgårs fortsatt av rollen).

grant select, insert, update, delete on public.user_data to service_role;
grant select, insert, update, delete on public.shared_links to service_role;
