# Prévia local — Loung Tech

As melhorias foram recuperadas do commit `a6313dd`, ainda disponível no histórico local. Foram corrigidos conflitos de JavaScript e caminhos das demonstrações após o rebase. Os endereços antigos encaminham para as páginas em `projetos/`.

Backup anterior à recuperação: `C:\Users\Arklok\AppData\Local\Temp\loung-tech-before-recovery.zip`.

Para abrir: execute `python -m http.server 4173 --bind 127.0.0.1` na raiz e acesse http://127.0.0.1:4173/.

## Resultado

- Página principal escura e azul, WhatsApp em destaque e menu adaptado ao celular.
- Projetos reais primeiro: Rafael Munhoz e Dra. Gabriella Barros, com capturas dos sites e links seguros.
- Seis demonstrações com identidades próprias e interações funcionais.
- Capturas atualizadas em `img/previews/`; versões de celular nesta pasta.
- Contatos originais preservados. Nenhum site de cliente alterado.

## Validação

- Seis modelos inspecionados em 1280, 390 e 320 pixels. Corrigido um título da academia que transbordava em 320 pixels.
- Página principal no computador e no celular; menu abre, fecha ao selecionar seção e fecha com Esc.
- Clínica: especialidade, dia, horário, resumo e confirmação fictícia.
- Loja: filtros, tamanho, sacola, quantidade, subtotal, remoção, persistência e conclusão simulada.
- Tarefas: criação, edição, movimentação, busca, estado vazio, exclusão e restauração.
- Academia: plano, resumo e confirmação simulada.
- API: respostas ilustrativas 200, 201, 400, 401 e 500; exemplos copiáveis.
- Automação: seleção, início, pausa, avanço manual, conclusão e reinício.
- Links locais, âncoras, arquivos de imagens, IDs, H1, contatos e conflitos verificados por `python tests/validate_site.py`.
- Sintaxe JavaScript validada. Retorno ao portfólio, imagens e console revisados no navegador.

Os testes mobile usam larguras de navegador, não aparelhos físicos. Todas as operações são simulações: nenhum agendamento, compra, pagamento, mensagem ou requisição externa é realizado. Sacola e tarefas ficam no navegador, com opção de restauração.

Nenhuma publicação ou push foi realizado.
