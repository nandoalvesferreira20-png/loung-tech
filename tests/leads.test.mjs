import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLead, normalizePhone, POLICY_VERSION } from '../orcamento/validation.mjs';
import { createSubmitHandler, adminKey } from '../supabase/functions/_shared/handler.mjs';
import { leadEmail, notifyBatch } from '../supabase/functions/_shared/email.mjs';

const example = () => ({ company_name: 'EMPRESA FICTÍCIA DE TESTE', contact_name: 'Contato Fictício', service_type: 'site', description: 'TESTE FICTÍCIO: organizar o atendimento comercial.', email: 'teste@example.com', phone: '(11) 98765-4321', consent: true, privacy_policy_version: POLICY_VERSION, request_id: crypto.randomUUID(), turnstile_token: 'fictional-token', utm_source: 'instagram', utm_medium: 'reels', utm_campaign: 'lancamento_orcamentos' });
const settings = { LEADS_ENABLED: 'true', PRIVACY_POLICY_APPROVED: 'true', ALLOWED_ORIGINS: 'https://loung-tech.vercel.app', TURNSTILE_HOSTNAMES: 'loung-tech.vercel.app', TURNSTILE_SECRET_KEY: 'fictional-private-key', LEADS_RATE_LIMIT_SECRET: 'fictional-secret-with-at-least-32-characters', SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_SECRET_KEYS: '{"default":"sb_secret_fixture"}', RESEND_API_KEY: 're_fixture', RESEND_FROM_EMAIL: 'Loung <test@example.com>', LEADS_NOTIFICATION_EMAIL: 'team@example.com' };
const request = (body, options = {}) => new Request('https://fixture.supabase.co/functions/v1/submit-lead', { method: options.method || 'POST', headers: { Origin: options.origin ?? settings.ALLOWED_ORIGINS, 'Content-Type': options.contentType || 'application/json' }, body: options.method && options.method !== 'POST' ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
function fixture(overrides = {}) {
  const receipts = new Map();
  const calls = [];
  const db = { rpc: async (name, args) => {
    calls.push({ name, args });
    if (overrides.dbFail) return { error: {} };
    if (name === 'consume_lead_limits') return { data: overrides.rate !== false };
    if (name === 'find_lead_submission') return { data: !receipts.has(args.p_request_id) ? 'new' : receipts.get(args.p_request_id) === args.p_payload_hash ? 'received' : 'conflict' };
    if (name === 'accept_lead_submission') { receipts.set(args.p_request_id, args.p_payload_hash); return { data: { lead_id: 'fixture-lead', state: 'received' } }; }
    return { data: [] };
  } };
  let emails = 0, verifications = 0;
  const env = key => ({ ...settings, ...overrides.env })[key];
  const handler = createSubmitHandler({ env, createAdmin: () => db,
    fetcher: async () => { verifications++; if (overrides.networkFail) throw new Error('fixture'); return Response.json({ success: overrides.captcha !== false, hostname: overrides.hostname || 'loung-tech.vercel.app', action: overrides.action || 'submit-lead' }); },
    notify: async () => { emails++; if (overrides.emailFail) throw new Error('fixture'); },
  });
  return { handler, calls, receipts, stats: () => ({ emails, verifications }) };
}

test('valid payload and Brazilian phone normalization', () => {
  const result = validateLead(example());
  assert.equal(result.valid, true);
  assert.equal(result.data.phone, '+5511987654321');
  assert.equal(normalizePhone('+55 (11) 98765-4321'), '+5511987654321');
  assert.equal(normalizePhone('(11) 3456-7890'), '+551134567890');
  assert.equal(result.data.utm_medium, 'reels');
  assert.equal(result.data.source, 'site');
});
test('empty fields, invalid email/phone, short description, forged service and consent', () => {
  for (const [key, value] of Object.entries({ company_name: '', contact_name: '', email: 'invalid', phone: '(00) 99999-9999', description: 'curta', service_type: 'administrator', consent: false })) {
    assert.ok(validateLead({ ...example(), [key]: value }).errors[key], key);
  }
  assert.equal(normalizePhone('(11) 99999-9999'), '');
  assert.equal(validateLead({ ...example(), description: 'a'.repeat(3001) }).valid, false);
  assert.equal(validateLead({ ...example(), email: 'a'.repeat(255) }).valid, false);
  assert.equal(validateLead({ ...example(), utm_campaign: 'a'.repeat(151) }).valid, false);
  assert.equal(validateLead({ ...example(), privacy_policy_version: 'old' }).valid, false);
});
test('acceptance is idempotent, preserves UTMs and notifies once', async () => {
  const f = fixture(), payload = example();
  const a = await f.handler(request(payload)), b = await f.handler(request(payload));
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal(f.receipts.size, 1); assert.deepEqual(f.stats(), { emails: 1, verifications: 1 });
  assert.equal(f.calls.find(c => c.name === 'accept_lead_submission').args.p_lead.utm_source, 'instagram');
  assert.equal((await f.handler(request({ ...payload, description: 'Outra descrição fictícia de teste.' }))).status, 409);
});
test('missing configuration, privacy approval or anti-abuse protection fail closed', async () => {
  for (const [name, value] of Object.entries({ LEADS_ENABLED: 'false', PRIVACY_POLICY_APPROVED: 'false', TURNSTILE_SECRET_KEY: '', LEADS_RATE_LIMIT_SECRET: '', TURNSTILE_HOSTNAMES: '', RESEND_API_KEY: '', SUPABASE_SECRET_KEYS: '', ALLOWED_ORIGINS: '' })) {
    const f = fixture({ env: { [name]: value } });
    assert.ok([403, 503].includes((await f.handler(request(example()))).status), name);
    assert.equal(f.receipts.size, 0);
  }
  assert.equal((await fixture({ env: { TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' } }).handler(request(example()))).status, 503);
});
test('CORS and methods reject unrelated websites', async () => {
  const f = fixture();
  const options = await f.handler(request(undefined, { method: 'OPTIONS' }));
  assert.equal(options.status, 204);
  assert.equal(options.headers.get('Access-Control-Allow-Origin'), settings.ALLOWED_ORIGINS);
  assert.equal((await f.handler(request(undefined, { method: 'GET' }))).status, 405);
  const forbidden = await f.handler(request(example(), { origin: 'https://attacker.example' }));
  assert.equal(forbidden.status, 403); assert.equal(forbidden.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await f.handler(request(example(), { origin: '' }))).status, 403);
});
test('body bounds, JSON, token and field validation precede persistence', async () => {
  const f = fixture();
  assert.equal((await f.handler(request('x'.repeat(20001)))).status, 413);
  assert.equal((await f.handler(request('{bad'))).status, 400);
  assert.equal((await f.handler(request(example(), { contentType: 'text/plain' }))).status, 415);
  assert.equal((await f.handler(request({ ...example(), turnstile_token: 'x'.repeat(2049) }))).status, 422);
  assert.equal((await f.handler(request({ ...example(), consent: false }))).status, 422);
  assert.equal(f.receipts.size, 0);
});
test('database, network, bot, hostname, action and shared rate-limit failures', async () => {
  for (const options of [{ dbFail: true }, { networkFail: true }, { captcha: false }, { hostname: 'attacker.example' }, { action: 'other' }, { rate: false }]) {
    const f = fixture(options);
    assert.notEqual((await f.handler(request(example()))).status, 200);
    assert.equal(f.receipts.size, 0);
  }
  const f = fixture({ rate: false });
  const r = await f.handler(request(example()));
  assert.equal(r.status, 429); assert.equal(r.headers.get('Retry-After'), '900');
});
test('email failure cannot undo an accepted lead', async () => {
  const f = fixture({ emailFail: true });
  assert.deepEqual(await (await f.handler(request(example()))).json(), { ok: true });
  assert.equal(f.receipts.size, 1);
});
test('notification worker persists failures and uses a stable Resend key', async () => {
  const lead = { ...validateLead(example()).data, id: crypto.randomUUID(), created_at: '2026-10-08T15:00:00Z' };
  const finishes = [], keys = [];
  const db = { rpc: async (name, args) => name === 'claim_lead_notifications' ? { data: [{ lead }] } : (finishes.push(args), { data: true }) };
  const env = key => settings[key];
  const failure = await notifyBatch(db, env, async (_url, init) => { keys.push(init.headers['Idempotency-Key']); return Response.json({ message: 'fixture' }, { status: 500 }); });
  assert.equal(failure.failed, 1); assert.equal(finishes[0].p_sent, false);
  await notifyBatch(db, env, async (_url, init) => { keys.push(init.headers['Idempotency-Key']); return Response.json({ id: 'fixture-provider-id' }); });
  assert.equal(finishes[1].p_sent, true); assert.equal(keys[0], keys[1]);
  const unacknowledged = { rpc: async name => name === 'claim_lead_notifications' ? { data: [{ lead }] } : { data: false } };
  const lostLease = await notifyBatch(unacknowledged, env, async () => Response.json({ id: 'fixture-provider-id' }));
  assert.equal(lostLease.processed, 0); assert.equal(lostLease.failed, 1);
});
test('email escapes visitor input, validates WhatsApp and formats São Paulo time', () => {
  const lead = { ...validateLead(example()).data, company_name: '<script>bad</script>', description: '<img src=x onerror=bad>', id: crypto.randomUUID(), created_at: '2026-10-08T15:00:00Z' };
  const email = leadEmail(lead, { from: 'team@example.com', to: 'test@example.com' });
  assert.ok(!email.html.includes('<script>')); assert.ok(!email.html.includes('<img src=x'));
  assert.ok(email.html.includes('&lt;script&gt;')); assert.ok(email.html.includes('https://wa.me/5511987654321'));
  assert.ok(email.text.includes('12:00')); assert.ok(email.text.includes('America/Sao_Paulo'));
  assert.equal(adminKey(key => key === 'SUPABASE_SECRET_KEYS' ? '{"default":"sb_secret_fixture"}' : ''), 'sb_secret_fixture');
});
