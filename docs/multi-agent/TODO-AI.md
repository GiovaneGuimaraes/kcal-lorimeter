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
