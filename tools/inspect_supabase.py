"""Read schema and anonymous access metadata only. Never print secrets or leads."""
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
values = {}
for line in (ROOT / '.env').read_text(encoding='utf-8-sig').splitlines():
    match = re.match(r'^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$', line)
    if match:
        values[match[1]] = match[2].strip().strip('\"\'')
url = values.get('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
host = urllib.parse.urlparse(url).hostname or ''
if not (url.startswith('https://') and host.endswith('.supabase.co')):
    raise SystemExit('URL do projeto não reconhecida; inspeção não executada.')
key = values.get('SUPABASE_SECRET_KEY') or values.get('SUPABSE_SECRET_KEY')
headers = {'apikey': key, 'Accept': 'application/openapi+json'}
if key and key.startswith('eyJ'):
    headers['Authorization'] = 'Bearer ' + key
try:
    with urllib.request.urlopen(urllib.request.Request(url + '/rest/v1/', headers=headers), timeout=20) as response:
        spec = json.load(response)
    schema = spec.get('definitions', {}).get('leads', {})
    print(json.dumps({'lead_schema': schema}, ensure_ascii=False))
    # Persist schema metadata only, never table rows or API credentials.
    (ROOT / 'docs').mkdir(exist_ok=True)
    (ROOT / 'docs/leads-schema.json').write_text(json.dumps(schema, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
except urllib.error.HTTPError as error:
    print('schema_http_status', error.code)
except Exception as error:
    print('schema_connection_failed', type(error).__name__)

public = values.get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
if public:
    anonymous = {'apikey': public}
    if public.startswith('eyJ'):
        anonymous['Authorization'] = 'Bearer ' + public
    try:
        # Limit zero exposes no personal data; status only is printed.
        request = urllib.request.Request(url + '/rest/v1/leads?select=id&limit=0', headers=anonymous)
        with urllib.request.urlopen(request, timeout=20) as response:
            print('anonymous_read_http_status', response.status)
    except urllib.error.HTTPError as error:
        print('anonymous_read_http_status', error.code)
    except Exception as error:
        print('anonymous_read_connection_failed', type(error).__name__)
