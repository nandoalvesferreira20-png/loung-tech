# Formulário comercial da Loung Tech

## Estado da entrega

Implementado e testado localmente. **Não publicado e não operacional em produção.** O `.env` existente não foi editado. Não houve gravação remota de leads, envio real de e-mail, implantação de função, agendamento ou aplicação de migration.

A inspeção remota foi somente leitura: OpenAPI confirmou nomes, tipos, obrigatoriedade e defaults dos campos de `public.leads` (resumo sem dados em `leads-schema.json`). Uma leitura anônima com `select=id&limit=0` retornou HTTP 401. Isso confirma a recusa daquela requisição, não uma auditoria completa das políticas. CHECK constraints, triggers, políticas e privilégios precisam ser revisados no SQL Editor com `LEADS_PREFLIGHT.sql` antes de aplicar qualquer alteração. Não foram encontradas migrations anteriores locais.

## Arquitetura e arquivos

- `orcamento/index.html`, `style.css`, `script.js`: página estática, validação acessível, máscara, consentimento, estados de erro/recebimento e proteção contra clique repetido.
- `orcamento/validation.mjs`: regras comuns do navegador e servidor; política `2026-10-08`, serviços `site`, `sistema`, `loja`, `automacao`, `outro`; telefone normalizado `+55DDDnumero`.
- `orcamento/config.js`: somente URL pública da função e site key pública do Turnstile. Está vazio de propósito.
- `js/campaign.js`: transporta três UTMs da URL aos links de orçamento. Sem cookies, analytics ou armazenamento de dados pessoais.
- `supabase/functions/submit-lead/index.ts` e `_shared/handler.mjs`: endpoint público POST/OPTIONS; validação, Turnstile e limites compartilhados, seguido da transação de recebimento.
- `_shared/email.mjs`: notificação Resend com HTML escapado, texto alternativo, reply-to e WhatsApp validado; horário de São Paulo.
- `retry-lead-notifications/index.ts`: worker privado de recuperação de notificações.
- `supabase/migrations/202610080001_lead_delivery.sql`: migration incremental **preparada apenas**. Adiciona schema privado, recibos idempotentes, contadores e fila; não recria `leads`, não apaga registros e não desativa RLS.
- `privacidade/index.html`: versão inicial para revisão institucional.
- `vercel.json`: rotas estáticas e cabeçalhos; `.vercelignore` exclui fontes de backend, testes, documentação, dependências locais e `.env` do deploy do site.
- `tests/leads.test.mjs`, `leads-sql.test.mjs`, `browser-fixture.js`: testes com dados fictícios e serviços simulados; PostgreSQL local via PGlite.
- `tools/preview_server.py`: servidor de prévia que bloqueia arquivos privados. Não use `python -m http.server` na raiz, pois poderia servir `.env`.

Arquivos existentes modificados nesta entrega: `index.html` (CTAs e links), `css/style.css` (links dos serviços e rodapé), `js/script.js` (guarda para navegação sem âncora) e `tests/validate_site.py` (rotas novas e preservação do portfólio). `.gitignore`, `.vercelignore`, `.env.example`, `vercel.json` e os diretórios de formulário/backend/documentação são novos. As alterações comerciais e imagens de portfólio já presentes no workspace foram preservadas.

Fluxo: formulário → validação local → Turnstile → função → validação de campos/consentimento/origem → rate limit SQL → recibo idempotente → validação server-side do token → transação que grava lead + recibo + trabalho de e-mail → tentativa de notificação → confirmação ao visitante. O e-mail não desfaz a gravação; falhas permanecem na fila.

## Configuração sem exposição de segredos

O `.env` local contém nomes `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABSE_SECRET_KEY` e `LEADS_NOTIFICATION_EMAIL`. O nome `SUPABSE_SECRET_KEY` está grafado assim no arquivo existente; não foi corrigido nem consumido pelo site. Nunca copie essa chave para `config.js`. Variáveis locais não se tornam automaticamente Secrets remotos.

O site precisa apenas de `endpoint` e `turnstileSiteKey` no objeto de `orcamento/config.js`. Não há SDK Supabase no navegador nem leitura/inserção direta na tabela. A chave publishable existente não é necessária nesse fluxo.

No Dashboard do projeto Supabase, abra **Edge Functions → Secrets** e configure:

