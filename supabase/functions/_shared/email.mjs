import { SERVICES } from '../../../orcamento/validation.mjs';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
export function leadEmail(lead, config) {
  const received = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(lead.created_at));
  const campaign = [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(' / ');
  const rows = [
    ['Empresa', lead.company_name], ['Responsável', lead.contact_name],
    ['Serviço solicitado', SERVICES[lead.service_type] || lead.service_type],
    ['Descrição', lead.description], ['E-mail', lead.email], ['WhatsApp', lead.phone],
    ['Origem', lead.source + (campaign ? ' · ' + campaign : '')], ['Data de recebimento', received + ' (America/Sao_Paulo)'],
  ];
  const whatsapp = 'https://wa.me/' + lead.phone.replace(/\D/g, '');
  return {
    from: config.from, to: [config.to], subject: 'Novo orçamento recebido | Loung Tech', reply_to: lead.email,
    text: 'Nova solicitação recebida pelo site da Loung Tech.\n\n' + rows.map(([key, value]) => key + ': ' + value).join('\n\n') + '\n\nConversar pelo WhatsApp: ' + whatsapp,
    html: '<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f1f4f8;font-family:Arial,sans-serif;color:#172237"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border:1px solid #dbe1eb;border-radius:12px"><tr><td style="padding:28px;background:#0b1120;color:#fff"><p style="margin:0 0 12px;color:#8ebdff">LOUNG TECH</p><h1 style="font-size:24px;margin:0">Novo orçamento recebido</h1></td></tr><tr><td style="padding:28px"><p>Nova solicitação recebida pelo site da Loung Tech.</p>' + rows.map(([key, value]) => '<p style="margin:20px 0 4px;font-size:12px;color:#52617a">' + escapeHtml(key) + '</p><div style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7">' + escapeHtml(value) + '</div>').join('') + '<p style="margin-top:28px"><a href="' + whatsapp + '" style="display:inline-block;padding:14px 20px;background:#245cdb;color:#fff;text-decoration:none;border-radius:6px">Conversar pelo WhatsApp</a></p><p style="font-size:11px;color:#64748b">Dados pessoais para atendimento comercial. Evite encaminhar esta mensagem fora da equipe responsável.</p></td></tr></table></td></tr></table></body></html>',
  };
}

export async function notifyBatch(db, env, fetcher = fetch, leadId = null) {
  const from = env('RESEND_FROM_EMAIL');
  const to = env('LEADS_NOTIFICATION_EMAIL');
  const apiKey = env('RESEND_API_KEY');
  if (!from || !to || !apiKey) return { processed: 0, failed: 0, unavailable: true };
  const lease = crypto.randomUUID();
  const { data: jobs, error } = await db.rpc('claim_lead_notifications', { p_lease: lease, p_lead_id: leadId, p_limit: leadId ? 1 : 10 });
  if (error) return { processed: 0, failed: 0, unavailable: true };
  let processed = 0, failed = 0;
  for (const job of jobs || []) {
    let sent = false, code = 'transport', providerId = null;
    try {
      const response = await fetcher('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'Idempotency-Key': 'loung-lead/' + job.lead.id },
        body: JSON.stringify(leadEmail(job.lead, { from, to })), signal: AbortSignal.timeout(12000),
      });
      const result = await response.json().catch(() => null);
      sent = response.ok && typeof result?.id === 'string';
      providerId = sent ? result.id : null;
      code = sent ? null : 'provider_' + response.status;
    } catch { /* Do not log lead data, provider bodies, or credentials. */ }
    // A lost acknowledgement leaves the lease for automatic retry, with the same Resend key.
    const finished = await db.rpc('finish_lead_notification', {
      p_lead_id: job.lead.id, p_lease: lease, p_sent: sent, p_error_code: code, p_provider_id: providerId,
    });
    if (sent && !finished.error && finished.data === true) processed++; else failed++;
  }
  return { processed, failed, unavailable: false };
}
