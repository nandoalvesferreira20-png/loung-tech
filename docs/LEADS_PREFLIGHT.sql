-- Read-only preflight. Review in the authorized Supabase SQL Editor BEFORE migration.
select column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema='public' and table_name='leads'
order by ordinal_position;
select relrowsecurity, relforcerowsecurity from pg_class where oid='public.leads'::regclass;
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.leads'::regclass;
select policyname, roles, cmd, qual, with_check from pg_policies where schemaname='public' and tablename='leads';
select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='leads';
select grantee, column_name, privilege_type from information_schema.column_privileges where table_schema='public' and table_name='leads';
