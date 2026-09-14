# Prévia local — Loung Tech

O repositório corresponde à empresa, aos contatos e às seis demonstrações do site informado. O HTML publicado tinha uma estrutura diferente da versão local; as alterações foram feitas no projeto conectado, sem publicação.

Para abrir localmente: `python -m http.server 4173 --bind 127.0.0.1`, na raiz do projeto, e acessar http://127.0.0.1:4173/.

## Validação

- Página principal inspecionada no navegador em 320, 390, 760, 768, 1024 e 1440 pixels, sem transbordamento horizontal.
- Menu mobile: abrir, selecionar seção, fechar com Esc e devolver foco ao botão.
- Navegação até contato, abertura de demonstração e retorno ao portfólio.
- Seis páginas de demonstração abertas; imagens capturadas a partir delas em `img/previews`.
- Links locais, arquivos referenciados, âncoras, IDs únicos e título principal validados.
- Sintaxe JavaScript validada; nenhum erro de console no teste final da página principal.
- WhatsApp, Instagram e e-mail da empresa preservados. Nenhuma mensagem enviada.

As demonstrações continuam sendo protótipos: não foram transformadas em lojas, sistemas ou integrações operacionais. As prévias são capturas estáticas e devem ser atualizadas quando o visual dos projetos mudar. Os testes mobile usaram larguras de navegador, não aparelhos físicos.

Nenhuma alteração foi publicada em produção.
