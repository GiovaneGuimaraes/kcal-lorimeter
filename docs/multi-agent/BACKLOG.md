# BACKLOG — ideias e trabalho ainda sem brief pronto

> Escrito pelo orquestrador (executores e revisores reportam achados no relatório, e ele registra).
> Um item sai daqui quando ganha brief completo e vai para o [`TODO-AI.md`](./TODO-AI.md), ou
> quando é descartado. Cada item diz **o que falta** para ficar pronto.
>
> Higiene: ~1–3 linhas por item. Detalhe de execução não mora aqui. Regras em [`README.md`](./README.md).

---

## Roadmap do MVP (ordem sugerida)

Funcionalidades F1–F8 de [`docs/PRODUTO.md`](../PRODUTO.md).

| Id | Item | Complexidade estimada | Falta para ficar pronto |
|---|---|---|---|
| T-001 | **Scaffold do monorepo**: pnpm, TS strict, lint + Prettier, test runner, CI no GitHub Actions (`build`, `lint`, `format:check`, `test`), `.env.example` | média | H-001 (stack), H-004 (banco) |
| T-002 | **Base de alimentos padrão** (F3): ~40 alimentos comuns com macros por 100 g, apelidos e a **fonte** de cada valor, como dado de seed versionado | média | H-005 (fonte); formato do seed depende de T-001 |
| T-003 | **Schema + migrações** (`users`, `daily_goals`, `foods`, `voice_logs`, `meal_entries`) com isolamento por `user_id` | alta | T-001, H-004 |
| T-004 | **`nutrition-core`**: cálculo de macros por gramas e por porção, soma do dia, arredondamento de exibição — funções puras, 100% testadas | alta | T-001 |
| T-005 | **Auth** (F1): cadastro, login, sessão; toda rota de dado exige usuário | alta | T-003, H-004 (provedor de auth) |
| T-006 | **`foods-core`** (F3/F4): listar padrões + da pessoa, criar/editar alimento próprio, **casar texto com alimento** (nome, apelidos, depois busca aproximada) | alta | T-003 |
| T-007 | **Metas** (F2): CRUD da meta diária | média | T-003, T-005 |
| T-008 | **`entries-core`** (F6/F7): criar/editar/apagar lançamento com snapshot dos macros; totais do dia × meta | alta | T-004, T-006 |
| T-009 | **Integração STT**: interface `transcribe(audio) → texto` + 1 provedor, mockado nos testes | média | H-002 |
| T-010 | **Integração LLM de extração**: `extract(texto) → [{alimento, quantidade, unidade, refeicao?}]` com saída estruturada validada por schema; recusa valor nutricional | alta | H-003 |
| T-011 | **`voice-core`** (F5): orquestra STT → extração → casamento → `voice_log` pendente | alta | T-006, T-009, T-010 |
| T-012 | **Web: gravar áudio** (PWA, `MediaRecorder`, permissões, limite de duração, upload) | alta | T-001, T-011 |
| T-013 | **Web: tela de revisão** (corrigir item, escolher entre candidatos, cadastrar alimento desconhecido, confirmar) | alta | T-008, T-011 |
| T-014 | **Web: painel do dia + histórico** (F7/F8) | média | T-008 |
| T-015 | **Deploy** do MVP | alta | H-004 |

## Candidatas (fora do MVP — o orquestrador puxa daqui depois)

- **`backlog:check` no CI**: falhar se `TODO-AI.md` + `BACKLOG.md` passarem de ~8 KB. Falta: T-001 existir. Só vale virar trava se a regra de higiene for violada (README § Higiene).
- **Porções caseiras** ("colher de sopa", "concha", "unidade média") por alimento. Falta: decisão de produto sobre quais porções e de onde vêm os pesos.
- **Refeições favoritas** ("meu café de sempre" lança vários itens de uma vez).
- **Sugestão de macros para alimento desconhecido** a partir da tabela oficial, com confirmação — nunca gerada por LLM.
- **Gráficos semanais/mensais** de kcal e macros.
- **Código de barras / foto do prato.** Falta: decisão de produto e de custo.
- **Exportar dados** (CSV).
