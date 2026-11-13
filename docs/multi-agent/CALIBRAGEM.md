# Calibragem dos modelos

O dado que ajusta o roteamento de [`README.md`](./README.md) § "Roteamento de modelos". Só entra
aqui o que **muda uma decisão futura** de roteamento; o resto vai no corpo da PR.

## Placar

| Tarefa | Complexidade | Executor | Ciclos | Reprovações (causa) |
|---|---|---|---|---|
| T-001 scaffold | alta | Opus 5.5 | 1 | 0 — 4 sugestões (AGENTS.md do template, conflito de CLAUDE.md por base antiga do worktree) |
| T-009 stt | média | Sonnet 5.5 | 1 | 0 — 3 sugestões (redact no corpo do 401, casos de teste extras) |
| T-004 nutrition-core | alta | Opus 5.5 | 1 | 0 — 2 sugestões (ordem da multiplicação, alias de tipo) |
| T-003 db | alta | Opus 5.5 | 1 | 0 — 3 sugestões (CHECK refeicao, testes cascade, índice food_id) |
| T-010 llm | alta | Opus 5.5 | 1 | 0 — 3 sugestões (sentinela de quantidade não dita) |
| T-002 seed | média | Sonnet 5.5 | 1 | 0 — dados de memória do modelo (H-009) |
| T-005 auth | alta | Opus 5.5 | 1 | 0 — 2 sugestões (log do onError, dev:api não exercitado) |
| T-007 goals | média | Sonnet 5.5 | 1 | 0 — 2 sugestões (fuso de "hoje") |
| T-006 foods | alta | Opus 5.5 | 1 | 0 — 3 sugestões (falso positivo por trigramas) |
| T-008 entries | alta | Opus 5.5 | 1 | 0 — 3 sugestões (semântica do PATCH documentada) |
| T-011 voice | alta | Opus 5.5 | 1 | 0 — 2 sugestões (log com causa sensível, corrigido inline) |
| T-012 app login/gravação | alta | Opus 5.5 | 1 | 0 — nível 4 pendente |
| T-013 app revisão | alta | Opus 5.5 | 1 | 0 — 3 sugestões; achou 2 lacunas de contrato (T-017) |
| T-014 app painel | média | Opus 5.5 | 1 | 0 — 3 sugestões |
| T-017 voice_log confirmado | média | Sonnet 5.5 | 1 | 0 |
| T-019 log 500 | média | Sonnet 5.5 | 1 | 0 |
| T-018 correções app | média | Sonnet 5.5 | 1 | 0 |
| T-020 macros na revisão | alta | Opus 5.5 | 1 | 0 |
| T-021 tema D | alta | Opus 5.5 | 1 | 0 — sem prints (sem web) |
| T-022 telas simples D | alta | Opus 5.5 | 1 | 0 |

## Onde as reprovações caem

> **Dado real (2026-11-12, 15 tarefas, 15 ciclos, 0 reprovações).** Nenhuma reprovação; o custo foi
> conflito trivial de merge entre executores paralelos e dois achados de contrato entre packages
> (T-013 → T-017), que o revisor de uma tarefa isolada não vê. Hipótese original abaixo ainda não
> testada: as telas de gravação/revisão só foram verificadas com mocks (nível 4 pendente, H-010).
>
> Preencher a partir das reprovações reais. No vetor-wallet, depois de 20 ciclos, **nenhuma**
> reprovação caiu em cálculo — todas caíram em **estado assíncrono, gates de render e consistência
> entre N arquivos**, onde lint, build e suíte passam verdes com o código errado. A hipótese para
> este repo: o equivalente aqui é o **fluxo de gravação/upload no app Expo** e a **tela de
> revisão** (estado assíncrono). Confirmar ou derrubar com dados.

## Versões dos prompts

Toda alteração em `.claude/agents/executor.md` ou `revisor.md` ganha uma linha aqui.

| Data | Arquivo | O que mudou | Por quê |
|---|---|---|---|
| 2026-11-08 | `executor.md`, `revisor.md` | Versão inicial, adaptada do vetor-wallet | Fase 0 |
| 2026-11-08 | `revisor.md` | Checa chave/segredo no bundle do app Expo | Mobile decidido como Expo (H-001): tudo no app é público |
