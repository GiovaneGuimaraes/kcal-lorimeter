# BACKLOG — ideias e trabalho ainda sem brief pronto

> Escrito pelo orquestrador (executores e revisores reportam achados no relatório, e ele registra).
> Um item sai daqui quando ganha brief completo e vai para o [`TODO-AI.md`](./TODO-AI.md), ou
> quando é descartado. Cada item diz **o que falta** para ficar pronto.
>
> Higiene: ~1–3 linhas por item. Detalhe de execução não mora aqui. Regras em [`README.md`](./README.md).

---

## Roadmap do MVP (ordem sugerida)

Funcionalidades F1–F8 de [`docs/PRODUTO.md`](../PRODUTO.md). **MVP (T-001 a T-014, T-017) mergeado na `main`.** Onda atual (handoff design D): T-018 a T-024 no `TODO-AI.md`.

| Id | Item | Complexidade | Falta para ficar pronto |
|---|---|---|---|
| T-015 | **Deploy da API** | alta | decisão de hospedagem (fora do escopo agora) |
| T-016 | **Distribuição do app**: `eas.json` com perfis, build interno | média | H-007 |

## Decisões de produto pendentes de brief

- **Quantidade não dita na fala** ("comi frango"): hoje o prompt da extração devolve `quantidade: 1, unidade: "unidade"` como sentinela, indistinguível de "1 ovo". Falta: decidir se o contrato ganha `quantidade` opcional para a tela de revisão pedir o peso (sugestão do revisor da T-010).

- **Fuso horário de "hoje"**: a API usa a data UTC do servidor como default; no Brasil (UTC-3), entre 21h e 24h o servidor já está no dia seguinte. Falta: decidir se o app sempre manda `data` local (recomendado) ou se existe fuso por usuário. Afeta T-008 (entries) e T-014 (painel).

- **Calibrar o casamento por similaridade** com frases reais: "macarrão" sugere "Maçã" (Dice 0,57 no apelido "maca"). O match carrega toda a base em memória; ok no MVP.

- **Limpeza de `voice_logs` pendentes** que nunca foram confirmados nem descartados (acumulam).
- **README da rest-api** não lista /foods, /goals, /entries, /days: atualizar quando a API estabilizar.

- **Flake no jest do mobile**: `login.test.tsx` falhou 1× em 4 execuções da suíte completa do workspace (passa isolado e em 3 execuções seguidas). Se repetir, investigar timers/`act` em `home.test.tsx`.
- **Unificar `src/api/review-entries.ts` com `src/api/entries.ts`** no mobile (criados em paralelo por T-013 e T-014).
- **Meta retroativa**: definir meta olhando um dia passado não cobre aquele dia (`vigenteDesde` = hoje). Decisão de produto.

- **T-025 — F-3**: apagar transcrição/extração ao descartar (e ao confirmar?). Falta: H-011.
- **F-7 web + F-8**: CORS em dev, `react-native-web`, `react-dom` alinhado; `GET /goals` 200 null. Falta: H-014.
- **Guardar quantidade e unidade originais do lançamento** (hoje só gramas): a linha do painel mostraria "1 scoop". Falta: migração em `meal_entries`.
- **Alimento líquido** (`ml` só quando fizer sentido): campo `liquido` em `foods` + seed; hoje `ml` saiu dos seletores (T-018) e um item extraído em `ml` fica sem chip marcado na revisão. Falta: decisão de produto.

## Candidatas (fora do MVP — o orquestrador puxa daqui depois)

- **`backlog:check` no CI**: falhar se `TODO-AI.md` + `BACKLOG.md` passarem de ~8 KB. Só vale virar trava se a regra de higiene for violada (README § Higiene).
- **Porções caseiras** ("colher de sopa", "concha", "unidade média") por alimento. Falta: decisão de produto sobre quais porções e de onde vêm os pesos.
- **Refeições favoritas** ("meu café de sempre" lança vários itens de uma vez).
- **Sugestão de macros para alimento desconhecido** a partir da tabela oficial, com confirmação — nunca gerada por LLM.
- **Gráficos semanais/mensais** de kcal e macros.
- **Código de barras / foto do prato.** Falta: decisão de produto e de custo.
- **Exportar dados** (CSV).
- **Trocar SQLite por Postgres** quando houver mais de um usuário real (Drizzle facilita).
