import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { adminKey, hmac } from '../_shared/handler.mjs';
import { notifyBatch } from '../_shared/email.mjs';

const env = (name: string) => Deno.env.get(name);
Deno.serve(async request => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (request.method !== 'POST') return new Response(null, { status: 405, headers });
  const expected = env('LEADS_RETRY_SECRET') || '';
  const provided = request.headers.get('x-leads-retry-secret') || '';
  // Compare fixed-length digests; never accept a missing worker secret.
  if (expected.length < 32 || provided.length > 512 || await hmac(expected, provided) !== await hmac(expected, expected)) {
    return new Response(JSON.stringify({ ok: false }), { status: 403, headers });
  }
  if (!env('SUPABASE_URL') || !adminKey(env) || !env('RESEND_API_KEY') || !env('RESEND_FROM_EMAIL') || !env('LEADS_NOTIFICATION_EMAIL')) {
    return new Response(JSON.stringify({ ok: false }), { status: 503, headers });
  }
  try {
    const db = createClient(env('SUPABASE_URL')!, adminKey(env), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
    });
    const result = await notifyBatch(db, env);
    return new Response(JSON.stringify({ ok: !result.unavailable, ...result }), { status: result.unavailable ? 503 : 200, headers });
  } catch { return new Response(JSON.stringify({ ok: false }), { status: 503, headers }); }
});
