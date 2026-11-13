# kcal-lorimeter

Contador de calorias e macronutrientes por **voz**: a pessoa grava um áudio dizendo o que comeu
("200 gramas de arroz, 150 de frango grelhado e um scoop de whey") e o app transforma isso em
lançamentos do dia, com kcal, proteína, carboidrato e gordura somados contra a meta diária.

- **O que o app é e como funciona**: [`docs/PRODUTO.md`](docs/PRODUTO.md)
- **Regras técnicas e convenções** (leitura obrigatória de qualquer agente): [`CLAUDE.md`](CLAUDE.md)
- **Como o trabalho é feito** (fluxo multi-agente, `BACKLOG` / `TODO-AI` / `TODO-HUMAN`):
  [`docs/multi-agent/README.md`](docs/multi-agent/README.md)

## Como rodar

Pré-requisitos: Node 22 ou 24 e pnpm 10 (`corepack enable` usa a versão fixada no
`package.json`).

```sh
pnpm install          # instala tudo (monorepo pnpm, lockfile único na raiz)
cp .env.example .env  # e preencha; o .env nunca vai para o git

pnpm lint             # Biome (lint)
pnpm format:check     # Biome (formatação); `pnpm format` corrige
pnpm test             # Jest em todos os packages
pnpm build            # tsc nos packages de back-end; checagem de tipos no mobile

pnpm dev:api          # sobe a API em http://localhost:3000 (GET /health → {"ok":true})
```

A API exige `JWT_SECRET` (32+ caracteres) no `.env`. Endpoints (`/auth/register`, `/auth/login`,
`/me`) e exemplos de `curl`: [`packages/rest-api/README.md`](packages/rest-api/README.md).

App mobile (Expo): `pnpm --filter @kcal/mobile start` e abra no Expo Go ou num development build.

## Estrutura

```
packages/
  shared/     @kcal/shared    — tipos e schemas Zod compartilhados
  auth-core/  @kcal/auth-core — senha (scrypt), cadastro, login e sessão (JWT)
  rest-api/   @kcal/rest-api  — API HTTP (Hono + @hono/node-server)
  mobile/     @kcal/mobile    — app Expo (Expo Router)
```
