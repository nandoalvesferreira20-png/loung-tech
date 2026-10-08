"""Check public text assets without ever printing credentials or their values."""
from pathlib import Path
import re
from urllib.request import urlopen
from urllib.error import HTTPError

root = Path(__file__).resolve().parents[1]
public = [root / 'index.html', root / 'vercel.json']
for folder in ['orcamento', 'privacidade', 'js', 'css', 'projetos']:
    public.extend(p for p in (root / folder).rglob('*') if p.suffix in ('.html', '.js', '.mjs', '.css', '.json'))
secrets = []
env = root / '.env'
if env.exists():
    for line in env.read_text(encoding='utf-8-sig').splitlines():
        if '=' not in line or line.lstrip().startswith('#'):
            continue
        name, value = line.split('=', 1)
        if re.search(r'SECRET|API_KEY|SERVICE_ROLE', name, re.I):
            value = value.strip().strip('\"\'')
            if len(value) >= 16:
                secrets.append(value)
for path in public:
    content = path.read_text(encoding='utf-8')
    assert not any(secret in content for secret in secrets), 'Private value found in public asset'
    assert not re.search(r'sb_secret_[A-Za-z0-9_-]{20,}', content), 'Administrative credential found'
for path in ['/.env', '/.git/config', '/supabase/config.toml', '/docs/leads-schema.json', '/tests/browser-fixture.js']:
    try:
        with urlopen('http://127.0.0.1:4173' + path) as response:
            raise AssertionError('Private preview path was served')
    except HTTPError as error:
        assert error.code == 404
for path in ['/orcamento', '/privacidade', '/orcamento/script.js?v=2']:
    with urlopen('http://127.0.0.1:4173' + path) as response:
        assert response.status == 200
ignore = (root / '.vercelignore').read_text(encoding='utf-8')
for entry in ['.env', '.env.*', 'supabase/', 'tests/', 'tools/', '.local/']:
    assert entry in ignore
print('PASS: public assets contain no inspected secrets; private preview paths denied; static routes available')
