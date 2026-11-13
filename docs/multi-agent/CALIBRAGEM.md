# Calibragem dos modelos

O dado que ajusta o roteamento de [`README.md`](./README.md) § "Roteamento de modelos". Só entra
aqui o que **muda uma decisão futura** de roteamento; o resto vai no corpo da PR.

## Placar

| Tarefa | Complexidade | Executor | Ciclos | Reprovações (causa) |
|---|---|---|---|---|
| T-001 scaffold | alta | Opus 5.5 | 1 | 0 — 4 sugestões (AGENTS.md do template, conflito de CLAUDE.md por base antiga do worktree) |
| T-009 stt | média | Sonnet 5.5 | 1 | 0 — 3 sugestões (redact no corpo do 401, casos de teste extras) |
| T-004 nutrition-core | alta | Opus 5.5 | 1 | 0 — 2 sugestões (ordem da multiplicação, alias de tipo) |

## Onde as reprovações caem

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
