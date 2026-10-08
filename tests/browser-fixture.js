// Served ONLY by tools/preview_server.py --test-fixtures under /__test/form.
// No real Turnstile challenge, Supabase request, or email is made by these fixtures.
(() => {
  const scenario = new URLSearchParams(location.search).get('scenario') || 'success';
  window.LOUNG_LEADS_CONFIG = scenario === 'unconfigured' ? {} : { endpoint: 'https://local-fixture.supabase.co/functions/v1/submit-lead', turnstileSiteKey: 'local-fixture' };
  window.__leadTest = { attempts: 0, payloads: [], saved: 0 };
  const metrics = document.createElement('output');
  metrics.id = 'test-metrics';
  metrics.className = 'form-notice';
  document.getElementById('conteudo').prepend(metrics);
  const update = () => {
    const state = window.__leadTest;
    metrics.textContent = 'TESTE LOCAL · tentativas: ' + state.attempts + ' · registros fictícios: ' + state.saved
      + ' · mesma chave: ' + (state.payloads.length < 2 || state.payloads[0].request_id === state.payloads.at(-1).request_id)
      + ' · campanha: ' + ['utm_source', 'utm_medium', 'utm_campaign'].map(k => state.payloads.at(-1)?.[k] || '—').join(' / ');
  };
  update();
  let callback;
  window.turnstile = {
    render: (_selector, options) => { callback = options.callback; queueMicrotask(() => callback('local-fixture-token')); return 1; },
    reset: () => queueMicrotask(() => callback('local-fixture-token')),
  };
  const append = document.head.append.bind(document.head);
  document.head.append = (...elements) => {
    if (elements.some(e => e.src?.startsWith('https://challenges.cloudflare.com/turnstile/'))) {
      queueMicrotask(() => elements.forEach(e => e.onload?.()));
      return;
    }
    append(...elements);
  };
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (url, options) => {
    if (url !== window.LOUNG_LEADS_CONFIG.endpoint) return nativeFetch(url, options);
    const test = window.__leadTest;
    test.attempts++;
    test.payloads.push(JSON.parse(options.body));
    update();
    if (scenario === 'network' && test.attempts === 1) throw new TypeError('Local fictional network failure');
    if (scenario === 'database') return Response.json({ ok: false, code: 'unavailable' }, { status: 503 });
    if (scenario === 'spam') return Response.json({ ok: false, code: 'rate_limit' }, { status: 429 });
    if (scenario === 'slow') await new Promise(resolve => setTimeout(resolve, 1200));
    test.saved = 1;
    update();
    return Response.json({ ok: true });
  };
})();
