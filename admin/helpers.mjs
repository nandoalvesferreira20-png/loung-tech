export const STATUSES = Object.freeze({novo:'Novo',em_contato:'Em contato',em_negociacao:'Em negociação',proposta_enviada:'Proposta enviada',fechado:'Fechado',perdido:'Perdido'});
export function whatsappUrl(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
  return /^55\d{10,11}$/.test(digits) ? `https://wa.me/${digits}` : null;
}
export function emailUrl(value) {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value || '') ? `mailto:${encodeURIComponent(value)}` : null;
}
export function searchTerm(value) { return String(value).replace(/[^\p{L}\p{N}\s@.-]/gu, ' ').trim().slice(0,100); }
export function dateLabel(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(date) : 'Não informado';
}
