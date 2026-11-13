# @kcal/mobile

App Expo (SDK 58, Expo Router) do kcal-lorimeter. Fala só com a nossa API (`packages/rest-api`):
quem chama STT e LLM é o servidor. Leia também o [`AGENTS.md`](AGENTS.md).

## Configuração

Copie `.env.example` para `packages/mobile/.env` (fora do git).

| Variável | Padrão | Observação |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3000` | URL da API. **Pública**: vai no bundle. |

**Toda variável `EXPO_PUBLIC_*` é embutida no app e qualquer pessoa pode ler.** Nunca coloque
segredo nela (chave de STT/LLM, `JWT_SECRET`...).

Onde a API está, visto pelo app:

- simulador iOS / web: `http://localhost:3000`;
- emulador Android: `http://10.0.2.2:3000`;
- **aparelho físico (Expo Go)**: o IP da máquina na rede local, ex.: `http://192.168.0.10:3000`
  (`ipconfig` no Windows, `ipconfig getifaddr en0` no macOS). Celular e computador na mesma rede,
  e o firewall precisa liberar a porta 3000.

Depois de mudar o `.env`, reinicie o Metro com cache limpo: `npx expo start -c`.

## Rodar

```sh
pnpm dev:api                       # na raiz: sobe a API (precisa do .env da raiz)
pnpm --filter @kcal/mobile start   # Metro; abra no Expo Go pelo QR code
```

## Comandos

```sh
pnpm --filter @kcal/mobile test    # jest-expo + React Native Testing Library
pnpm --filter @kcal/mobile build   # tsc --noEmit
npx expo-doctor                    # (dentro de packages/mobile)
```

## Estrutura

| Caminho | O quê |
|---|---|
| `src/app/_layout.tsx` | Providers + gate de autenticação (`Stack.Protected`): sem sessão → `/login` |
| `src/app/login.tsx`, `cadastro.tsx` | Entrar / criar conta (validação com os schemas do `@kcal/shared`) |
| `src/app/index.tsx` | Tela inicial: gravar (até 60 s) ou digitar → `POST /voice` / `POST /voice/text`; abaixo, o painel do dia |
| `src/app/revisao.tsx` | Revisão: troca/busca/cadastra alimento, quantidade, refeição → `POST /entries` por item; ou descarta |
| `src/app/meta.tsx` | Meta diária: `GET /goals?data=` + `PUT /goals` (vale a partir de hoje) |
| `src/app/lancamento.tsx` | Lançamento manual: `GET /foods?q=` → `POST /entries` (origem `manual`) |
| `src/api/` | Cliente HTTP (`Authorization: Bearer`, erros `{ erro }` → `ApiError`) |
| `src/auth/session.tsx` | Sessão (`token` + `user`) no `expo-secure-store` |
| `src/day/` | Painel do dia (`GET /days/:data`, setas de dia, editar/apagar lançamento) e datas locais |
| `src/ui/format.ts` | Números na tela: kcal inteiro, gramas com 1 casa (arredondamento do `@kcal/nutrition-core`) |
| `src/voice/` | Gravador (`expo-audio`) e a revisão em memória entre telas |

O `@kcal/shared` e o `@kcal/nutrition-core` são resolvidos pelo código-fonte (`src`), sem
`pnpm build`: condição `source` no
`metro.config.js`, `moduleNameMapper` no `jest.config.js` e `customConditions` no `tsconfig.json`.
