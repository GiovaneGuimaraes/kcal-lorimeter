# Guia do orquestrador

Leitura inicial obrigatória da sessão orquestradora. Em ~2 minutos: o que é o app, onde ele está,
o que importa agora.

## O que é

Contador de calorias por voz: a pessoa grava o que comeu, o app transcreve, extrai os itens, casa
com a base de alimentos, pede confirmação e soma os macros do dia. Detalhe em
[`docs/PRODUTO.md`](../PRODUTO.md); regras técnicas em [`CLAUDE.md`](../../CLAUDE.md).

## Estado atual (2026-11-12 — fase 1, primeira versão)

> Substitua esta seção a cada ciclo; não acumule. O que foi feito vive nas PRs e no git.

- **Stack decidida** (H-001 a H-005, ver `CLAUDE.md` § Stack): pnpm + TS strict, Jest, Biome,
  Hono local, SQLite + Drizzle, auth própria, Whisper, Claude Haiku 5.5, TACO.
- **Fila** (`TODO-AI.md`): T-001 (scaffold) primeiro; depois T-003, T-004, T-009, T-010 em
  paralelo (sem arquivos em comum). O resto do MVP está no `BACKLOG` com as dependências.
- **Integração** (H-006): branches aprovadas são mergeadas pelo orquestrador na branch de trabalho
  `GiovaneGuimaraes/kcal-lorimeter`; a PR dela para a `main` é do humano.
- **Pendências abertas**: H-007 (contas de distribuição) e H-008 (chaves de API) — nenhuma
  bloqueia código.

## Como operar

1. Passo 0 do loop: leia o `TODO-HUMAN.md` e aplique o que tiver resposta.
2. Leia o `README.md` desta pasta (fluxo e roteamento), o `CLAUDE.md` e o `TODO-AI.md`.
3. Fila vazia ou rasa? Refine itens do `BACKLOG.md`: escreva o brief completo (modelo no README)
   e mova para o `TODO-AI.md`. Tarefas de **até ~1h** de executor. Grande demais → quebre em
   fatias (`T-010a`, `T-010b`) que entregam algo testável cada uma.
4. Tarefa **alta** → spike com agente `Plan` (`model: "opus"`) antes; o plano vai inteiro no prompt.
5. Delegue com a ferramenta Agent: `subagent_type: "executor"`, `isolation: "worktree"`, `model`
   pelo roteamento. No prompt: o item do `TODO-AI` na íntegra, o plano do spike (se houver), o que
   foi mergeado recentemente e que ele deve respeitar, e a instrução de ler `CLAUDE.md` e este
   README antes de codar.
6. Retorno do executor → `revisor` sobre o diff. Reprovou → devolve ao **mesmo** executor
   (SendMessage) com os achados. Aplique o escalonamento e o teto de 3 ciclos.
7. Aprovado → no worktree: merge da `main` se ela andou, `git diff --check` depois de resolver
   conflito, suíte e build. PR com `gh pr create --body-file` (texto escrito com a ferramenta
   Write, nunca montado numa string de shell — crase e `$` são comidos). Corpo da PR: tarefa,
   modelo do executor e do revisor, veredito, o que ficou de fora.
8. Mergeou → remova o bloco do `TODO-AI`, anote em `CALIBRAGEM.md` só o que muda roteamento, e
   atualize "Estado atual" acima.

## Limites do orquestrador

- Não implementa tarefa grande direto: decompõe e delega. Correção trivial (typo, ajuste de doc,
  higiene do repo) pode fazer inline.
- Não decide produto, stack, gasto nem prioridade: isso vai para o `TODO-HUMAN.md` com opções,
  trade-offs e uma recomendação.
- Não faz merge sem a autorização de H-006.

## Lições operacionais

> Herdadas do `vetor-wallet`; acrescente as deste repo quando aparecerem.

- Executores não deixam servidor dev rodando ao terminar (porta ocupada derruba o próximo).
- Worktree novo precisa de install antes de testar; rode os testes com o caminho do worktree
  explícito (um executor já rodou no checkout principal por engano).
- Corpo de PR sempre via `--body-file`.
- Teste com data: ancore em data relativa ("hoje", "ontem"), nunca fixa — teste envelhece.
- Com Haiku, confira o diff, não a prosa: ele já entregou código certo com relatório errado.
