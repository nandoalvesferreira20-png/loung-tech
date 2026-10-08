"""Static preview with private paths blocked. Optional, isolated UI test fixtures."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, unquote, parse_qs
import argparse

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=4173)
parser.add_argument('--test-fixtures', action='store_true')
args = parser.parse_args()


class Preview(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript'}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass  # URLs may include campaign labels; no form data is logged.

    def do_GET(self):
        url = urlsplit(self.path)
        path = unquote(url.path)
        if args.test_fixtures and path == '/__test/form':
            content = (ROOT / 'orcamento/index.html').read_text(encoding='utf-8')
            scenario = parse_qs(url.query).get('scenario', ['success'])[0]
            if scenario not in ('success', 'network', 'database', 'resend', 'slow', 'unconfigured', 'spam'):
                return self.send_error(404)
            content = content.replace('<script src="/orcamento/config.js"></script>', '<script src="/__test/fixture.js"></script>')
            content = content.replace('<div class="budget-heading">', '<p class="form-notice">TESTE LOCAL · Dados fictícios. Nada será gravado ou enviado.</p><div class="budget-heading">')
            return self.content(content.encode(), 'text/html; charset=utf-8')
        if args.test_fixtures and path == '/__test/fixture.js':
            return self.content((ROOT / 'tests/browser-fixture.js').read_bytes(), 'text/javascript')
        parts = Path(path.lstrip('/')).parts
        if any(part.startswith('.') for part in parts) or (parts and parts[0] in ('supabase', 'docs', 'tools', 'tests', 'node_modules', '__test')) or '..' in parts:
            return self.send_error(404)
        if path in ('/orcamento', '/privacidade'):
            self.path = path + '/index.html'
        super().do_GET()

    def content(self, content, mime):
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(content)

    def list_directory(self, path):
        self.send_error(404)
        return None


print('Prévia estática local em http://127.0.0.1:' + str(args.port), flush=True)
ThreadingHTTPServer(('127.0.0.1', args.port), Preview).serve_forever()
