# Guia do orquestrador

Leitura inicial obrigatória da sessão orquestradora. Em ~2 minutos: o que é o app, onde ele está,
o que importa agora.

## O que é

Contador de calorias por voz: a pessoa grava o que comeu, o app transcreve, extrai os itens, casa
com a base de alimentos, pede confirmação e soma os macros do dia. Detalhe em
[`docs/PRODUTO.md`](../PRODUTO.md); regras técnicas em [`CLAUDE.md`](../../CLAUDE.md).

## Estado atual (2026-11-12 — primeira versão integrada)

> Substitua esta seção a cada ciclo; não acumule. O que foi feito vive nas PRs e no git.

- **MVP implementado** (T-001 a T-014 + T-017) e integrado na branch de trabalho
  `GiovaneGuimaraes/kcal-lorimeter`. 12 packages, 561 testes, lint/format/build verdes. Smoke da
  API integrada feito pelo orquestrador (register → meta → lançamento → painel → voz sem chave → 503).
- **PR #2 mergeada na `main` (2026-11-13) com CI verde.** Merge passou a modo auto (H-006,
  opção b): revisor `APROVADA` + CI verde na PR → o orquestrador mergeia.
- **Fila vazia.** O que falta é humano: H-010 (testar no aparelho), H-009 (conferir seed TACO),
  H-008 (chaves), H-007 (contas de distribuição).
- **Próximo ciclo**: promover do `BACKLOG` o que o teste no aparelho revelar; depois T-016
  (EAS) quando H-007 for respondida.

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
- Só mergeia com revisor `APROVADA` **e** CI verde na PR (H-006, modo auto desde 2026-11-13).

## Lições operacionais

> Herdadas do `vetor-wallet`; acrescente as deste repo quando aparecerem.

- Executores não deixam servidor dev rodando ao terminar (porta ocupada derruba o próximo).
- Worktree novo precisa de install antes de testar; rode os testes com o caminho do worktree
  explícito (um executor já rodou no checkout principal por engano).
- Corpo de PR sempre via `--body-file`.
- Teste com data: ancore em data relativa ("hoje", "ontem"), nunca fixa — teste envelhece.
- Com Haiku, confira o diff, não a prosa: ele já entregou código certo com relatório errado.
- Worktree do executor pode nascer de uma base diferente da branch do orquestrador (T-001 nasceu da
  `main`): diga no prompt qual branch é a base e confira `git merge-base` antes de integrar.
- No Windows, `tsx watch` deixa node órfão na porta 3000 quando o pnpm é morto: matar pelo PID
  (`Get-NetTCPConnection -LocalPort 3000`).
