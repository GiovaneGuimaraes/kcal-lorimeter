# @kcal/db

Schema SQLite (Drizzle ORM + `better-sqlite3`) e abertura do banco. Os cores recebem o `db` pronto.

```ts
import { createDb, foods } from "@kcal/db";

const { db, sqlite, close } = createDb({ path: ":memory:" }); // ou caminho do arquivo
```

`createDb({ path })`:

- abre o arquivo (cria se não existir) ou `:memory:`;
- liga `PRAGMA foreign_keys = ON` (o SQLite não liga por padrão) e, em arquivo, `journal_mode = WAL`;
- aplica as migrações pendentes de `migrations/`;
- devolve `{ db, sqlite, close() }` — `db` é o cliente Drizzle tipado com o schema.

Exporta também as tabelas (`users`, `dailyGoals`, `foods`, `voiceLogs`, `mealEntries`) e os tipos
inferidos (`User`, `NewUser`, `Food`, `NewFood`, `MealEntry`, ...).

## Arquivo do banco

Em desenvolvimento o arquivo é `DB_PATH` do `.env` (padrão `./data/kcal.sqlite`, ignorado pelo
git). Quem lê a variável é a `rest-api`; este package só recebe o caminho. Testes usam `:memory:`.

## Migrações

O schema fica em `src/schema.ts`. Depois de mudar o schema:

```sh
pnpm --filter @kcal/db db:generate --name <descricao>
```

Isso gera um SQL novo em `migrations/` (e atualiza `migrations/meta/`). **Versione tudo** — as
migrações são a fonte do schema real e são aplicadas por `createDb`. Não edite migração já
mergeada; gere outra.

`better-sqlite3` é nativo: o `package.json` da raiz libera o build dele em
`pnpm.onlyBuiltDependencies`.
