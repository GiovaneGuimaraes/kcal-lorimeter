# Sistema multi-agente — kcal-lorimeter

Como o trabalho anda neste repo. **Todo agente lê este arquivo antes de qualquer tarefa.**
Adaptado do fluxo do `vetor-wallet` (loop orquestrador → executor → revisor, estado no repo) e do
`oneclickads/monorepo` (separar o que está *pronto* do que ainda é ideia ou decisão; classificar
como a tarefa é verificada).

## Papéis

| Papel | Modelo | Quem é | Faz |
|---|---|---|---|
| **Orquestrador** | sessão principal do Claude Code (Fable ou Opus 5.5) | quem abre a sessão no repo | Lê o estado, refina `BACKLOG` → `TODO-AI`, escolhe modelo, delega, manda revisar, abre a PR |
| **Executor** | Haiku / Sonnet / Opus 5.5, por complexidade | subagente `executor` (`.claude/agents/executor.md`), em worktree isolado | Implementa **uma** tarefa do `TODO-AI` com testes e devolve relatório estruturado |
| **Revisor** | Sonnet 5.5 (padrão) | subagente `revisor` (`.claude/agents/revisor.md`) | Roda os testes ele mesmo, lê o diff e devolve `APROVADA` / `REPROVADA` |
| **Planejador** (opcional) | Opus 5.5 (agente `Plan`) | subagente | Spike de design antes de tarefa **alta**: arquivos, abordagem, riscos. O plano entra inteiro no prompt do executor |
| **Humano** | — | Giovane | Decide produto, stack, gastos e segredos; responde o `TODO-HUMAN`; faz o merge (até autorizar o modo auto, H-006) |

## Os três arquivos de estado

O trabalho tem **três lugares**, um para cada tipo de coisa. Nenhum item fica em dois ao mesmo tempo.

| Arquivo | O que entra | Quem escreve | Quem lê |
|---|---|---|---|
| [`BACKLOG.md`](./BACKLOG.md) | **Ideias e trabalho ainda sem brief pronto**: falta objetivo ou aceite verificável, depende de decisão não tomada, ou é só "seria bom ter". | Orquestrador (e o que executores/revisores reportam como achado) | Orquestrador, ao planejar |
| [`TODO-AI.md`](./TODO-AI.md) | **Fila pronta para um executor**: brief completo (Objetivo, Propósito, Fora de escopo, Aceite verificável, Complexidade, Verificação), dependências resolvidas. | **Só o orquestrador** | Orquestrador, ao delegar; executor recebe o item no prompt |
| [`TODO-HUMAN.md`](./TODO-HUMAN.md) | **O que só o humano resolve**: decisão de produto/stack/UX, credencial, gasto, aprovação, tarefa bloqueada por 3 reprovações. | Orquestrador e executores (registrar); humano (responder) | Orquestrador, **no início de toda sessão** |

### O caminho de um item

```
          ideia / achado no meio de outra tarefa / pedido do humano
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   BACKLOG.md    │  sem brief pronto
                          └────────┬────────┘
             depende de decisão?   │   orquestrador escreve o brief completo
           ┌───────────────────────┤
           ▼                       ▼
  ┌─────────────────┐     ┌─────────────────┐
  │ TODO-HUMAN.md   │────►│   TODO-AI.md    │  pronto para executor
  │ pergunta aberta │resp.└────────┬────────┘
  └─────────────────┘              │ delega (worktree)
           ▲                       ▼
           │              executor ──► revisor ──┐
           │  BLOQUEADA      ▲   REPROVADA (≤3)  │ APROVADA
           └─────────────────┴───────────────────┤
              (3ª reprovação ou decisão humana)  ▼
                                         PR ──► CI verde ──► merge
                                                             │
                                          item SAI do TODO-AI (registro = PR + git)
```

### Quando um item está "pronto" (pode ir para o `TODO-AI`)

Tem **Objetivo** e **Critério de aceite** que um executor consegue checar sozinho, e nenhuma
dependência aberta no `TODO-HUMAN`. Faltou qualquer um → fica no `BACKLOG`, com uma linha dizendo o
que falta. Uma pergunta pendente vira item no `TODO-HUMAN`, nunca uma frase solta no brief.

