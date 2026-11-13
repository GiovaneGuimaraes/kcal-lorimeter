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

### T-007 — `goals-core` + rotas: meta diária
- **Status**: EM_ANDAMENTO · **Complexidade**: média · **Depende de**: T-005
- **Objetivo**: `packages/goals-core` (`@kcal/goals-core`): `setGoal(db, userId, {kcal,
  proteinaG, carboG, gorduraG, vigenteDesde?})` (insere nova linha; histórico preservado),
  `getGoalForDate(db, userId, data)` (a vigente mais recente ≤ data; null se nenhuma).
  Rotas `GET /goals?data=` e `PUT /goals` com `requireUser`. Schemas em `@kcal/shared`
  (`src/goals.ts`): inteiros ≥ 0, kcal ≤ 20000, g ≤ 2000.
- **Propósito**: o painel do dia compara consumido × meta vigente naquele dia.
- **Fora de escopo**: sugerir meta, cálculo de TMB, UI.
- **Critério de aceite**: `pnpm --filter @kcal/goals-core test` e `rest-api test` verdes: sem
  meta → null/404; duas metas (ontem e hoje) → ontem devolve a antiga, hoje a nova; outro usuário
  não vê; `PUT` com valor negativo → 400.
- **Verificação**: 1.
