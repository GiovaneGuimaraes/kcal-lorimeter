# CLAUDE.md — kcal-lorimeter

Contador de calorias por voz. O que o produto é: [`docs/PRODUTO.md`](docs/PRODUTO.md). Como o
trabalho é feito: [`docs/multi-agent/README.md`](docs/multi-agent/README.md).

**Leitura obrigatória de todo agente (orquestrador, executor e revisor) antes de qualquer tarefa.**

## Estado

**Fase 0 — só documentação.** Não existe código, `package.json`, CI nem comandos. A stack está
proposta abaixo, mas **pendente de confirmação** em `docs/multi-agent/TODO-HUMAN.md` (H-001 a
H-006). Nenhum executor cria código antes de essas respostas existirem. Quando o scaffold (T-001)
entrar, esta seção passa a listar os comandos reais (`build`, `lint`, `test`) e deixa de dizer
"proposta".

## Stack proposta (aguardando H-001)

Seguindo o que já funciona nos outros projetos do humano:

- **Monorepo pnpm**, TypeScript `strict` em tudo, lockfile único na raiz.
- `packages/web` — front (Vite + React), **PWA** para gravar áudio no celular via `MediaRecorder`
  sem passar por loja de app.
- `packages/rest-api` — HTTP fino: autentica, valida entrada, chama os cores e traduz erro em status.
- `packages/*-core` — lógica de domínio, **uma função por arquivo**, dependência de banco
  **injetada** (`query`), testes fora do `src/`.
- `packages/shared` — tipos compartilhados (types-only).
- Integrações externas (STT, LLM) em packages próprios que **nunca tocam o banco**: traduzem o
  mundo externo em tipos nossos e devolvem; quem persiste é o core.

Módulos previstos: `auth`, `foods-core` (base de alimentos + casamento por nome), `nutrition-core`
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
- **Segredos** (chaves de STT/LLM, banco) só em `.env` fora do git; o repo tem `.env.example`.
- **Dado sensível não entra em arquivo versionado, PR nem commit**: áudio, transcrição ou
  lançamento real de alguém. Teste usa dado inventado.
- Texto de interface em **pt-BR**.

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