| Nome | Uso |
| --- | --- |
| `RESEND_API_KEY` | Segredo Resend, com permissão de envio |
| `RESEND_FROM_EMAIL` | Remetente no domínio verificado, por exemplo `Loung Tech <orcamentos@example.com>` |
| `LEADS_NOTIFICATION_EMAIL` | Caixa da equipe responsável |
| `TURNSTILE_SECRET_KEY` | Segredo do widget de produção |
| `ALLOWED_ORIGINS` | Origens HTTPS exatas separadas por vírgula, sem barra final |
| `TURNSTILE_HOSTNAMES` | Hostnames permitidos, separados por vírgula, sem protocolo |
| `LEADS_RATE_LIMIT_SECRET` | Segredo aleatório de pelo menos 32 caracteres para HMAC |
| `LEADS_RETRY_SECRET` | Outro segredo aleatório de pelo menos 32 caracteres, exclusivo do worker |
| `LEADS_ENABLED` | `false` inicialmente; `true` somente após validação completa |
| `PRIVACY_POLICY_APPROVED` | `false` inicialmente; `true` após revisão institucional |

O ambiente de Edge Functions injeta `SUPABASE_URL` e `SUPABASE_SECRET_KEYS`, um dicionário JSON com chave `default`. O código usa essa chave administrativa no servidor; aceita `SUPABASE_SERVICE_ROLE_KEY` legado como fallback. Não crie Secrets personalizados com prefixo reservado `SUPABASE_`. Para execução local de funções, use arquivo próprio ignorado `supabase/functions/.env`, nunca publique nem registre esse arquivo. Consulte `.env.example`, que contém apenas placeholders.

Sem configurações completas, autorização de privacidade ou antiabuso, a função retorna indisponibilidade e não grava. A página publicada também fica indisponível enquanto a configuração pública estiver vazia. Não há modo de contornar Turnstile em produção; as fixtures são exclusivas do servidor local de testes.

## Banco e migração: revisão antes de aplicar

1. Fazer backup e executar o preflight somente leitura em ambiente autorizado, de preferência primeiro em staging.
2. Conferir constraints e triggers: a implementação envia `status='novo'`, `source='site'`, `notification_status='pendente'`, depois `'enviado'`, e os cinco slugs de serviço acima. OpenAPI confirmou os defaults `novo/site/pendente`, mas **não confirmou valores permitidos por CHECK**. Havendo divergência, ajustar o código/migration incremental antes de aplicar; não remover constraints cegamente.
3. Revisar políticas e privilégios públicos, inclusive grants herdados de PUBLIC e grants por coluna. A migration revoga grants da role `anon` na tabela e restringe RPCs a `service_role`, preservando as políticas existentes. Se houver exposição por outros caminhos, preparar correção explícita antes de ativar; RLS deve permanecer habilitado.
4. Revisar a migration, aplicar **somente com autorização** no projeto correto. Ela é transacional e aborta se a tabela/tipos/RLS esperados não estiverem presentes. Não executá-la duas vezes manualmente; usar o histórico de migrations.
5. Verificar que `lead_private` não está em schemas expostos pela Data API; nunca conceder acesso público. Conferir revokes e funções SECURITY DEFINER com `search_path` vazio.

Contadores SQL são atômicos e compartilhados entre instâncias: global 60/minuto, por e-mail 5/15 minutos e, quando disponível, por IP 10/15 minutos. E-mail/IP ficam como HMAC, sem IP bruto. O limite global continua efetivo mesmo se alguém falsificar o cabeçalho de IP. Antes de produção, confirmar o comportamento de `x-forwarded-for` da infraestrutura; ele é sinal auxiliar, não autenticação. Limites usam janelas fixas e podem precisar de ajuste conforme tráfego real. CORS restringe navegadores, mas não substitui Turnstile/rate limiting.

## Turnstile e Resend

Criar widget Turnstile para os hostnames reais. Configurar site key no arquivo público e secret somente no Supabase. O servidor exige `success`, hostname igual ao da origem e action `submit-lead`; rejeita tokens excessivos e chaves oficiais de teste no endpoint de produção. Para staging, cadastrar seu hostname HTTPS separado. Não autorizar origens genéricas nem wildcard.

No Resend, verificar domínio e DNS do remetente. Configurar destinatário interno autorizado. `reply_to` recebe o e-mail validado do visitante. A chave idempotente é `loung-lead/<uuid-do-lead>`. `notification_status='enviado'` significa que a API aceitou o e-mail e retornou ID; **não comprova entrega na caixa**. Conferir logs de entrega/bounce do Resend. Não foi configurado webhook nem prometida confirmação de entrega.

Não editar os dados de um lead enquanto sua notificação estiver sendo reprocessada: a chave idempotente pressupõe conteúdo estável. O visitante vê apenas recebimento do pedido após persistência; nunca uma afirmação de entrega do e-mail.

## Recuperação de notificações

