-- PREPARED ONLY. Review docs/FORMULARIO_LEADS.md before any remote application.
-- Existing public.leads is preserved. No rows are deleted and RLS is never disabled.
begin;

do $$
declare expected record;
begin
  if to_regclass('public.leads') is null then raise exception 'Existing public.leads required'; end if;
  if not (select relrowsecurity from pg_class where oid = 'public.leads'::regclass) then
    raise exception 'Review and enable leads RLS before applying this migration';
  end if;
  for expected in select * from (values
    ('id','uuid'), ('company_name','text'), ('contact_name','text'), ('service_type','text'),
    ('description','text'), ('email','text'), ('phone','text'), ('status','text'), ('source','text'),
    ('utm_source','text'), ('utm_medium','text'), ('utm_campaign','text'),
    ('consent_at','timestamp with time zone'), ('privacy_policy_version','text'),
    ('notification_status','text'), ('notified_at','timestamp with time zone'), ('created_at','timestamp with time zone')
  ) as fields(name, kind) loop
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='leads' and column_name=expected.name and data_type=expected.kind) then
      raise exception 'Unexpected leads column: %', expected.name;
    end if;
  end loop;
end $$;

create schema if not exists lead_private;
revoke all on schema lead_private from public, anon, authenticated;

create table lead_private.submissions (
  request_id uuid primary key,
  payload_hash text not null check (length(payload_hash)=64),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table lead_private.rate_limits (
  subject text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  expires_at timestamptz not null,
  primary key(subject, window_start)
);
create table lead_private.notification_jobs (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  state text not null default 'pending' check(state in ('pending','processing','failed','sent','review')),
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  lease uuid,
  last_error_code text,
  provider_id text,
  created_at timestamptz not null default now()
);
create index notification_jobs_due on lead_private.notification_jobs(next_attempt_at) where state in ('pending','failed','processing');
alter table lead_private.submissions enable row level security;
alter table lead_private.rate_limits enable row level security;
alter table lead_private.notification_jobs enable row level security;
revoke all on all tables in schema lead_private from public, anon, authenticated;

-- Remove anonymous grants only, preserving the existing table and policies.
revoke all on public.leads from anon;
do $$
begin
  if has_table_privilege('anon','public.leads','SELECT, INSERT, UPDATE, DELETE')
    or has_any_column_privilege('anon','public.leads','SELECT, INSERT, UPDATE') then
    raise exception 'Inherited or column-level anonymous grants require explicit security review';
  end if;
end $$;

create or replace function public.consume_lead_limits(p_subjects text[], p_limits integer[], p_windows integer[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare item record; stamp timestamptz; total integer; allowed boolean := true;
begin
  if coalesce(array_length(p_subjects,1),0) not between 2 and 3 or array_length(p_subjects,1) is distinct from array_length(p_limits,1) or array_length(p_subjects,1) is distinct from array_length(p_windows,1) then raise exception 'Invalid limits'; end if;
  -- Same lock order prevents deadlocks when callers share global and per-email counters.
  for item in select p_subjects[n] subject, p_limits[n] maximum, p_windows[n] duration from generate_subscripts(p_subjects,1) n order by p_subjects[n] loop
    if item.subject is null or item.maximum is null or item.duration is null or length(item.subject)>100 or item.maximum<1 or item.duration not between 1 and 86400 then raise exception 'Invalid limits'; end if;
    stamp := to_timestamp(floor(extract(epoch from now()) / item.duration) * item.duration);
    insert into lead_private.rate_limits(subject,window_start,hits,expires_at)
      values(item.subject,stamp,1,stamp+make_interval(secs=>item.duration))
      on conflict(subject,window_start) do update set hits=lead_private.rate_limits.hits+1
      returning hits into total;
    if total>item.maximum then allowed := false; end if;
  end loop;
  return allowed;
end $$;

create or replace function public.find_lead_submission(p_request_id uuid, p_payload_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare previous lead_private.submissions;
begin
  select * into previous from lead_private.submissions where request_id=p_request_id;
  if not found then return 'new'; end if;
  if previous.payload_hash<>p_payload_hash then return 'conflict'; end if;
  return 'received';
end $$;

create or replace function public.accept_lead_submission(p_request_id uuid, p_payload_hash text, p_lead jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare previous lead_private.submissions; lead_id uuid;
begin
  -- Transaction lock protects two function instances receiving the same request concurrently.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into previous from lead_private.submissions where request_id=p_request_id;
  if found then
    if previous.payload_hash<>p_payload_hash then return jsonb_build_object('state','conflict'); end if;
    return jsonb_build_object('state','received','lead_id',previous.lead_id);
  end if;
  insert into public.leads(company_name,contact_name,service_type,description,email,phone,status,source,
    utm_source,utm_medium,utm_campaign,consent_at,privacy_policy_version,notification_status)
  values(p_lead->>'company_name',p_lead->>'contact_name',p_lead->>'service_type',p_lead->>'description',
    p_lead->>'email',p_lead->>'phone','novo','site',p_lead->>'utm_source',p_lead->>'utm_medium',p_lead->>'utm_campaign',
    now(),p_lead->>'privacy_policy_version','pendente') returning id into lead_id;
  insert into lead_private.submissions(request_id,payload_hash,lead_id) values(p_request_id,p_payload_hash,lead_id);
  insert into lead_private.notification_jobs(lead_id) values(lead_id);
  return jsonb_build_object('state','received','lead_id',lead_id);
end $$;

create or replace function public.claim_lead_notifications(p_lease uuid, p_lead_id uuid default null, p_limit integer default 10)
returns setof jsonb language plpgsql security definer set search_path = '' as $$
declare job lead_private.notification_jobs; payload jsonb;
begin
  -- Resend idempotency expires after 24h. Never automatically resend uncertain jobs past 23h.
  update lead_private.notification_jobs set state='review',last_error_code='retry_window_expired'
    where state in ('pending','processing','failed') and first_attempt_at<now()-interval '23 hours'
    and (locked_until is null or locked_until<now());
  for job in
    select * from lead_private.notification_jobs
    where (p_lead_id is null or lead_id=p_lead_id) and state in ('pending','failed','processing')
      and attempts<8 and next_attempt_at<=now() and (locked_until is null or locked_until<now())
      and (first_attempt_at is null or first_attempt_at>=now()-interval '23 hours')
    order by next_attempt_at for update skip locked limit greatest(1,least(p_limit,10))
  loop
    update lead_private.notification_jobs set state='processing',attempts=attempts+1,
      first_attempt_at=coalesce(first_attempt_at,now()),locked_until=now()+interval '3 minutes',lease=p_lease
      where lead_id=job.lead_id;
    select to_jsonb(l) into payload from public.leads l where l.id=job.lead_id;
    return next jsonb_build_object('lead',payload);
  end loop;
end $$;

create or replace function public.finish_lead_notification(p_lead_id uuid, p_lease uuid, p_sent boolean, p_error_code text, p_provider_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare job lead_private.notification_jobs;
begin
  select * into job from lead_private.notification_jobs where lead_id=p_lead_id and lease=p_lease and state='processing' for update;
  if not found then return false; end if;
  if p_sent then
    update public.leads set notification_status='enviado',notified_at=now() where id=p_lead_id;
    update lead_private.notification_jobs set state='sent',locked_until=null,lease=null,last_error_code=null,provider_id=left(p_provider_id,150) where lead_id=p_lead_id;
  else
    update lead_private.notification_jobs set state=case when attempts>=8 then 'review' else 'failed' end,
      next_attempt_at=now()+make_interval(secs=>least(3600,(30*power(2,attempts))::integer)),
      locked_until=null,lease=null,last_error_code=left(p_error_code,80) where lead_id=p_lead_id;
    -- Existing lead remains pendente; it must never be lost because email failed.
  end if;
  return true;
end $$;

-- SECURITY DEFINER routines are executable only by the administrative Edge client.
revoke all on function public.consume_lead_limits(text[],integer[],integer[]) from public,anon,authenticated;
revoke all on function public.find_lead_submission(uuid,text) from public,anon,authenticated;
revoke all on function public.accept_lead_submission(uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.claim_lead_notifications(uuid,uuid,integer) from public,anon,authenticated;
revoke all on function public.finish_lead_notification(uuid,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.consume_lead_limits(text[],integer[],integer[]) to service_role;
grant execute on function public.find_lead_submission(uuid,text) to service_role;
grant execute on function public.accept_lead_submission(uuid,text,jsonb) to service_role;
grant execute on function public.claim_lead_notifications(uuid,uuid,integer) to service_role;
grant execute on function public.finish_lead_notification(uuid,uuid,boolean,text,text) to service_role;

commit;
