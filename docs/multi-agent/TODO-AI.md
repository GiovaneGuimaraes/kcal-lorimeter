# TODO-AI — fila pronta para executores

> **Só o orquestrador escreve aqui.** Cada item tem brief completo e nenhuma dependência aberta no
> `TODO-HUMAN.md`. Modelo de tarefa, níveis de verificação e roteamento: [`README.md`](./README.md).
>
> Estados: `PENDENTE` → `EM_ANDAMENTO` → (`BLOQUEADA`) → `EM_REVISAO` → sai daqui no merge | `CANCELADA`
>
> Tarefa concluída **sai deste arquivo**: o registro é a PR e o git.

---

## Fila

### T-001 — Scaffold do monorepo (pnpm + TS + Jest + Biome + Hono + Expo + CI)
- **Status**: PENDENTE · **Complexidade**: alta · **Depende de**: —
- **Objetivo**: criar a base do repo conforme `CLAUDE.md` § Stack: raiz com `pnpm-workspace.yaml`,
  `.npmrc` (`node-linker=hoisted`), `tsconfig.base.json` strict, `biome.json`, Jest por package,
  scripts raiz `build` / `lint` / `format:check` / `test` / `dev:api`, `.gitignore`, `.env.example`
  (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `JWT_SECRET`, `DB_PATH`), CI em
  `.github/workflows/ci.yml`. Packages: `shared` (`@kcal/shared`, zod, 1 teste), `rest-api`
  (`@kcal/rest-api`, Hono + `@hono/node-server`, `GET /health` → `{"ok":true}`, 1 teste via
  `app.request`), `mobile` (`create-expo-app` com Expo Router, template TypeScript, ajustado pelo
  guia oficial de monorepos do Expo; `jest-expo` com 1 teste de render de tela em pt-BR).
  Atualizar `CLAUDE.md` § Estado com os comandos reais e reescrever `README.md` da raiz em UTF-8.
- **Propósito**: todo executor seguinte só adiciona package e teste, sem tocar config.
- **Fora de escopo**: banco, auth, telas reais, qualquer regra de domínio.
- **Critério de aceite**: na raiz, `pnpm install`, `pnpm lint`, `pnpm test`, `pnpm build` verdes;
  `pnpm dev:api` sobe e `curl localhost:3000/health` devolve `{"ok":true}`.
- **Verificação**: 2 (colar a chamada ao `/health` e as linhas finais de `pnpm test`).

### T-004 — `nutrition-core`: cálculo de macros (funções puras)
- **Status**: PENDENTE · **Complexidade**: alta · **Depende de**: T-001
- **Objetivo**: `packages/nutrition-core` (`@kcal/nutrition-core`), uma função por arquivo:
  `gramsFromQuantity(food, quantidade, unidade)` (`g` e `ml` = gramas; `unidade`/`scoop`/`fatia`
  só se `porcaoPadraoG` existir, senão erro tipado `PortionRequiredError`);
  `macrosForGrams(food, gramas)` → `{kcal, proteinaG, carboG, gorduraG}` sem arredondar;
  `sumMacros(list)`; `formatMacros(m)` (1 casa para g, inteiro para kcal, só na exibição).
  Tipos `FoodMacrosPer100g` e `Macros` em `@kcal/shared`.
- **Propósito**: único lugar que transforma gramas em macros; todo o resto chama aqui.
- **Fora de escopo**: banco, API, casamento de alimentos, porções caseiras.
- **Critério de aceite**: `pnpm --filter @kcal/nutrition-core test` verde com casos: 0 g, quantidade
  negativa (erro), 100 g = valor do alimento, porção padrão (whey 30 g × 1 scoop), unidade sem
  porção (erro), soma de lista vazia, arredondamento 0.05 → exibição.
- **Verificação**: 1.

### T-003 — `db`: schema SQLite + migrações (Drizzle)
- **Status**: PENDENTE · **Complexidade**: alta · **Depende de**: T-001
- **Objetivo**: `packages/db` (`@kcal/db`) com `better-sqlite3` + Drizzle: tabelas `users`,
  `daily_goals`, `foods` (`user_id` nulo = padrão; macros por 100 g; `porcao_padrao_g`,
  `nome_porcao`, `apelidos` JSON, `fonte`), `voice_logs`, `meal_entries` (snapshot
  kcal/proteina/carbo/gordura, `origem`, `voice_log_id`) como em `docs/PRODUTO.md` § Modelo de
  dados; FKs e índices por `user_id` + data; `createDb({ path })` que abre o arquivo (ou
  `:memory:`) e aplica as migrações de `packages/db/migrations` (geradas pelo `drizzle-kit`).
- **Propósito**: cada core recebe `db` pronto, tipado, com schema único.
- **Fora de escopo**: seed de alimentos, funções de domínio, rotas.
- **Critério de aceite**: `pnpm --filter @kcal/db test` verde: cria em memória, insere user +
  food padrão + food da pessoa + entry com snapshot, lê de volta; FK inválida falha; migrações
  versionadas no git.
- **Verificação**: 1.

### T-009 — `stt`: interface `transcribe()` + provedor Whisper
- **Status**: PENDENTE · **Complexidade**: média · **Depende de**: T-001
- **Objetivo**: `packages/stt` (`@kcal/stt`): tipo `Transcriber = { transcribe(audio: {bytes:
  Uint8Array, mimeType: string}) => Promise<{ text: string }> }`; `createOpenAiTranscriber({
  apiKey, fetch? })` chamando `POST https://api.openai.com/v1/audio/transcriptions` (multipart,
  `model=whisper-1`, `language=pt`); erros tipados (`SttHttpError`, `SttEmptyTranscriptError`);
  `fetch` injetado. Nunca toca banco nem grava áudio em disco.
- **Propósito**: trocar de provedor sem mexer no resto.
- **Fora de escopo**: upload na API, apagar áudio (quem apaga é o `voice-core`).
- **Critério de aceite**: `pnpm --filter @kcal/stt test` verde com `fetch` mockado: sucesso,
  HTTP 401, resposta sem texto.
- **Verificação**: 1.

### T-010 — `llm`: extração de itens com Claude Haiku 5.5
- **Status**: PENDENTE · **Complexidade**: alta · **Depende de**: T-001
- **Objetivo**: `packages/llm` (`@kcal/llm`): schema Zod `ExtractedItem` em `@kcal/shared`
  (`alimento: string`, `quantidade: number > 0`, `unidade: 'g'|'ml'|'unidade'|'scoop'|'fatia'|
  'colher'|'xicara'|'concha'`, `refeicao?: 'cafe'|'almoco'|'lanche'|'jantar'`);
  `createItemExtractor({ client })` → `extract(text) => Promise<ExtractedItem[]>` com
  `@anthropic-ai/sdk`: `client.messages.parse`, `model: "claude-haiku-5-5"`, `max_tokens: 4096`,
  `output_config: { format: zodOutputFormat(schema) }`, prompt de sistema em pt-BR que proíbe
  valor nutricional e manda normalizar número por extenso ("duzentos" → 200). Cliente injetado.
  Resposta sem `parsed_output` → `ExtractionParseError`.
- **Propósito**: o LLM só interpreta; qualquer número de kcal/macro é descartado.
- **Fora de escopo**: casamento com o banco, persistência, prompt caching.
- **Critério de aceite**: `pnpm --filter @kcal/llm test` verde com cliente mockado: frase com 3
  itens, "um scoop de whey", `parsed_output: null` → erro, campo extra `kcal` ignorado pelo schema.
- **Verificação**: 1.