O recebimento grava a fila na mesma transação que o lead. Workers obtêm lease de 3 minutos com `FOR UPDATE SKIP LOCKED`; a finalização exige o mesmo lease. Retry exponencial, até 8 tentativas. Falha ou timeout de e-mail mantém `notification_status='pendente'`. A chave estável protege retries, inclusive resposta perdida do provedor.

O Resend mantém idempotência por 24h. Por segurança, a fila para automaticamente em `review` após 23h da primeira tentativa, ou ao esgotar tentativas. **Não zerar tentativas, apagar recibos, gerar nova chave ou reenviar cegamente.** Conferir primeiro o ID/logs do provedor e o destinatário; resolver manualmente mediante autorização. Isso reduz duplicidade sem prometer garantia absoluta de exatamente um e-mail entre serviços independentes.

O worker tem `verify_jwt=true` e exige adicionalmente `x-leads-retry-secret`. Para chamada administrativa, utilizar `Authorization: Bearer <JWT service_role legado válido do projeto>` mais esse header; novas `sb_secret_...` não são JWT Bearer. Nunca colocar esses valores no frontend, URLs, logs ou documentação. Se o projeto não disponibilizar JWT apropriado, não desativar a verificação: revisar autenticação do worker antes de agendar.

**Agendamento remoto pendente.** Após autorização e deploy, configurar cron do Supabase a cada 5 minutos, usando pg_cron/pg_net e Supabase Vault para URL, JWT administrativo e segredo do worker. O cron chama via POST `/functions/v1/retry-lead-notifications`, com Content-Type application/json e body `{}`. Criar Secrets no Vault pelo Dashboard, restringir acesso e evitar valores literais no SQL/histórico. Alternativamente, executar o mesmo POST a partir de um job administrativo seguro. Conferir resposta `processed/failed/unavailable` e execução do cron; não usar navegador público. Enquanto não houver scheduler, falhas não se recuperam sozinhas, embora estejam registradas para esse procedimento.

Consultar com acesso administrativo no SQL Editor (dados pessoais: acesso só à equipe responsável):

```sql
select id, created_at, status, service_type, notification_status, notified_at
from public.leads order by created_at desc limit 50;
select lead_id, state, attempts, next_attempt_at, last_error_code, provider_id
from lead_private.notification_jobs order by created_at desc limit 50;
```

Não habilitar leitura pública para montar painel. Contadores expirados podem ser limpos por job administrativo diário (`expires_at < now() - interval '1 day'`); preparar e autorizar esse job separadamente. Recibos acompanham o lead e não devem ser removidos enquanto retries de recebimento forem possíveis.

## Testes e prévia local

Não existe build frontend: HTML/CSS/JS são servidos diretamente. Node é usado só nos testes. Deno verifica as funções, sem deploy.

```powershell
python tools/preview_server.py --test-fixtures
python tests/validate_site.py
python tests/public_security.py
node --test tests/leads.test.mjs tests/leads-sql.test.mjs
$env:DENO_DIR = Join-Path (Get-Location) '.local/deno-cache'
.\.local\node_modules\.bin\deno.cmd check --lock=supabase/functions/deno.lock supabase/functions/submit-lead/index.ts supabase/functions/retry-lead-notifications/index.ts
```

Dependências de teste, se ausentes: `npm install --prefix .local --no-save @electric-sql/pglite deno`. A pasta é ignorada no Git/deploy. As funções importam o SDK oficial Supabase, com lockfile; não instalar framework frontend.

Prévia pública: `http://127.0.0.1:4173/orcamento`. Fixtures: `/__test/form?scenario=success` (também `network`, `database`, `resend`, `slow`, `unconfigured`, `spam`). Todas exibem aviso explícito e usam apenas dados fictícios. Nenhum token real de CAPTCHA, request Supabase ou e-mail sai dessas fixtures. Nunca publicar esse servidor de testes.

Testes automatizados cobrem campos/formatos/serviços/consentimento, limites de corpo, CORS, proteção sem config, Turnstile/hostname/action, rate limit, duplicidades e falhas de rede/banco/e-mail. PGlite executa a migration em PostgreSQL local com tabela fictícia e verifica recibos, fila, lease, retries, status e recusa anônima. Isso não substitui o teste integrado no Supabase remoto.

Teste integrado de staging ainda necessário: autorizar dados fictícios e destinatário interno de teste, validar token real, persistência real, restrições públicas, aceitação e entrega do e-mail, perda de resposta, reprocessamento por cron e ausência de duplicatas. Não criar leads de produção para testar sem autorização.

### Resultado da validação local — 08/10/2026

