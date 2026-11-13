# TODO-AI — fila pronta para executores

> **Só o orquestrador escreve aqui.** Cada item tem brief completo e nenhuma dependência aberta no
> `TODO-HUMAN.md`. Modelo de tarefa, níveis de verificação e roteamento: [`README.md`](./README.md).
>
> Estados: `PENDENTE` → `EM_ANDAMENTO` → (`BLOQUEADA`) → `EM_REVISAO` → sai daqui no merge | `CANCELADA`
>
> Tarefa concluída **sai deste arquivo**: o registro é a PR e o git.

---

## Fila

### T-013 — App: tela de revisão e confirmação
- **Status**: EM_ANDAMENTO · **Complexidade**: alta · **Depende de**: T-008, T-012
- **Objetivo**: rota `/revisao`: lista os itens do `VoiceReview` com o que foi entendido
  (transcrição no topo), por item: alimento casado (ou escolher entre candidatos, ou buscar
  `GET /foods?q=`, ou cadastrar novo via `POST /foods` com macros por 100 g), quantidade/unidade
  editáveis, pedir peso quando `precisaPeso`, refeição (default pela hora), remover item.
  **Confirmar** cria um `POST /entries` por item com `voiceLogId` e `origem` voz/texto, depois
  navega ao painel. **Descartar** → `POST /voice/:id/discard`.
- **Propósito**: "nada é salvo sem confirmação" (PRODUTO.md); é a tela principal.
- **Fora de escopo**: edição de lançamentos já salvos (T-014), favoritos.
- **Critério de aceite**: RNTL verde: item `none` mostra "cadastrar"; escolher candidato troca o
  alimento; confirmar chama `POST /entries` N vezes com o payload certo (fetch mockado); item
  sem peso bloqueia confirmar com mensagem.
- **Verificação**: 4 — humano: fluxo completo gravar → revisar → confirmar → ver no painel.

### T-014 — App: painel do dia, histórico e lançamento manual
- **Status**: EM_ANDAMENTO · **Complexidade**: média · **Depende de**: T-008, T-012
- **Objetivo**: tela inicial vira o painel: `GET /days/:data` → kcal e macros consumidos × meta
  (barras), lista por refeição com editar (gramas/refeição) e apagar; setas para dia
  anterior/seguinte (F8); tela de meta (`PUT /goals`); lançamento manual (buscar alimento,
  informar quantidade) → `POST /entries` origem `manual`. Exibição com `formatMacros`.
- **Propósito**: F2, F6, F7 e F8.
- **Fora de escopo**: gráficos semanais, exportar.
- **Critério de aceite**: RNTL verde: painel renderiza totais arredondados (1 casa g, inteiro
  kcal) a partir de resposta mockada; navegação de dia muda a data pedida; apagar chama DELETE.
- **Verificação**: 4 — humano: ver o dia, editar e apagar um lançamento, trocar a meta.

### T-017 — Fechar o ciclo do `voice_log`: origem texto com vínculo e status `confirmado`
- **Status**: PENDENTE · **Complexidade**: média · **Depende de**: T-013
- **Objetivo**: (1) `CreateEntrySchema` passa a aceitar `voiceLogId` com `origem` ∈ voz|texto
  (hoje só voz; `processText` cria `voice_log` de origem texto e a revisão perde o vínculo).
  (2) `createEntry` com `voiceLogId` marca o `voice_log` como `confirmado` (idempotente; só se
  `pendente` ou já `confirmado`; `descartado` → 404). (3) `discardVoiceLog` continua só para
  `pendente`. (4) No app, `revisao.tsx` volta a enviar `voiceLogId` também na origem texto.
- **Propósito**: `voice_logs` reflete o que foi confirmado ou descartado; nada fica `pendente`
  para sempre depois de confirmado.
- **Fora de escopo**: limpeza periódica de pendentes antigos (BACKLOG), endpoint novo.
- **Critério de aceite**: testes em `shared`, `entries-core`, `rest-api` e `mobile` verdes:
  `POST /entries` com `origem: "texto"` + `voiceLogId` → 201 e `voice_log.status =
  "confirmado"`; segundo POST com o mesmo `voiceLogId` → 201 (continua confirmado); discard
  de um confirmado → 404; app envia `voiceLogId` na revisão por texto.
- **Verificação**: 1.
