import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { adminKey, createSubmitHandler } from '../_shared/handler.mjs';

const env = (name: string) => Deno.env.get(name);
const createAdmin = () => createClient(env('SUPABASE_URL')!, adminKey(env), {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
});
Deno.serve(createSubmitHandler({ env, createAdmin }));
