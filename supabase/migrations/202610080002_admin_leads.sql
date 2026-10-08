-- PREPARED ONLY: review docs/PAINEL_ADMIN.md. Never apply automatically.
begin;
do $$ begin
  if to_regclass('public.leads') is null then raise exception 'Existing public.leads required'; end if;
end $$;
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from public, anon, authenticated;
grant select (user_id) on public.admin_users to authenticated;
create policy admin_read_self on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));
-- SECURITY INVOKER: no elevated rights and no recursive RLS dependency.
create function public.is_loung_admin() returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_loung_admin() from public, anon, authenticated;
grant execute on function public.is_loung_admin() to authenticated;
alter table public.leads enable row level security;
-- Table-level revocation does not clear pre-existing column grants.
revoke all on public.leads from public, anon, authenticated;
do $$ declare column_name text; begin
  for column_name in select a.attname from pg_attribute a
    where a.attrelid='public.leads'::regclass and a.attnum>0 and not a.attisdropped
  loop
    execute format('revoke all (%I) on public.leads from public, anon, authenticated', column_name);
  end loop;
end $$;
grant select (id,company_name,contact_name,service_type,description,email,phone,status,source,utm_source,utm_medium,utm_campaign,created_at) on public.leads to authenticated;
grant update (status) on public.leads to authenticated;
-- Restrictive guards intersect all existing policies, including broad old policies.
create policy loung_admin_select_guard on public.leads as restrictive for select to authenticated
  using ((select public.is_loung_admin()));
create policy loung_admin_update_guard on public.leads as restrictive for update to authenticated
  using ((select public.is_loung_admin())) with check ((select public.is_loung_admin()));
create policy loung_admin_select on public.leads for select to authenticated
  using ((select public.is_loung_admin()));
create policy loung_admin_status_update on public.leads for update to authenticated
  using ((select public.is_loung_admin()))
  with check ((select public.is_loung_admin()) and status in ('novo','em_contato','em_negociacao','proposta_enviada','fechado','perdido'));
-- A restrictive value guard also prevents old permissive UPDATE policies bypassing it.
create policy loung_admin_status_guard on public.leads as restrictive for update to authenticated
  using ((select public.is_loung_admin()))
  with check (status in ('novo','em_contato','em_negociacao','proposta_enviada','fechado','perdido'));
create index if not exists leads_admin_created_idx on public.leads(created_at desc, id desc);
create index if not exists leads_admin_status_created_idx on public.leads(status,created_at desc,id desc);
commit;
