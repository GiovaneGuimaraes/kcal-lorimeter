# TODO-AI — fila pronta para executores

> **Só o orquestrador escreve aqui.** Cada item tem brief completo e nenhuma dependência aberta no
> `TODO-HUMAN.md`. Modelo de tarefa, níveis de verificação e roteamento: [`README.md`](./README.md).
>
> Estados: `PENDENTE` → `EM_ANDAMENTO` → (`BLOQUEADA`) → `EM_REVISAO` → sai daqui no merge | `CANCELADA`
>
> Tarefa concluída **sai deste arquivo**: o registro é a PR e o git.

---

## Fila

Origem desta onda: [`docs/HANDOFF-DESIGN-D.md`](../HANDOFF-DESIGN-D.md) (correções da review +
visual D "Cartaz"). Os briefs abaixo referenciam as seções do handoff em vez de repeti-las.

### T-022 — Visual D: telas de entrar, criar conta, meta e lançar
- **Status**: EM_ANDAMENTO · **Complexidade**: alta · **Depende de**: T-021
- **Objetivo**: handoff § 2.4.1, 2.4.2, 2.4.5, 2.4.6. Login amarelo com "FALA / QUE A / GENTE /
  CONTA.", cadastro derivado, meta com `TopBar`, lançamento com busca e `SegmentedRow` (sem "ml")
  e aceitando `refeicao` por parâmetro (§ 2.6 linha 3).
- **Propósito**: as quatro telas simples no visual D, comportamento inalterado.
- **Fora de escopo**: painel, editor, revisão.
- **Critério de aceite**: RNTL verde com `getByRole(..., { name: /entrar/i })` etc.; prints
  390×844 das 4 telas comparáveis ao canvas.
- **Verificação**: 1 + prints.

### T-023 — Visual D: painel do dia e editor do lançamento
- **Status**: EM_ANDAMENTO · **Complexidade**: alta · **Depende de**: T-021
- **Objetivo**: handoff § 2.4.3 e 2.4.4 + `formatKcal` com separador de milhar (§ 2.6 linha 4).
  Cabeçalho com iniciais e menu "Sair" (aplica F-2), navegação de dia, bloco herói "AINDA CABEM"
  (+N e "PASSOU DE HOJE" acima da meta; "SEM META" + botão), grade de macros, refeições com
  "+ adicionar" (passa `refeicao` ao lançamento), barra fixa com **"TOQUE E FALE"** (tocar para
  começar / tocar para parar — H-012) e lápis para digitar, editor inline com faixa de 3 botões e
  "APAGAR MESMO?".
- **Propósito**: a tela principal no visual D; o número que importa é o maior da tela.
- **Fora de escopo**: revisão (T-024), quantidade/unidade originais no lançamento (BACKLOG).
- **Critério de aceite**: RNTL verde (os 8 casos de gravação do `home.test` continuam; novos:
  herói com "1.215", "+120" acima da meta, "SEM META", "+ adicionar" navega com `refeicao`,
  "APAGAR MESMO?" → DELETE); prints 390×844: painel sem meta, com meta, com item, editor, apagar,
  ontem.
- **Verificação**: 1 + prints.

### T-024 — Visual D: revisão da voz
- **Status**: EM_ANDAMENTO · **Complexidade**: alta · **Depende de**: T-020, T-021
- **Objetivo**: handoff § 2.4.7. `TopBar` "CONFERE?", bloco preto "VOCÊ DISSE", `SegmentedRow` de
  refeição, itens numerados com kcal (da API; ao editar a quantidade, recalcular com
  `macrosForGrams` do `@kcal/nutrition-core` a partir do `match.food`, § 2.6 linha 2), item
  pendente listrado com "BUSCAR | CADASTRAR | TIRAR", rodapé "TOTAL · N DE M ITENS" + "SALVAR" /
  "RESOLVA O ITEM 04" / "DESCARTAR".
- **Propósito**: a tela de confirmação no visual D, com os kcal visíveis antes de salvar.
- **Fora de escopo**: mudar o contrato de confirmação (T-008/T-017 valem).
- **Critério de aceite**: RNTL verde (os casos atuais de `revisao.test` continuam; novos: kcal por
  item e total; editar quantidade atualiza o kcal com a mesma função do servidor; botão com
  "RESOLVA O ITEM 02" quando há pendência); prints 390×844: revisão com pendência e pronta.
- **Verificação**: 1 + prints.
