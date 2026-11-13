# @kcal/rest-api

HTTP fino (Hono): autentica, valida entrada, chama os cores e traduz erro em status.

## Configuração

O `server.ts` lê o `.env` da **raiz do repo** (copie de `.env.example`). Variáveis já definidas no
ambiente têm precedência.

| Variável | Padrão | Observação |
|---|---|---|
| `JWT_SECRET` | — | Obrigatória, **mínimo 32 caracteres**. Sem ela a API não sobe. |
| `DB_PATH` | `data/kcal.sqlite` | Caminho relativo é resolvido a partir da raiz do repo; a pasta é criada se faltar. |
| `PORT` | `3000` | |
| `OPENAI_API_KEY` | — | Opcional. Transcrição (STT). Sem ela, `POST /voice` responde 503. |
| `ANTHROPIC_API_KEY` | — | Opcional. Extração (LLM). Sem ela, `POST /voice` e `POST /voice/text` respondem 503. |

Gerar um segredo: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

```sh
pnpm dev:api   # da raiz; ou: pnpm --filter @kcal/rest-api dev
```

## Endpoints

Erros sempre como `{ "erro": "<mensagem em pt-BR>" }`: 400 (body inválido), 401 (sem sessão ou
credenciais inválidas), 404, 409 (e-mail já cadastrado), 500 (sem detalhes internos).

| Método e rota | Body | Resposta |
|---|---|---|
| `GET /health` | — | `200 {"ok":true}` |
| `POST /auth/register` | `{ email, nome (1–80), senha (mín. 8) }` | `201 { token, user: { id, email, nome } }` |
| `POST /auth/login` | `{ email, senha }` | `200 { token, user: { id, email, nome } }` |
| `GET /me` | — (header `Authorization: Bearer <token>`) | `200 { id, email, nome }` |
| `POST /voice` | multipart, campo `audio` (`audio/*`, ≤ 5 MB) | `200 VoiceReview`; 400 (não é áudio), 413 (grande), 422 (não entendeu), 502 (STT/LLM falhou), 503 (sem chave) |
| `POST /voice/text` | `{ texto (1–500) }` | `200 VoiceReview`; 422, 502, 503 como acima |
| `POST /voice/:id/discard` | — | `204`; 404 se não for da pessoa ou não estiver pendente |

O áudio só passa pela memória do servidor (vai para o STT e é descartado): não é gravado em disco
nem no banco.

O token é um JWT HS256 com validade de 30 dias (sem refresh: expirou, faz login de novo).

```sh
curl -s -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"teste@exemplo.com","nome":"Teste","senha":"senha-teste-123"}'

TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"teste@exemplo.com","senha":"senha-teste-123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

curl -s http://localhost:3000/me -H "Authorization: Bearer $TOKEN"
```

## Rotas autenticadas novas

Use o middleware `requireUser(jwtSecret)` (`src/middleware/require-user.ts`) e leia
`c.get("userId")`. Toda leitura e escrita de dado da pessoa filtra por esse `userId`.