### Modelo de tarefa (`TODO-AI`)

```markdown
### T-000 — Título curto e imperativo
- **Status**: PENDENTE · **Complexidade**: baixa | média | alta · **Depende de**: — | T-xxx
- **Objetivo**: o que fazer.
- **Propósito**: o estado final que a tarefa serve e por quê (1 linha).
- **Fora de escopo**: o que NÃO entra, mesmo parecendo vizinho.
- **Arquivos-alvo**: caminhos prováveis.
- **Critério de aceite**: verificável + comando de teste.
- **Verificação**: 1 teste | 2 rodar o app | 3 não precisa (motivo) | 4 humano no aparelho (passo + esperado) — ver abaixo.
```

**Por que `Propósito` e `Fora de escopo`**: critério de aceite sozinho é um proxy que o agente
satisfaz ao pé da letra. O propósito é a regra de decisão que ele leva para as escolhas que o brief
não previu; o fora de escopo impede o efeito colateral "aproveitei e arrumei".

### Níveis de verificação

Decidido no brief, pelo orquestrador. A primeira linha que servir, de cima para baixo:

| Nível | A tarefa se prova por | Exemplo |
|---|---|---|
| **1 — Teste** | teste automatizado que afirma exatamente o critério de aceite | cálculo de macros, casamento de alimento, validação do JSON do LLM |
| **2 — Rodar o app** | o executor sobe a API (ou o app Expo em simulador/web), exercita a mudança e cola no relatório o comando e a saída real; o revisor repete **uma** chamada | upload de áudio para a API de ponta a ponta, migração do banco |
| **3 — Não precisa** | o merge prova (docs, config, refactor sem mudança de comportamento) — o motivo vai escrito, e nunca é "os testes passaram" | esta PR |
| **4 — Humano testa no aparelho** | o que só um celular de verdade mostra: gravação com o microfone, permissões do sistema, layout em tela pequena. O brief diz **o passo** e **o esperado**; o orquestrador registra no `TODO-HUMAN` depois do merge, com o build (EAS) a instalar | gravar áudio no iPhone/Android, negar e conceder permissão de microfone |

## Estados de uma tarefa

`PENDENTE` → `EM_ANDAMENTO` → (`BLOQUEADA` ⇄) → `EM_REVISAO` → **sai do arquivo** (merge) | `CANCELADA`

## O loop

```
0. LER RESPOSTAS   Início de toda sessão: lê TODO-HUMAN.md. Item com "Resposta do humano"
                   preenchida → aplica a resposta (documenta em PRODUTO.md/CLAUDE.md se for
                   regra que vale para as próximas tarefas) e move o item para "Resolvidos".
                   Tarefa BLOQUEADA por ele volta para a fila.
1. PLANEJAR        Lê ORQUESTRADOR.md, CLAUDE.md, TODO-AI.md, BACKLOG.md.
                   Promove do BACKLOG para o TODO-AI o que ficou pronto. Pergunta nova → TODO-HUMAN.
2. DELEGAR         Para cada tarefa pronta: subagente `executor`, isolation "worktree",
                   model pelo roteamento. Tarefas sem arquivos em comum rodam em paralelo.
3. EXECUTAR        Executor implementa + testa no worktree. Bloqueou em decisão humana →
                   registra no TODO-HUMAN e devolve BLOQUEADA.
4. REVISAR         Subagente `revisor` sobre o diff. REPROVADA → volta ao executor com os
                   achados (SendMessage, mesmo worktree). 3ª REPROVADA → BLOQUEADA + TODO-HUMAN.
5. INTEGRAR        Orquestrador abre a PR (`gh pr create --body-file`). O gate é o CI verde,
                   não o relatório. Merge: humano, até H-006 autorizar o modo auto.
6. FECHAR          Tarefa sai do TODO-AI. O que muda o roteamento futuro → CALIBRAGEM.md.
                   Reavalia prioridades e volta ao passo 1.
```

