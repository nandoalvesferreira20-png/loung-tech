import { validateLead, POLICY_VERSION } from '../../../orcamento/validation.mjs';
import { notifyBatch } from './email.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY = 20000;
const list = value => (value || '').split(',').map(v => v.trim()).filter(Boolean);
export function adminKey(env) {
  try { const keys = JSON.parse(env('SUPABASE_SECRET_KEYS') || '{}'); if (keys.default) return keys.default; } catch { /* Fail closed or use injected legacy credential. */ }
  return env('SUPABASE_SERVICE_ROLE_KEY') || '';
}
export async function hmac(secret, text) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(text)))].map(v => v.toString(16).padStart(2, '0')).join('');
}
async function limitedJson(request) {
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) throw new Error('size');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('json');
  let count = 0;
  const chunks = [];
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      count += part.value.byteLength;
      if (count > MAX_BODY) { await reader.cancel(); throw new Error('size'); }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(count);
  let offset = 0;
  for (const part of chunks) { bytes.set(part, offset); offset += part.byteLength; }
  const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('json');
  return value;
}
function validOrigins(origins) {
  return origins.length > 0 && origins.every(value => {
    try { const u = new URL(value); return u.protocol === 'https:' && u.origin === value && !u.username; } catch { return false; }
  });
}
export function createSubmitHandler({ env, createAdmin, fetcher = fetch, notify = notifyBatch }) {
  return async request => {
    const origin = request.headers.get('Origin') || '';
    const origins = list(env('ALLOWED_ORIGINS'));
    const allowed = origins.includes(origin);
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Origin', 'X-Content-Type-Options': 'nosniff' };
    if (allowed) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '600' });
    const respond = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });
    if (!allowed) return respond(403, { ok: false, code: 'origin' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return respond(405, { ok: false, code: 'method' }, { Allow: 'POST, OPTIONS' });
    // Deployment alone never activates a public endpoint. Missing anti-abuse settings fail closed.
    const secret = env('LEADS_RATE_LIMIT_SECRET') || '';
    const captchaSecret = env('TURNSTILE_SECRET_KEY') || '';
    const hostnames = list(env('TURNSTILE_HOSTNAMES'));
    if (env('LEADS_ENABLED') !== 'true' || env('PRIVACY_POLICY_APPROVED') !== 'true' || !validOrigins(origins)
      || secret.length < 32 || !captchaSecret || /^[123]x0{10,}/.test(captchaSecret) || !hostnames.length
      || !env('SUPABASE_URL') || !adminKey(env) || !env('RESEND_API_KEY') || !env('RESEND_FROM_EMAIL') || !env('LEADS_NOTIFICATION_EMAIL')) {
      return respond(503, { ok: false, code: 'unavailable' });
    }
    if ((request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase() !== 'application/json') return respond(415, { ok: false, code: 'content_type' });
    let body;
    try { body = await limitedJson(request); } catch (error) { return respond(error.message === 'size' ? 413 : 400, { ok: false, code: 'body' }); }
    const result = validateLead(body);
    if (!result.valid) return respond(422, { ok: false, code: 'validation', errors: result.errors });
    if (!UUID.test(body.request_id || '')) return respond(422, { ok: false, code: 'request_id' });
    if (typeof body.turnstile_token !== 'string' || !body.turnstile_token || body.turnstile_token.length > 2048) return respond(422, { ok: false, code: 'verification' });
    try {
      const db = createAdmin();
      // Atomic shared counters: a global cap remains effective even if IP headers are forged.
      const emailHash = await hmac(secret, 'email:' + result.data.email);
      const ipHeader = request.headers.get('x-forwarded-for') || '';
      const ip = ipHeader.split(',').at(-1)?.trim() || '';
      const subjects = ['global', 'email:' + emailHash];
      const limits = [60, 5], windows = [60, 900];
      if (/^[\da-fA-F:.]{3,64}$/.test(ip)) { subjects.push('ip:' + await hmac(secret, ip)); limits.push(10); windows.push(900); }
      const rate = await db.rpc('consume_lead_limits', { p_subjects: subjects, p_limits: limits, p_windows: windows });
      if (rate.error) return respond(503, { ok: false, code: 'unavailable' });
      if (rate.data !== true) return respond(429, { ok: false, code: 'rate_limit' }, { 'Retry-After': '900' });
      const payloadHash = await hmac(secret, JSON.stringify(result.data));
      const existing = await db.rpc('find_lead_submission', { p_request_id: body.request_id, p_payload_hash: payloadHash });
      if (existing.error) return respond(503, { ok: false, code: 'unavailable' });
      if (existing.data === 'conflict') return respond(409, { ok: false, code: 'conflict' });
      // A retry after a lost response does not need to reuse a spent Turnstile token.
      // The UUID plus full HMAC payload must match; no lead data is disclosed.
      if (existing.data === 'received') return respond(200, { ok: true });
      const verification = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: captchaSecret, response: body.turnstile_token, idempotency_key: body.request_id }),
        signal: AbortSignal.timeout(8000),
      });
      const verified = await verification.json();
      if (!verification.ok || verified.success !== true || !hostnames.includes(verified.hostname) || verified.hostname !== new URL(origin).hostname || verified.action !== 'submit-lead') {
        return respond(422, { ok: false, code: 'verification' });
      }
      const saved = await db.rpc('accept_lead_submission', {
        p_request_id: body.request_id, p_payload_hash: payloadHash,
        p_lead: { ...result.data, privacy_policy_version: POLICY_VERSION },
      });
      if (saved.error) return respond(503, { ok: false, code: 'unavailable' });
      if (saved.data?.state === 'conflict') return respond(409, { ok: false, code: 'conflict' });
      if (!saved.data?.lead_id) return respond(503, { ok: false, code: 'unavailable' });
      // Lead and persistent outbox already committed atomically. Email cannot undo acceptance.
      try { await notify(db, env, fetcher, saved.data.lead_id); } catch { /* Persistent retry worker handles this. */ }
      return respond(200, { ok: true });
    } catch { return respond(503, { ok: false, code: 'unavailable' }); }
  };
}
