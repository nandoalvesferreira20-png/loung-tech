import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '../.local/node_modules/@electric-sql/pglite/dist/index.js';

test('incremental SQL: preserve leads, atomic receipts, shared limits, leases, retries and anonymous denial', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table public.leads (
        id uuid primary key default gen_random_uuid(), company_name text not null, contact_name text not null,
        service_type text not null, description text not null, email text not null, phone text not null,
        status text not null default 'novo', source text not null default 'site', utm_source text, utm_medium text, utm_campaign text,
        consent_at timestamptz not null, privacy_policy_version text not null,
        notification_status text not null default 'pendente' check(notification_status in ('pendente','enviado')),
        notified_at timestamptz, created_at timestamptz not null default now()
      );
      alter table public.leads enable row level security;
      grant select on public.leads to anon;
      insert into public.leads(company_name,contact_name,service_type,description,email,phone,consent_at,privacy_policy_version)
      values('PREEXISTENTE FICTÍCIO','Contato Fictício','site','Teste de preservação','teste@example.com','+5511987654321',now(),'2026-10-08');
    `);
    const migration = await readFile(new URL('../supabase/migrations/202610080001_lead_delivery.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    assert.equal((await db.query('select count(*)::int n from public.leads')).rows[0].n, 1);
    const lead = { company_name: 'FICTÍCIO', contact_name: 'FICTÍCIO', service_type: 'site', description: 'Descrição fictícia de teste', email: 'teste@example.com', phone: '+5511987654321', privacy_policy_version: '2026-10-08', utm_source: 'instagram', utm_medium: 'reels', utm_campaign: 'teste' };
    const id = crypto.randomUUID(), hash = 'a'.repeat(64);
    const accept = async (digest = hash) => (await db.query('select public.accept_lead_submission($1,$2,$3::jsonb) result', [id, digest, JSON.stringify(lead)])).rows[0].result;
    const first = await accept(), duplicate = await accept();
    assert.equal(first.lead_id, duplicate.lead_id);
    assert.equal((await accept('b'.repeat(64))).state, 'conflict');
    assert.equal((await db.query('select count(*)::int n from public.leads')).rows[0].n, 2);
    assert.equal((await db.query('select count(*)::int n from lead_private.notification_jobs')).rows[0].n, 1);
    assert.equal((await db.query('select utm_medium from public.leads where id=$1', [first.lead_id])).rows[0].utm_medium, 'reels');
    for (const allowed of [true, true, false]) {
      assert.equal((await db.query('select public.consume_lead_limits($1,$2,$3) allowed', [['global','email:test'],[2,2],[60,900]])).rows[0].allowed, allowed);
    }
    const lease = crypto.randomUUID(), otherLease = crypto.randomUUID();
    const claim = async token => (await db.query('select public.claim_lead_notifications($1,null,10) job', [token])).rows;
    assert.equal((await claim(lease)).length, 1);
    assert.equal((await claim(otherLease)).length, 0);
    const finish = async (token, sent) => (await db.query('select public.finish_lead_notification($1,$2,$3,$4,$5) finished', [first.lead_id,token,sent,sent?null:'provider_500',sent?'fixture-provider':null])).rows[0].finished;
    assert.equal(await finish(otherLease, true), false);
    assert.equal(await finish(lease, false), true);
    assert.equal((await db.query('select notification_status from public.leads where id=$1',[first.lead_id])).rows[0].notification_status,'pendente');
    await db.exec(`update lead_private.notification_jobs set next_attempt_at=now()-interval '1 minute'`);
    assert.equal((await claim(otherLease)).length, 1);
    assert.equal(await finish(otherLease, true), true);
    const delivered = (await db.query('select notification_status,notified_at from public.leads where id=$1',[first.lead_id])).rows[0];
    assert.equal(delivered.notification_status,'enviado'); assert.ok(delivered.notified_at);
    assert.equal((await claim(crypto.randomUUID())).length,0);
    // Expired uncertain deliveries require human review instead of exceeding Resend's idempotency window.
    await db.exec(`update lead_private.notification_jobs set state='processing',first_attempt_at=now()-interval '24 hours',locked_until=now()-interval '1 minute',next_attempt_at=now()-interval '1 minute'`);
    assert.equal((await claim(crypto.randomUUID())).length,0);
    assert.equal((await db.query('select state from lead_private.notification_jobs')).rows[0].state,'review');
    await db.exec('set role anon');
    await assert.rejects(db.query('select id from public.leads'), /permission denied/i);
    await assert.rejects(db.query('select public.find_lead_submission($1,$2)',[id,hash]), /permission denied/i);
    await db.exec('reset role');
    assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.leads'::regclass")).rows[0].relrowsecurity,true);
  } finally { await db.close(); }
});
