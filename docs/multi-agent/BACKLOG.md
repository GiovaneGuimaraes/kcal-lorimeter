# BACKLOG — ideias e trabalho ainda sem brief pronto

> Escrito pelo orquestrador (executores e revisores reportam achados no relatório, e ele registra).
> Um item sai daqui quando ganha brief completo e vai para o [`TODO-AI.md`](./TODO-AI.md), ou
> quando é descartado. Cada item diz **o que falta** para ficar pronto.
>
> Higiene: ~1–3 linhas por item. Detalhe de execução não mora aqui. Regras em [`README.md`](./README.md).

---

## Roadmap do MVP (ordem sugerida)

Funcionalidades F1–F8 de [`docs/PRODUTO.md`](../PRODUTO.md). T-001 a T-005, T-009 e T-010 estão feitas; T-006 e T-007 estão no `TODO-AI.md`.

| Id | Item | Complexidade | Falta para ficar pronto |
|---|---|---|---|
| T-008 | **`entries-core` + rotas** (F6/F7): criar/editar/apagar lançamento com snapshot; totais do dia × meta | alta | T-004, T-006, T-007 |
| T-011 | **`voice-core` + rota de upload** (F5): áudio → STT → extração → casamento → `voice_log` pendente; apaga o áudio | alta | T-006, T-009, T-010 |
| T-012 | **App: login + gravar áudio** (`expo-audio`, permissão, limite de duração, upload) | alta | T-005, T-011 |
| T-013 | **App: tela de revisão** (corrigir item, escolher candidato, cadastrar desconhecido, confirmar) | alta | T-008, T-011 |
| T-014 | **App: painel do dia + histórico + lançamento por texto** (F6/F7/F8) | média | T-008 |
| T-015 | **Deploy da API** | alta | decisão de hospedagem (fora do escopo agora) |
| T-016 | **Distribuição do app**: `eas.json` com perfis, build interno | média | H-007 |

## Decisões de produto pendentes de brief

- **Quantidade não dita na fala** ("comi frango"): hoje o prompt da extração devolve `quantidade: 1, unidade: "unidade"` como sentinela, indistinguível de "1 ovo". Falta: decidir se o contrato ganha `quantidade` opcional para a tela de revisão pedir o peso (sugestão do revisor da T-010).

## Candidatas (fora do MVP — o orquestrador puxa daqui depois)

- **`backlog:check` no CI**: falhar se `TODO-AI.md` + `BACKLOG.md` passarem de ~8 KB. Só vale virar trava se a regra de higiene for violada (README § Higiene).
- **Porções caseiras** ("colher de sopa", "concha", "unidade média") por alimento. Falta: decisão de produto sobre quais porções e de onde vêm os pesos.
- **Refeições favoritas** ("meu café de sempre" lança vários itens de uma vez).
- **Sugestão de macros para alimento desconhecido** a partir da tabela oficial, com confirmação — nunca gerada por LLM.
- **Gráficos semanais/mensais** de kcal e macros.
- **Código de barras / foto do prato.** Falta: decisão de produto e de custo.
- **Exportar dados** (CSV).
- **Trocar SQLite por Postgres** quando houver mais de um usuário real (Drizzle facilita).
