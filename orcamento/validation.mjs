export const POLICY_VERSION = '2026-10-08';
export const SERVICES = Object.freeze({
  site: 'Site profissional / Landing page',
  sistema: 'Sistema personalizado / CRM',
  loja: 'Loja virtual / E-commerce',
  automacao: 'Automação de processos',
  outro: 'Outro / Preciso de orientação',
});
export function normalizePhone(value) {
  if (typeof value !== 'string' || /[^\d\s()+.-]/.test(value)) return '';
  let digits = value.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  const ddds = '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' ');
  if (!ddds.includes(digits.slice(0, 2))) return '';
  const number = digits.slice(2);
  if (!(/^[2-5]\d{7}$/.test(number) || /^9\d{8}$/.test(number)) || /^(\d)\1+$/.test(number)) return '';
  return '+55' + digits;
}
export function formatPhone(value) {
  let digits = String(value).replace(/\D/g, '').slice(0, 13);
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits ? '(' + digits : '';
  const local = digits.slice(2);
  const split = local.length > 8 ? 5 : 4;
  return '(' + digits.slice(0, 2) + ') ' + local.slice(0, split) + (local.length > split ? '-' + local.slice(split) : '');
}
export function validateLead(input) {
  const errors = {};
  const data = {};
  const string = (key, min, max, message, multiline = false) => {
    const raw = typeof input?.[key] === 'string' ? input[key].normalize('NFC').trim() : '';
    const badControls = multiline ? /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/ : /[\x00-\x1F\x7F]/;
    if (raw.length < min || raw.length > max || badControls.test(raw)) errors[key] = message;
    data[key] = raw;
  };
  string('company_name', 1, 150, 'Informe a empresa ou marque que ainda não tem empresa.');
  string('contact_name', 1, 150, 'Informe seu nome, com até 150 caracteres.');
  string('description', 10, 3000, 'Descreva o que precisa usando entre 10 e 3.000 caracteres.', true);
  string('email', 3, 254, 'Informe um e-mail válido.');
  data.email = data.email.toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(data.email)) errors.email = 'Informe um e-mail válido.';
  data.phone = normalizePhone(input?.phone);
  if (!data.phone) errors.phone = 'Informe um telefone brasileiro válido com DDD.';
  data.service_type = typeof input?.service_type === 'string' ? input.service_type : '';
  if (!Object.hasOwn(SERVICES, data.service_type)) errors.service_type = 'Selecione o serviço desejado.';
  if (input?.consent !== true) errors.consent = 'Autorize o uso dos dados para responder à solicitação.';
  if (input?.privacy_policy_version !== POLICY_VERSION) errors.consent = 'Atualize a página e confira a Política de Privacidade antes de enviar.';
  data.privacy_policy_version = POLICY_VERSION;
  data.source = 'site';
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const value = input?.[key];
    if (value != null && (typeof value !== 'string' || value.length > 150 || /[\x00-\x1F\x7F]/.test(value))) errors[key] = 'O link da campanha é inválido. Acesse o formulário pelo site.';
    data[key] = typeof value === 'string' && value.trim() ? value.normalize('NFC').trim() : null;
  }
  return { data, errors, valid: Object.keys(errors).length === 0 };
}
