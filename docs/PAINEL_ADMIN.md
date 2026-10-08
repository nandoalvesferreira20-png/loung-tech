# Painel administrativo Loung Tech

Implementação estática isolada, sem deploy e sem aplicação remota de migrations. O formulário e o Resend permanecem independentes. O schema foi adaptado ao resumo existente em `docs/leads-schema.json`; constraints, triggers, grants e funções remotas ainda precisam de revisão autorizada.

## Arquitetura e arquivos

- `/admin` (`admin/index.html`): login por Supabase Auth, sem cadastro público.
- `/admin/dashboard` (`admin/dashboard/index.html`): indicadores reais, busca, filtros e páginas de 20 registros, detalhes em dialog nativo, contatos e atualização exclusiva de status.
- `admin/app.js`: SDK Supabase JS 2.57.4 via esm.sh, sessão persistida pelo SDK em armazenamento local, renovação automática e validação com `getUser`. Requer internet para carregar o SDK; não usa serviço Resend.
- `admin/helpers.mjs`: normalização de contatos, busca e datas em America/Sao_Paulo.
- `admin/admin.css`: reutiliza tokens e fonte do CSS público; nenhum menu público foi alterado.
- `admin/config.js`: configuração pública. `vercel.json`: rotas explícitas e no-store/noindex da área administrativa.
- `supabase/migrations/202610080002_admin_leads.sql`: autorização e privilégios incrementais. Testes em `tests/admin*.test.mjs`.

A sessão no navegador segue o mecanismo do SDK; não há cookie HttpOnly em um site exclusivamente estático. Use computadores confiáveis e saia ao terminar. O redirecionamento é uma proteção de interface; RLS e privilégios SQL são a barreira de acesso aos dados. As páginas HTML são públicas, os leads são privados.

## Configuração

`admin/config.js` foi configurado com apenas a URL e a chave pública existentes no `.env`. Para regenerar, execute `node tools/configure_admin.mjs`; o script aceita somente chave publishable ou JWT anon e não imprime valores. As variáveis públicas já previstas em `.env.example` são `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; Vercel não injeta essas variáveis automaticamente em JavaScript estático. Nunca use secret, service_role ou o conteúdo integral do `.env`.

No Supabase Auth, mantenha autenticação por e-mail/senha habilitada e desabilite novos cadastros públicos nas configurações do projeto. Não há formulário de registro, recuperação de senha ou confirmação por link nesta versão. A criação e recuperação das contas ficam sob responsabilidade do administrador no Supabase.

## Migrations e autorização dos quatro integrantes

1. Revise `docs/LEADS_PREFLIGHT.sql`, o schema, as constraints de status, triggers e políticas existentes em ambiente autorizado. Faça backup. Verifique também funções SECURITY DEFINER existentes que poderiam expor leads fora da tabela.
2. A migration `202610080001_lead_delivery.sql` pertence ao formulário. Revise seu histórico antes de aplicá-la. A migration `202610080002_admin_leads.sql` pressupõe `public.leads` existente; não recria a tabela nem altera registros. **Aplicar somente após autorização, primeiro em staging.** Não executar novamente manualmente se já constar no histórico.
3. Em Supabase Auth → Users, crie manualmente as quatro contas reais usando os e-mails dos integrantes. Defina senhas individuais por canal seguro e confirme as contas conforme a configuração do projeto. Não registre senhas no repositório.
4. Copie o UUID de cada conta e execute, no SQL Editor administrativo, uma inserção parametrizada como `insert into public.admin_users(user_id) values ('UUID_REAL_DO_INTEGRANTE'::uuid);`. Substitua o marcador por um UUID real antes de executar; repita para os quatro integrantes. Nenhum usuário é autorizado automaticamente pela migration.
5. Confira administrativamente `select user_id from public.admin_users;`. Para revogar acesso, remova a linha do UUID; RLS passa a negar novas consultas e atualizações. Desative a conta no Auth se necessário.

`admin_users` tem RLS de leitura apenas da própria linha, sem escrita pelo cliente. `is_loung_admin` usa SECURITY INVOKER e search_path vazio, sem recursão ou elevação de privilégios. Leads têm políticas permissivas específicas e guards restritivos que intersectam políticas antigas. Grants antigos de tabela e coluna para PUBLIC/anon/authenticated são revogados. Authenticated recebe SELECT dos campos necessários e UPDATE apenas de status; RLS exige associação em admin_users. INSERT/DELETE são negados. Grants diretos de service_role e RPCs do backend não são alterados. Audite grants herdados por outras roles e views/RPCs em produção, pois dependem da configuração real do projeto.

## Executar e usar

Execute `python tools/preview_server.py --port 4173` e acesse `http://127.0.0.1:4173/admin/`. Esse servidor bloqueia arquivos privados; não sirva a raiz com um servidor genérico que exponha `.env`.