## Roteamento de modelos

O orquestrador escolhe o modelo pelo parâmetro `model` da ferramenta Agent, conforme o campo
**Complexidade**. Os aliases devem resolver para a geração **5.5**; se não resolverem, o
orquestrador passa o id exato (`claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`).

| Complexidade | Sinais | Executor | Revisor |
|---|---|---|---|
| **baixa** | docs, estilo/CSS, rename, texto de UI, config trivial — **sem** lógica de negócio nem SQL | `haiku` | `sonnet` (diff só de docs: `haiku`) |
| **média** | feature sobre padrão existente: rota nova espelhando outra, tela sobre API pronta | `sonnet` | `sonnet` |
| **alta** | cálculo nutricional, schema/migração, auth e isolamento por `user_id`, pipeline de voz (STT + LLM + casamento), mudança em vários packages, muitos casos de borda | `opus` | `sonnet` |

- **Na dúvida entre média e alta, escolha alta.** Um ciclo executar → reprovar → corrigir custa
  mais que a diferença de modelo.
- **Escalonamento**: 1 reprovação de tarefa feita em Haiku → próximo ciclo em Sonnet. 2
  reprovações seguidas → próximo ciclo em Opus, com **os vereditos originais do revisor e o diff**
  no prompt (não um resumo do orquestrador).
- **Teto de 3 ciclos.** A 3ª reprovação encerra: tarefa `BLOQUEADA`, vai para o `TODO-HUMAN` com os
  achados das três revisões. Três reprovações quase sempre são brief ruim ou decisão de produto
  disfarçada, e modelo maior não conserta isso.
- **Spike de design** (`Plan`, `opus`) é recomendado antes de toda tarefa alta.
- Modelo usado e veredito vão no **corpo da PR**; só o que muda decisão futura vai para
  `CALIBRAGEM.md`.

## O predicado de sucesso é evidência, não relatório

- O orquestrador **não aceita "testes passaram"** do relatório de ninguém. O gate é o **check do CI
  na PR**; antes de existir CI (fase 0), é a saída real do comando colada pelo revisor.
- Risco que nenhum teste cobre (chamada real ao STT, gravação no aparelho) é verificado
  **rodando**, no nível 2 ou 4, não lendo o diff.

## Regras de comunicação

- **Só o orquestrador escreve no `TODO-AI.md` e no `BACKLOG.md`.** Executores rodam em worktrees
  diferentes; duas escritas no mesmo arquivo viram conflito que só aparece no merge. O que o
  executor quer acrescentar vai no relatório.
- **Executores nunca perguntam ao humano diretamente.** Registram no `TODO-HUMAN.md` (a única
  escrita de estado permitida a eles) e devolvem `BLOQUEADA`.
- **Executores devolvem dados, não prosa**: o formato está em `.claude/agents/executor.md`.
- **Nada de dado sensível** em arquivo versionado, PR ou commit (ver `CLAUDE.md`).

## Higiene dos arquivos de estado

Eles são lidos em toda sessão, então cada linha custa token sempre.

- **Tarefa concluída sai do `TODO-AI`** e não migra para lugar nenhum: o registro é a PR e o git.
  O que o app *é hoje* vai para `CLAUDE.md` / `docs/PRODUTO.md`.
- **Tarefa viva cabe em ~700 caracteres.** Plano de execução detalhado vai no prompt do executor;
  post-mortem vai no corpo da PR.
- **`TODO-AI` + `BACKLOG` juntos até ~8 KB.** Estourou = tarefa concluída que não saiu ou brief
  inflado. Quando houver `package.json`, isso vira o script `backlog:check` no CI (está no BACKLOG).
- **Regra em prosa violada duas vezes vira trava executável** (CI ou hook). Antes disso, não:
  trava para falha hipotética só custa.

## Mexer nos prompts dos agentes

`.claude/agents/executor.md` e `revisor.md` mudam muito comportamento por caractere. Toda
alteração: uma linha em `CALIBRAGEM.md` § "Versões dos prompts" (data, o que mudou, por quê).
