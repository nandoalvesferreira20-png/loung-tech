// Copies only two explicitly public values; never logs values or other env keys.
import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const env = await readFile(new URL('.env',root),'utf8');
function value(name) {
  const line=env.split(/\r?\n/).find(line=>line.trim().startsWith(name+'='));
  if(!line) throw new Error(`Missing public setting: ${name}`);
  return line.trim().slice(name.length+1).trim().replace(/^(['"])(.*)\1$/,'$2');
}
const supabaseUrl=value('NEXT_PUBLIC_SUPABASE_URL');
const publishableKey=value('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
if(new URL(supabaseUrl).protocol!=='https:') throw new Error('HTTPS URL required');
if(!publishableKey.startsWith('sb_publishable_')) {
  let payload;
  try {payload=JSON.parse(Buffer.from(publishableKey.split('.')[1],'base64url').toString());} catch {throw new Error('Public key required');}
  if(payload.role!=='anon') throw new Error('Only a publishable or anon key is allowed');
}
await writeFile(new URL('admin/config.js',root),'// Public settings only. Never use service_role or secret keys.\nwindow.LOUNG_ADMIN_CONFIG = Object.freeze('+JSON.stringify({supabaseUrl,publishableKey},null,2)+');\n');
console.log('Admin public settings configured; no private values copied.');