Entre com a conta autorizada. Os indicadores consideram toda a tabela; filtros afetam a listagem. Busque empresa/responsável e selecione um status. Clique em Visualizar para ler a descrição completa e os metadados, abrir WhatsApp ou e-mail. Escolha o novo status e clique em Salvar status. Falhas mantêm a seleção para nova tentativa. Sair encerra a sessão pelo SDK. Datas são mostradas no horário de São Paulo.

## Validação

Execute `node --test tests/admin.test.mjs tests/admin-auth.test.mjs tests/admin-sql.test.mjs tests/leads.test.mjs tests/leads-sql.test.mjs`. O teste SQL usa a dependência local PGlite já disponível em `.local/node_modules`; em outra máquina, instale `@electric-sql/pglite` nesse diretório local. Todos os dados são fictícios. Testa acesso anônimo, autenticado sem autorização, autorização e revogação, políticas antigas amplas, tentativas de editar e-mail/inserir/apagar, status válidos e inválidos e acesso do backend. Os fluxos de login, senha inválida, autorização, logout e expiração são simulados em DOM/SDK locais, sem conexão com Auth remoto.

Antes de produção, em staging com contas de teste: valide senha correta/incorreta, conta sem admin_users, visitante direto no dashboard, logout e expiração/renovação da sessão. Confirme busca, cada filtro, paginação, descrição contendo `<script>` como texto, modal por teclado/Escape, atualização e falha de rede, estados vazios e layouts em 375/768/1440 px. Teste também via REST com chave pública e JWTs de teste: anon deve falhar, não autorizado deve receber zero linhas, autorizado deve consultar e alterar somente status. Não use service_role para validar RLS, pois ela a ignora.

## Vercel e diagnóstico

Publicação manual: projeto sem framework/build obrigatório, raiz como diretório estático. Preserve `.vercelignore` e `vercel.json`. Configure os dois valores públicos, valide staging e só publique com autorização. Nenhum deploy foi executado.

- Painel indisponível: config vazia, chave incorreta ou bloqueio de rede ao CDN/Supabase.
- Acesso negado: UUID ausente de admin_users ou projeto diferente do Auth.
- Falha ao consultar: migration não aplicada, grants/políticas incorretos ou conexão indisponível.
- Falha ao salvar: associação revogada, constraint/trigger incompatível ou rede. A seleção é preservada.
- Sessão expirada: autentique novamente; o SDK tenta renovar sessões válidas automaticamente.
- Indicadores vazios: não são mostrados valores fictícios; confira erro e permissões antes de assumir que a tabela está vazia.

Pendências: revisão e aplicação autorizada de SQL remoto, criação/autorização das quatro contas, testes reais de Auth e RLS em staging, conferência visual responsiva em navegador (a ferramenta de navegador falhou ao iniciar nesta sessão) e publicação manual.

Referências oficiais: [login por senha](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) e [segurança dos dados](https://supabase.com/docs/guides/database/secure-data).
