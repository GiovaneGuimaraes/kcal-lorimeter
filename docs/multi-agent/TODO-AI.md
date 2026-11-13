# TODO-AI — fila pronta para executores

> **Só o orquestrador escreve aqui.** Cada item tem brief completo e nenhuma dependência aberta no
> `TODO-HUMAN.md`. Modelo de tarefa, níveis de verificação e roteamento: [`README.md`](./README.md).
>
> Estados: `PENDENTE` → `EM_ANDAMENTO` → (`BLOQUEADA`) → `EM_REVISAO` → sai daqui no merge | `CANCELADA`
>
> Tarefa concluída **sai deste arquivo**: o registro é a PR e o git.

---

## Fila

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
