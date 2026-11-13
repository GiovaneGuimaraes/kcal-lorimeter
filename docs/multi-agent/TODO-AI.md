# TODO-AI — fila pronta para executores

> **Só o orquestrador escreve aqui.** Cada item tem brief completo e nenhuma dependência aberta no
> `TODO-HUMAN.md`. Modelo de tarefa, níveis de verificação e roteamento: [`README.md`](./README.md).
>
> Estados: `PENDENTE` → `EM_ANDAMENTO` → (`BLOQUEADA`) → `EM_REVISAO` → sai daqui no merge | `CANCELADA`
>
> Tarefa concluída **sai deste arquivo**: o registro é a PR e o git.

---

## Fila

### T-006 — `foods-core` + rotas: listar, cadastrar e casar alimento por nome
- **Status**: EM_ANDAMENTO · **Complexidade**: alta · **Depende de**: T-002, T-005
- **Objetivo**: `packages/foods-core` (`@kcal/foods-core`), `db` injetado, uma função por arquivo:
  `listFoods(db, userId, {q?})` (padrões + os da pessoa, nunca de outra; filtro por nome/apelido),
  `createFood(db, userId, input)`, `updateFood(db, userId, foodId, patch)` (só os próprios; 404
  se for padrão ou de outro), `matchFood(db, userId, texto)` → `{ kind: "exact", food } |
  { kind: "candidates", foods[] } | { kind: "none" }`: normaliza (minúsculas, sem acento,
  singular simples), tenta nome e apelidos exatos, depois prefixo/contém, depois similaridade
  (trigramas ou Levenshtein, limiar documentado), preferindo o alimento da pessoa ao padrão em
  empate. Rotas na `rest-api` com `requireUser`: `GET /foods?q=`, `POST /foods`,
  `PATCH /foods/:id`, `GET /foods/match?texto=`. Schemas em `@kcal/shared` (`src/foods.ts`).
- **Propósito**: a extração devolve nomes falados; é aqui que viram alimento do banco.
- **Fora de escopo**: lançamentos, porções caseiras, apagar alimento, UI.
- **Critério de aceite**: `pnpm --filter @kcal/foods-core test` e `pnpm --filter @kcal/rest-api
  test` verdes: lista não traz alimento de outro usuário; "arroz" casa exato com "arroz branco
  cozido" via apelido; "frango" devolve candidatos (grelhado, cozido…); "xyz" → none;
  "Frangô" (acento/caixa) casa; próprio da pessoa ganha empate; PATCH em padrão → 404.
- **Verificação**: 1.

### T-008 — `entries-core` + rotas: lançamentos com snapshot e totais do dia
- **Status**: PENDENTE · **Complexidade**: alta · **Depende de**: T-004, T-006, T-007
- **Objetivo**: `packages/entries-core` (`@kcal/entries-core`), `db` injetado: `createEntry(db,
  userId, {data, refeicao, foodId, quantidade, unidade, origem, voiceLogId?})` → converte com
  `gramsFromQuantity` + `macrosForGrams` do `nutrition-core` e grava o **snapshot**;
  `updateEntry` (quantidade/refeicao/data; recalcula snapshot a partir do alimento **atual**),
  `deleteEntry`, `listEntriesForDate(db, userId, data)` agrupado por refeição, `getDaySummary(db,
  userId, data)` → `{ consumido: Macros, meta: GoalDto | null, restante, entradas }` usando
  `sumMacros` + `getGoalForDate`. Alimento deve ser visível ao usuário (padrão ou dele); senão
  404. Rotas com `requireUser`: `GET /days/:data` (resumo + lançamentos), `POST /entries`,
  `PATCH /entries/:id`, `DELETE /entries/:id`. `server.ts` roda `seedDefaultFoods(db)` no boot.
  Schemas em `@kcal/shared` (`src/entries.ts`); `refeicao` ∈ cafe|almoco|lanche|jantar.
- **Propósito**: o painel do dia (F7) e o histórico (F8) só leem daqui; editar alimento não
  muda dias passados.
- **Fora de escopo**: voz, UI, refeições favoritas, exportação.
- **Critério de aceite**: `pnpm --filter @kcal/entries-core test` e `rest-api test` verdes: 200 g
  de arroz grava snapshot = 2 × valor/100 g; editar o alimento depois **não** muda a entrada;
  unidade `scoop` sem porção → 400; alimento de outro usuário → 404; resumo soma só do dia e do
  usuário; `restante` = meta − consumido (null sem meta); DELETE de outro → 404.
- **Verificação**: 1.

### T-011 — `voice-core` + rota de upload: áudio → transcrição → extração → casamento
- **Status**: PENDENTE · **Complexidade**: alta · **Depende de**: T-006, T-009, T-010
- **Objetivo**: `packages/voice-core` (`@kcal/voice-core`): `processVoice({db, transcriber,
  extractor}, userId, audio)` → transcreve, extrai itens, casa cada item com `matchFood`, grava
  `voice_logs` (transcricao, extracao_json, status `pendente`) e devolve `VoiceReview = {
  voiceLogId, transcricao, itens: [{ extraido, match: MatchFoodResult, gramas?: number }] }`
  (gramas calculados quando houve `exact` e a unidade resolve; senão ausente). Também
  `processText(deps, userId, texto)` (mesmo fluxo sem STT, origem `texto`) e
  `discardVoiceLog(db, userId, id)`. O áudio **não** é gravado em disco nem no banco. Rotas:
  `POST /voice` (multipart `audio`, máx. 5 MB, 60 s não verificável aqui), `POST /voice/text`
  (`{texto}`), `POST /voice/:id/discard`. `server.ts` monta `createOpenAiTranscriber` e
  `createItemExtractor` a partir do env; sem chave → rota devolve 503 `{erro}` claro.
- **Propósito**: é o F5; a tela de revisão (T-013) consome `VoiceReview` e confirma via T-008.
- **Fora de escopo**: confirmar lançamentos (T-008 cria com `voiceLogId`), UI, retry/fila.
- **Critério de aceite**: `pnpm --filter @kcal/voice-core test` e `rest-api test` verdes com
  STT/LLM **fakes injetados**: frase com 3 itens → 3 itens com match (exact/candidates/none
  conforme o seed); transcrição vazia → erro 422; `voice_log` salvo com `user_id` certo;
  discard de outro usuário → 404; `POST /voice` sem chave → 503; nenhum arquivo em disco.
- **Verificação**: 1.
