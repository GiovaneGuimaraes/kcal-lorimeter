# TODO-AI — fila pronta para executores

> **Só o orquestrador escreve aqui.** Cada item tem brief completo e nenhuma dependência aberta no
> `TODO-HUMAN.md`. Modelo de tarefa, níveis de verificação e roteamento: [`README.md`](./README.md).
>
> Estados: `PENDENTE` → `EM_ANDAMENTO` → (`BLOQUEADA`) → `EM_REVISAO` → sai daqui no merge | `CANCELADA`
>
> Tarefa concluída **sai deste arquivo**: o registro é a PR e o git.

---

## Fila

### T-012 — App: login, cliente da API e gravar áudio
- **Status**: EM_ANDAMENTO · **Complexidade**: alta · **Depende de**: T-005, T-011
- **Objetivo**: em `packages/mobile`: cliente HTTP (`src/api/client.ts`, base URL de
  `EXPO_PUBLIC_API_URL`, token em `expo-secure-store`, erros `{erro}` → mensagem), telas Expo
  Router `login` e `cadastro` (pt-BR, validação com os schemas do `@kcal/shared`), gate de
  autenticação no `_layout`, e tela inicial com botão **gravar** (`expo-audio`: pede permissão
  de microfone, grava até 60 s, mostra tempo, para e envia `POST /voice` como multipart),
  mais entrada por texto (`POST /voice/text`). A resposta (`VoiceReview`) é passada para a rota
  `/revisao` (T-013) via estado global simples (React context ou zustand).
- **Propósito**: o caminho feliz do F5 começa aqui; sem segredo no bundle.
- **Fora de escopo**: tela de revisão (T-013), painel (T-014), EAS.
- **Critério de aceite**: `pnpm --filter @kcal/mobile test` verde com RNTL: login inválido mostra
  erro em pt-BR; login válido (fetch mockado) salva token e navega; botão gravar pede permissão
  (módulo mockado) e, negada, mostra orientação; `tsc --noEmit` limpo.
- **Verificação**: 4 — humano: abrir no Expo Go, cadastrar, gravar "duzentos gramas de arroz",
  ver a tela de revisão abrir com o item.

### T-013 — App: tela de revisão e confirmação
- **Status**: PENDENTE · **Complexidade**: alta · **Depende de**: T-008, T-012
- **Objetivo**: rota `/revisao`: lista os itens do `VoiceReview` com o que foi entendido
  (transcrição no topo), por item: alimento casado (ou escolher entre candidatos, ou buscar
  `GET /foods?q=`, ou cadastrar novo via `POST /foods` com macros por 100 g), quantidade/unidade
  editáveis, pedir peso quando `precisaPeso`, refeição (default pela hora), remover item.
  **Confirmar** cria um `POST /entries` por item com `voiceLogId` e `origem` voz/texto, depois
  navega ao painel. **Descartar** → `POST /voice/:id/discard`.
- **Propósito**: "nada é salvo sem confirmação" (PRODUTO.md); é a tela principal.
- **Fora de escopo**: edição de lançamentos já salvos (T-014), favoritos.
- **Critério de aceite**: RNTL verde: item `none` mostra "cadastrar"; escolher candidato troca o
  alimento; confirmar chama `POST /entries` N vezes com o payload certo (fetch mockado); item
  sem peso bloqueia confirmar com mensagem.
- **Verificação**: 4 — humano: fluxo completo gravar → revisar → confirmar → ver no painel.

### T-014 — App: painel do dia, histórico e lançamento manual
- **Status**: PENDENTE · **Complexidade**: média · **Depende de**: T-008, T-012
- **Objetivo**: tela inicial vira o painel: `GET /days/:data` → kcal e macros consumidos × meta
  (barras), lista por refeição com editar (gramas/refeição) e apagar; setas para dia
  anterior/seguinte (F8); tela de meta (`PUT /goals`); lançamento manual (buscar alimento,
  informar quantidade) → `POST /entries` origem `manual`. Exibição com `formatMacros`.
- **Propósito**: F2, F6, F7 e F8.
- **Fora de escopo**: gráficos semanais, exportar.
- **Critério de aceite**: RNTL verde: painel renderiza totais arredondados (1 casa g, inteiro
  kcal) a partir de resposta mockada; navegação de dia muda a data pedida; apagar chama DELETE.
- **Verificação**: 4 — humano: ver o dia, editar e apagar um lançamento, trocar a meta.
