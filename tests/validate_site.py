"""Check local routes/assets and common recovery regressions without dependencies."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = [ROOT / 'index.html', *sorted((ROOT / 'projetos').glob('*/index.html'))]


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.ids, self.references, self.headings = [], [], 0
        self.feed(source)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        self.headings += tag == 'h1'
        for name in ('src', 'href'):
            if name in attrs:
                self.references.append(attrs[name])
        if attrs.get('target') == '_blank':
            assert 'noopener' in attrs.get('rel', ''), 'Unsafe external tab'


for path in PAGES:
    source = path.read_text(encoding='utf-8')
    page = Page(source)
    assert page.headings == 1, f'{path}: expected a single H1'
    assert len(page.ids) == len(set(page.ids)), f'{path}: duplicate IDs'
    for ref in page.references:
        url = urlsplit(ref)
        if url.scheme or url.netloc:
            continue
        assert ref != '#', f'{path}: placeholder link'
        target = (ROOT / unquote(url.path).lstrip('/')) if url.path.startswith('/') else (path.parent / unquote(url.path) if url.path else path)
        assert target.exists(), f'{path}: missing {ref}'
        if target.is_dir():
            target /= 'index.html'
        if url.fragment:
            target_page = Page(target.read_text(encoding='utf-8'))
            assert url.fragment in target_page.ids, f'{path}: invalid anchor {ref}'
    print('PASS', path.relative_to(ROOT))

for path in [ROOT / 'index.html', ROOT / 'js/script.js', *ROOT.glob('css/*.css'), *ROOT.glob('projetos/**/*.html'), *ROOT.glob('projetos/**/*.js'), *ROOT.glob('projetos/**/*.css')]:
    assert not re.search(r'^(<{7}|={7}|>{7})', path.read_text(encoding='utf-8'), re.M), f'{path}: unresolved merge conflict'

main = (ROOT / 'index.html').read_text(encoding='utf-8')
for contact in ['https://wa.me/5511965973582', 'https://www.instagram.com/loungtech.ti', 'mailto:loungtech.ti@gmail.com']:
    assert contact in main, f'Missing contact: {contact}'
for site in ['https://site-rafael-munhoz.vercel.app/', 'https://dragabriellabarros.vercel.app/']:
    assert site in main, f'Missing real project: {site}'
assert len(PAGES) == 7
print('PASS: seven pages, contacts, real projects, and merge-conflict checks')
