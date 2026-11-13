# TODO-AI — fila pronta para executores

> **Só o orquestrador escreve aqui.** Cada item tem brief completo e nenhuma dependência aberta no
> `TODO-HUMAN.md`. Modelo de tarefa, níveis de verificação e roteamento: [`README.md`](./README.md).
>
> Estados: `PENDENTE` → `EM_ANDAMENTO` → (`BLOQUEADA`) → `EM_REVISAO` → sai daqui no merge | `CANCELADA`
>
> Tarefa concluída **sai deste arquivo**: o registro é a PR e o git.

---

## Fila

### T-017 — Fechar o ciclo do `voice_log`: origem texto com vínculo e status `confirmado`
- **Status**: EM_ANDAMENTO · **Complexidade**: média · **Depende de**: T-013
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