- 11 testes Node/PGlite aprovados; type check Deno das duas funções aprovado com SDK fixado em `2.117.3`.
- Nove páginas verificadas para referências locais, âncoras, IDs, H1, links externos seguros, contatos e cinco projetos reais; sem erros.
- Assets públicos comparados às credenciais locais sem imprimir valores; nenhuma correspondência de segredo. GET de `.env`, `.git/config`, fontes de backend, documentação e testes recusados pela prévia. Rotas estáticas responderam 200.
- Navegador: campos vazios, e-mail/telefone/descrição inválidos, consentimento ausente, indisponibilidade sem config, erro de rede com preservação e retry de mesma chave/um registro fictício, falha do banco, rate limit, confirmação sem depender do e-mail e clique duplo com uma tentativa. Dados fictícios exclusivamente.
- Larguras 320, 390, 768, 1024 e 1440 verificadas sem rolagem horizontal; menu mobile abre/fecha e some no desktop. Tab move foco e exibe contorno. Serviço por URL e UTMs transportados pelos CTAs verificados. Política acessível e WhatsApp alternativo preservado.
- Capturas em `preview/orcamento-desktop.jpg`, `orcamento-mobile.jpg` e `orcamento-primeira-tela.jpg`; elas mostram a página pública ainda indisponível para envio.
- Projeto continua estático, sem etapa de build frontend. A migration foi executada somente no PostgreSQL local fictício. Aceitação/entrega real Resend, CAPTCHA real e scheduler remoto **não testados**.

## Implantação futura, não executada

Somente após revisão e autorização do responsável:

1. Confirmar política, constraints/RLS, domínio remetente e hostnames.
2. Aplicar migration no projeto correto, primeiro em staging.
3. Configurar Secrets mantendo flags desativadas inicialmente.
4. Com CLI Supabase oficial autenticada, implantar cada função usando o project ref conferido: `supabase functions deploy submit-lead --project-ref <ref>` e `supabase functions deploy retry-lead-notifications --project-ref <ref>`. O `supabase/config.toml` desativa JWT **somente** em submit-lead; não usar `--no-verify-jwt` no worker.
5. Configurar worker/scheduler seguro e realizar teste integrado autorizado. Ativar flags apenas no ambiente de teste já preparado; não deixar endpoint de produção aberto durante preparação.
6. Preencher configuração pública com URL e site key daquele ambiente, testar navegador e depois aprovar ativação/publicação de produção. `.env` não é injetado automaticamente no HTML.
7. Publicar arquivos estáticos na Vercel apenas quando autorizado. Confirmar rewrites, exclusão de arquivos privados, cache de config, HTTPS, rotas, CTAs, portfólio e contato alternativo.

## Privacidade e operação

A política é um rascunho: confirmar razão social/identificação do controlador, endereço, contato responsável, prazo e critérios de retenção, prestadores e eventual transferência internacional. A finalidade é atender orçamento, sem marketing automático. `consent_at` vem do relógio do banco e a versão é validada pelo servidor; checkbox não é pré-marcado.

Recomendação inicial para decisão da empresa: revisar leads não convertidos após 90 dias, definindo exclusão ou retenção justificada; clientes/contratos podem ter obrigações distintas. Não há limpeza automática de leads nem afirmação de prazo legal universal.

Pedidos de acesso/correção/exclusão chegam pelo contato da política. Verificar identidade proporcionalmente, localizar apenas os registros pertinentes por acesso administrativo e fornecer exportação por canal seguro. Exclusão exige confirmação do responsável, análise de obrigações de retenção e registro operacional sem copiar o conteúdo pessoal. Executar transação limitada aos IDs conferidos; as tabelas privadas vinculadas usam cascade. Considerar também e-mails na caixa da equipe, logs/retenção do Resend, backups e prestadores; documentar limitações e prazo de expiração desses backups. Não apagar em massa nem executar exclusão só com e-mail não verificado.

Não registrar payloads, segredos, tokens ou respostas completas do banco/provedor em logs. Não enviar dados do formulário a analytics. O banco e os e-mails contêm dados pessoais e exigem acesso restrito, gestão de credenciais e revisão de retenção pela empresa.

## Referências oficiais

- [Supabase: Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase: autenticação das funções](https://supabase.com/docs/guides/functions/auth-headers)
- [Supabase: dependências](https://supabase.com/docs/guides/functions/dependencies)
- [Supabase: agendamento](https://supabase.com/docs/guides/functions/schedule-functions)
- [Cloudflare: validação server-side](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare: testes](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [Resend: envio](https://resend.com/docs/api-reference/emails/send-email)
- [Resend: idempotência](https://resend.com/docs/dashboard/emails/idempotency-keys)
