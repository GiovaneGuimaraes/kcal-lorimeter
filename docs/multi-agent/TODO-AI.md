# TODO-AI — fila pronta para executores

> **Só o orquestrador escreve aqui.** Cada item tem brief completo e nenhuma dependência aberta no
> `TODO-HUMAN.md`. Modelo de tarefa, níveis de verificação e roteamento: [`README.md`](./README.md).
>
> Estados: `PENDENTE` → `EM_ANDAMENTO` → (`BLOQUEADA`) → `EM_REVISAO` → sai daqui no merge | `CANCELADA`
>
> Tarefa concluída **sai deste arquivo**: o registro é a PR e o git.

---

## Fila

### T-010 — `llm`: extração de itens com Claude Haiku 5.5
- **Status**: PENDENTE · **Complexidade**: alta · **Depende de**: T-001
- **Objetivo**: `packages/llm` (`@kcal/llm`): schema Zod `ExtractedItem` em `@kcal/shared`
  (`alimento: string`, `quantidade: number > 0`, `unidade: 'g'|'ml'|'unidade'|'scoop'|'fatia'|
  'colher'|'xicara'|'concha'`, `refeicao?: 'cafe'|'almoco'|'lanche'|'jantar'`);
  `createItemExtractor({ client })` → `extract(text) => Promise<ExtractedItem[]>` com
  `@anthropic-ai/sdk`: `client.messages.parse`, `model: "claude-haiku-5-5"`, `max_tokens: 4096`,
  `output_config: { format: zodOutputFormat(schema) }`, prompt de sistema em pt-BR que proíbe
  valor nutricional e manda normalizar número por extenso ("duzentos" → 200). Cliente injetado.
  Resposta sem `parsed_output` → `ExtractionParseError`.
- **Propósito**: o LLM só interpreta; qualquer número de kcal/macro é descartado.
- **Fora de escopo**: casamento com o banco, persistência, prompt caching.
- **Critério de aceite**: `pnpm --filter @kcal/llm test` verde com cliente mockado: frase com 3
  itens, "um scoop de whey", `parsed_output: null` → erro, campo extra `kcal` ignorado pelo schema.
- **Verificação**: 1.
