# CLAUDE.md — kcal-lorimeter

Contador de calorias por voz. O que o produto é: [`docs/PRODUTO.md`](docs/PRODUTO.md). Como o
trabalho é feito: [`docs/multi-agent/README.md`](docs/multi-agent/README.md).

**Leitura obrigatória de todo agente (orquestrador, executor e revisor) antes de qualquer tarefa.**

## Estado

**Fase 1 — primeira versão em construção.** A stack está decidida (abaixo). O scaffold é a T-001;
enquanto ela não entra, não há `package.json` nem comandos. Quando entrar, esta seção lista os
comandos reais da raiz: `pnpm install`, `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm dev:api`.

## Stack (decidida — H-001, H-001b, H-002, H-003, H-004, H-005)

- **Monorepo pnpm**, TypeScript `strict` em tudo, lockfile único na raiz. `.npmrc` com
  `node-linker=hoisted` (exigência do Expo em monorepo). Lint e formatação com **Biome**.
  Testes com **Jest** (`ts-jest` no back-end, `jest-expo` no app). Validação de entrada e de
  contratos externos com **Zod**. CI no GitHub Actions: `build`, `lint`, `format:check`, `test`.
- `packages/mobile` — app **Expo** (React Native, iOS e Android): **Expo Router**, **`expo-audio`**
  para gravar, testes com `jest-expo` + React Native Testing Library. Builds com EAS quando chegar
  a hora (H-007). Para desenvolver: Expo Go ou development build.
- `packages/rest-api` — HTTP fino com **Hono** sobre `@hono/node-server`. **Roda local**
  (`pnpm dev:api`); hospedagem fica para depois. Autentica, valida entrada (Zod), chama os cores e
  traduz erro em status.
- `packages/db` — **SQLite local** com `better-sqlite3` + **Drizzle ORM**; migrações geradas pelo
  `drizzle-kit` e versionadas em `packages/db/migrations`. Arquivo do banco em `data/` (fora do
  git). Testes usam `:memory:`. Troca para Postgres só quando o app crescer (o Drizzle facilita).
- `packages/*-core` — lógica de domínio, **uma função por arquivo**, banco **injetado** (`db`),
  testes fora do `src/`.
- `packages/shared` — tipos e schemas Zod compartilhados (API ↔ app ↔ cores).
- `packages/auth-core` — autenticação **própria**: e-mail + senha (hash com `scrypt` do Node),
  sessão por JWT (`jose`). Multiusuário desde o schema.
- `packages/stt` — transcrição por **API hospedada** (OpenAI Whisper, `language=pt`) atrás da
  interface `transcribe(audio) → texto`. O áudio bruto é **apagado** depois de transcrito; só o
  texto fica no `voice_logs`.
- `packages/llm` — extração de itens com **Claude Haiku 5.5** (`claude-haiku-5-5`) via
  `@anthropic-ai/sdk`, saída estruturada validada por schema Zod. O LLM devolve só
  `{alimento, quantidade, unidade, refeicao?}`.
- **Alimentos padrão**: fonte **TACO** (Unicamp) para in natura e preparados; industrializado
  genérico (whey, pasta de amendoim) com fonte "rótulo médio".

Módulos previstos: `auth-core`, `foods-core` (base + casamento por nome), `nutrition-core`
(cálculo de macros, funções puras), `entries-core` (lançamentos e totais do dia), `goals-core`,
`voice-core` (orquestra transcrição → extração → casamento), `stt` e `llm` (integrações).

## Regras que já valem

- **IA interpreta, código calcula** (ver `docs/PRODUTO.md` § Princípios). Nenhum valor nutricional
  sai de um LLM. Cálculo de macros é função pura, testada com casos de borda (0 g, porção, arredondamento).
- **Isolamento por `user_id`** em toda leitura e escrita de dado da pessoa. Alimento padrão tem
  `user_id` nulo; consulta de alimentos devolve padrões + os da própria pessoa.
- **Lançamento guarda snapshot dos macros**: editar um alimento não reescreve dias passados.
- **Valores nutricionais**: guarde por 100 g, com arredondamento só na exibição (1 casa decimal
  para gramas, inteiro para kcal). Alimento padrão cita a **fonte** do valor.
- **Segredos** (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `JWT_SECRET`) só em `.env` fora do git; o
  repo tem `.env.example`.
- **Dado sensível não entra em arquivo versionado, PR nem commit**: áudio, transcrição ou
  lançamento real de alguém. Teste usa dado inventado.
- Texto de interface em **pt-BR**.
- **Mobile**: segredo (chave de STT/LLM) **nunca** vai no bundle do app — tudo que estiver no app
  Expo, inclusive variável `EXPO_PUBLIC_*`, é público. O app fala só com a nossa API; quem chama
  STT e LLM é o servidor.
- **Integrações (`stt`, `llm`) nunca tocam o banco**: traduzem o mundo externo em tipos nossos e
  devolvem; quem persiste é o core. O cliente externo é **injetado** para o teste mockar.

## Política de testes

Toda mudança de comportamento vem com **teste automatizado**, ou com a justificativa explícita, no
relatório e na PR, de por que não tem. Cálculo, casamento de alimentos e parsing da extração são
os pontos onde teste é obrigatório. Chamadas a STT/LLM são **mockadas** nos testes unitários; o
contrato (o JSON que o LLM devolve) é validado por schema no código, não confiado.

## Documentos

| Arquivo | Conteúdo |
|---|---|
| `docs/PRODUTO.md` | Visão, funcionalidades, fluxo de voz, modelo de dados |
| `docs/multi-agent/README.md` | Papéis, os três arquivos de estado, o loop, roteamento de modelos |
| `docs/multi-agent/ORQUESTRADOR.md` | Guia e estado atual para a sessão orquestradora |
| `docs/multi-agent/TODO-AI.md` | Fila de tarefas prontas para executores |
| `docs/multi-agent/BACKLOG.md` | Ideias e tarefas ainda sem brief pronto |
| `docs/multi-agent/TODO-HUMAN.md` | Decisões e pendências que só o humano resolve |
| `docs/multi-agent/CALIBRAGEM.md` | Placar dos modelos e versões dos prompts dos agentes |
| `.claude/agents/executor.md`, `revisor.md` | Prompts dos subagentes |
