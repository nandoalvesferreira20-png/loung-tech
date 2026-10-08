import { POLICY_VERSION, SERVICES, validateLead, formatPhone } from './validation.mjs';

const form = document.getElementById('lead-form');
const status = document.getElementById('form-status');
const notice = document.getElementById('configuration-notice');
const submit = document.getElementById('submit-lead');
const config = window.LOUNG_LEADS_CONFIG || {};
const params = new URLSearchParams(location.search);
const fields = ['company_name', 'contact_name', 'service_type', 'description', 'email', 'phone', 'consent'];
let busy = false;
let widget;
let token = '';
let requestId = crypto.randomUUID();
let lastPayload = '';
let ready = false;

function message(text) { status.textContent = text; }
function errors(messages) {
  for (const name of fields) {
    const element = form.elements.namedItem(name);
    element.setAttribute('aria-invalid', messages[name] ? 'true' : 'false');
    document.getElementById(name + '-error').textContent = messages[name] || '';
  }
  const first = fields.find(name => messages[name]);
  if (first) form.elements.namedItem(first).focus();
}
function data() {
  const value = Object.fromEntries(new FormData(form));
  value.consent = form.elements.consent.checked;
  value.privacy_policy_version = POLICY_VERSION;
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) value[key] = params.get(key);
  return value;
}
form.elements.phone.addEventListener('input', event => { event.target.value = formatPhone(event.target.value); });
form.elements.description.addEventListener('input', event => {
  document.getElementById('description-count').textContent = event.target.value.length + ' / 3.000 caracteres';
});
document.getElementById('no-company').addEventListener('change', event => {
  const input = form.elements.company_name;
  input.value = event.target.checked ? 'Ainda não tenho empresa' : '';
  input.readOnly = event.target.checked;
});
const service = params.get('servico');
if (Object.hasOwn(SERVICES, service || '')) form.elements.service_type.value = service;

function allowedEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co') && url.pathname === '/functions/v1/submit-lead' && !url.search && !url.hash && !url.username && !url.password;
  } catch { return false; }
}
function resetProtection() {
  token = '';
  if (widget !== undefined && window.turnstile) window.turnstile.reset(widget);
}
function configure() {
  if (!allowedEndpoint(config.endpoint) || !config.turnstileSiteKey) {
    notice.hidden = false;
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.defer = true;
  script.onerror = () => { message('Não foi possível carregar a verificação. Atualize a página ou converse pelo WhatsApp.'); };
  script.onload = () => {
    try {
      widget = window.turnstile.render('#turnstile', {
        sitekey: config.turnstileSiteKey, action: 'submit-lead', theme: 'dark', size: 'flexible', language: 'pt-br',
        callback: value => { token = value; },
        'expired-callback': () => { token = ''; message('A verificação expirou. Confirme novamente antes de enviar.'); },
        'error-callback': () => { token = ''; message('A verificação não foi concluída. Tente novamente ou converse pelo WhatsApp.'); },
      });
      ready = true;
    } catch { message('A verificação está indisponível. Tente novamente mais tarde ou converse pelo WhatsApp.'); }
  };
  document.head.append(script);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const result = validateLead(data());
  errors(result.errors);
  if (!result.valid) { message('Confira os campos indicados para continuar.'); return; }
  if (!ready) { message('O envio pelo formulário ainda está indisponível. Seus dados permanecem aqui. Você pode conversar pelo WhatsApp.'); return; }
  if (!token) { message('Conclua a verificação de segurança antes de enviar.'); return; }
  const fingerprint = JSON.stringify(result.data);
  if (lastPayload && lastPayload !== fingerprint) requestId = crypto.randomUUID();
  lastPayload = fingerprint;
  busy = true;
  submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  submit.textContent = 'Enviando solicitação…';
  message('');
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
      body: JSON.stringify({ ...result.data, consent: true, request_id: requestId, turnstile_token: token }),
      signal: AbortSignal.timeout(25000),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.ok !== true) {
      if (body?.errors && typeof body.errors === 'object') {
        const safeErrors = Object.fromEntries(fields.filter(name => typeof body.errors[name] === 'string').map(name => [name, body.errors[name].slice(0, 220)]));
        errors(safeErrors);
      }
      message(response.status === 429 ? 'Você fez várias tentativas. Aguarde alguns minutos antes de enviar novamente.' : response.status === 409 ? 'Os dados desta tentativa mudaram. Confira o formulário e tente novamente.' : 'Não foi possível concluir agora. Seus dados foram mantidos; tente novamente ou converse pelo WhatsApp.');
      resetProtection();
      return;
    }
    document.getElementById('budget-layout').hidden = true;
    const success = document.getElementById('budget-success');
    success.hidden = false;
    success.focus();
  } catch {
    message('Não conseguimos confirmar o recebimento. Seus dados foram mantidos. Tente novamente: uma solicitação já recebida não será duplicada.');
    resetProtection();
  } finally {
    busy = false;
    submit.disabled = false;
    form.setAttribute('aria-busy', 'false');
    submit.textContent = 'Enviar solicitação';
  }
});
configure();
