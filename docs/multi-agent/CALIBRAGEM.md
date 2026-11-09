# Calibragem dos modelos

O dado que ajusta o roteamento de [`README.md`](./README.md) § "Roteamento de modelos". Só entra
aqui o que **muda uma decisão futura** de roteamento; o resto vai no corpo da PR.

## Placar

| Tarefa | Complexidade | Executor | Ciclos | Reprovações (causa) |
|---|---|---|---|---|
| _(nenhuma tarefa executada ainda)_ | | | | |

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
