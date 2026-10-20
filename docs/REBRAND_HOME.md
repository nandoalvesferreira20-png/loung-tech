# Rebrand da home — 20/10/2026

Implementação na branch `main`, sem commit, push ou deploy.

## Escopo

- `index.html`: hero tipográfico, portfólio editorial com cinco entregas reais, seis soluções, processo em lista ordenada, sobre, contato e rodapé.
- `css/home.css`: design system exclusivo da home, com paleta oficial, regras para mobile/tablet/desktop, foco visível e movimento reduzido.
- `js/home.js`: habilita o menu recolhido somente quando o controlador existente carregou. Sem JavaScript, os links de navegação continuam visíveis.
- `img/favicon.ico` e `img/apple-touch-icon.png`: versões redimensionadas do logo oficial, sem redesenho ou alteração de cores.
- `img/previews/logo.png`: arquivo oficial preexistente e não rastreado no início da tarefa; preservado e referenciado diretamente no header, footer e Open Graph. Nenhum dos caminhos `images/preview/` ou `img/preview/` existe no checkout.

Os CSS compartilhados, painel, orçamento, integrações, rotas, scripts das demonstrações e transporte de UTMs não foram modificados. Todos os destinos originais da home e os seis parâmetros de serviço foram preservados.

## Decisões visuais

Preto no hero e nas soluções; off-white no portfólio e processo; verde-lima na chamada final e ações principais. O azul fica restrito aos links de projetos sobre fundo claro. Cinza é utilizado em texto sobre preto.

O primeiro projeto tem destaque horizontal no desktop e os quatro seguintes formam pares. Todos continuam identificados como projetos reais. As demonstrações mantêm páginas e avisos próprios; não foram promovidas a produtos comerciais.

Font Awesome deixou de ser uma dependência da home. O ícone do menu é desenhado em CSS e continua compatível com o controlador existente.

## Fontes

Bricolage Grotesque e Instrument Serif são carregadas por Google Fonts com `display=swap`. Seus projetos publicam licença SIL Open Font License 1.1:

- https://github.com/ateliertriay/bricolage/blob/main/OFL.txt
- https://github.com/google/fonts/blob/main/ofl/instrumentserif/OFL.txt

Não foi encontrado arquivo de Canva Sans nem licença de incorporação web no repositório. Arial/Helvetica é o fallback temporário explícito para corpo e interface. Não foi copiado nenhum arquivo proprietário da Canva. Aplicar Canva Sans depende de material e autorização apropriados.

## Verificações executadas

- `python tests/validate_site.py`: aprovado nas nove páginas abrangidas.
- `python tests/public_security.py`: aprovado contra a prévia local com bloqueio de arquivos privados.
- `node --test --test-isolation=none tests/admin.test.mjs tests/admin-auth.test.mjs tests/leads.test.mjs`: 15 testes aprovados, com serviços simulados. O modo padrão do runner foi bloqueado por `spawn EPERM`; o modo sem processos isolados executou a suíte.
- `node --check` nos três scripts utilizados pela home: aprovado.
- Simulação em memória do controlador de navegação com larguras 320, 390, 768, 1024 e 1440: abertura, Escape, clique externo, mudança de breakpoint e retorno ao topo aprovados. Isso verifica a lógica, não a renderização responsiva.
- Execução isolada de `js/campaign.js`: propagação de UTMs, preservação do parâmetro `servico` e manutenção do destino externo do WhatsApp aprovadas.
- Checagem adicional em memória: HTML balanceado, cinco projetos, seis soluções, quatro etapas, preservação de todos os destinos originais e parâmetros de serviço.
- HTTP 200 na home, novos CSS/JS, logo, favicon, touch icon, orçamento, privacidade, login e dashboard locais.
- `git diff --check`: aprovado.

## Pendências e limites

As regras responsivas contemplam as larguras solicitadas, mas a inspeção renderizada em 320, 390, 768, 1024 e 1440 px não foi concluída. Computer Use interrompeu a inspeção porque não conseguiu determinar com confiança a URL da janela do Chrome. Nenhuma captura nova foi produzida; as imagens antigas em `preview/` não representam este rebrand.

Antes da aprovação visual final, conferir essas cinco larguras no navegador: overflow horizontal, quebras com fontes carregadas, menu por toque/teclado/Escape, CTAs, zoom e posicionamento do foco. Testar também a propagação real das UTMs no navegador. As suítes de SQL/PGlite e integrações remotas não foram executadas nesta tarefa.

O formulário continua com a configuração pública vazia preexistente. Sua ativação não integra o escopo do rebrand. O retorno HTTP 200 das páginas secundárias confirma disponibilidade local dos arquivos, não operação remota de Auth ou envio de leads.

Para revisar, usar `python tools/preview_server.py --port 4173` e abrir http://127.0.0.1:4173/. Não servir a raiz com um servidor genérico.
