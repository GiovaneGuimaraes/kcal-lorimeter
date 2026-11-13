# TODO-AI — fila pronta para executores

> **Só o orquestrador escreve aqui.** Cada item tem brief completo e nenhuma dependência aberta no
> `TODO-HUMAN.md`. Modelo de tarefa, níveis de verificação e roteamento: [`README.md`](./README.md).
>
> Estados: `PENDENTE` → `EM_ANDAMENTO` → (`BLOQUEADA`) → `EM_REVISAO` → sai daqui no merge | `CANCELADA`
>
> Tarefa concluída **sai deste arquivo**: o registro é a PR e o git.

---

## Fila

### T-002 — Seed de alimentos padrão (TACO + rótulo médio)
- **Status**: EM_ANDAMENTO · **Complexidade**: média · **Depende de**: T-003 (feita)
- **Objetivo**: em `packages/db`: `src/seed/default-foods.ts` com ~40 alimentos comuns no Brasil
  (arroz branco cozido, feijão carioca cozido, frango grelhado, ovo cozido, batata cozida,
  batata-doce, aveia, banana, pão francês, leite integral, whey, pasta de amendoim…) com macros
  por 100 g, `apelidos`, `porcaoPadraoG`/`nomePorcao` quando fizer sentido (ovo 50 g "unidade",
  whey 30 g "scoop", pão francês 50 g "unidade"), e **`fonte`** em cada um ("TACO 4ª ed." com o
  código/nome do item, ou "rótulo médio" para industrializado). `seedDefaultFoods(db)` idempotente
  (chave natural = `nome` com `user_id` nulo; roda de novo sem duplicar). Script
  `pnpm --filter @kcal/db db:seed` que abre `DB_PATH` e roda o seed.
- **Propósito**: o app já conhece o prato do dia a dia sem a pessoa cadastrar nada.
- **Fora de escopo**: casamento por nome (T-006), alimentos da pessoa, UI.
- **Critério de aceite**: `pnpm --filter @kcal/db test` verde: seed em `:memory:` insere N ≥ 40
  itens, todos com `user_id` nulo, `fonte` não vazia e macros ≥ 0; rodar 2× mantém N; kcal
  informada bate com `4P + 4C + 9G` dentro de ±15 % para cada item (sanidade dos dados).
- **Verificação**: 1.

### T-005 — `auth-core` + rotas de cadastro/login + bootstrap da API
- **Status**: EM_ANDAMENTO · **Complexidade**: alta · **Depende de**: T-003 (feita)
- **Objetivo**: `packages/auth-core` (`@kcal/auth-core`): `hashPassword`/`verifyPassword`
  (`scrypt` do Node, salt aleatório, comparação em tempo constante), `registerUser(db, {email,
  nome, senha})`, `authenticate(db, {email, senha})`, `signSession({userId}, secret)` /
  `verifySession(token, secret)` (JWT HS256 com `jose`, 30 dias). Na `rest-api`:
  `createApp({ db, jwtSecret })` substitui o `app` fixo; `server.ts` lê `DB_PATH`, `JWT_SECRET`,
  `PORT` do env (`dotenv` só no server); rotas `POST /auth/register`, `POST /auth/login`
  (Zod no body, schemas em `@kcal/shared`), `GET /me`; middleware `requireUser` que lê
  `Authorization: Bearer` e põe `userId` no contexto. Erros → 400/401/409 com `{erro}` em pt-BR.
- **Propósito**: toda rota de dado futura só chama `requireUser` e recebe `userId`.
- **Fora de escopo**: reset de senha, refresh token, rate limit, UI.
- **Critério de aceite**: `pnpm --filter @kcal/auth-core test` e `pnpm --filter @kcal/rest-api
  test` verdes: hash ≠ senha e verifica; senha errada falha; e-mail duplicado → 409; login →
  token; `GET /me` sem token → 401, com token → `{id, email, nome}`; token de outro segredo → 401.
- **Verificação**: 1.
