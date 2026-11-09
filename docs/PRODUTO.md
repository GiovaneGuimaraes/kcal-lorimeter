# kcal-lorimeter — o produto

Fonte de verdade sobre **o que** o app é. O **como** técnico vive no [`CLAUDE.md`](../CLAUDE.md);
o **quando**, em [`multi-agent/TODO-AI.md`](multi-agent/TODO-AI.md) e
[`multi-agent/BACKLOG.md`](multi-agent/BACKLOG.md). Mudar algo aqui é decisão de produto: passa
pelo humano (`TODO-HUMAN.md`).

## Problema

Contar calorias funciona, mas registrar cada refeição é chato: abrir o app, buscar o alimento,
digitar a quantidade, repetir para cada item. A maioria das pessoas desiste em poucos dias. Falar
"almocei 200 g de arroz, 150 g de frango e uma batata média" leva 5 segundos.

## Proposta

1. A pessoa **grava um áudio** dizendo o que comeu: alimento, quantidade e, se quiser, a refeição.
2. O app **transcreve** o áudio e **extrai os itens** (alimento + quantidade + unidade).
3. Cada item é **casado com um alimento do banco** (padrão do app ou criado pela própria pessoa).
4. A pessoa **confere e confirma** a lista antes de salvar: corrige um item, remove outro ou cria
   um alimento que o app não conhece.
5. O app **calcula os macros** de forma determinística e soma no **painel do dia** contra a meta.

## Princípios (valem para toda tarefa)

- **IA interpreta, código calcula.** O modelo de linguagem só transforma fala em
  `{alimento, quantidade, unidade}`. Kcal e macros vêm **sempre** do banco, multiplicados por uma
  função pura (`macros_por_100g × gramas / 100`). O modelo **nunca inventa** valor nutricional.
- **Nada é salvo sem confirmação.** A transcrição e a extração erram ("cem" vs "sem", "frango" vs
  "frango empanado"). A tela de revisão é parte do fluxo principal, não um detalhe.
- **Alimento desconhecido vira cadastro, não chute.** Se o item não casa com nada, o app pede para a
  pessoa informar os macros (ou escolher um alimento parecido). O cadastro fica salvo para a
  próxima vez.
- **Digitar é sempre uma alternativa.** Todo lançamento por voz também pode ser feito por texto ou
  manualmente (o áudio pode falhar, o lugar pode ser barulhento).
- **Dado de saúde é sensível.** O áudio bruto não precisa ser guardado depois de transcrito
  (decisão em `TODO-HUMAN.md`); dados de uma pessoa nunca aparecem para outra.

## Funcionalidades

### MVP (primeira versão utilizável)

| # | Funcionalidade | Detalhe |
|---|---|---|
| F1 | Conta e login | Cada pessoa vê só os próprios dados. |
| F2 | Meta diária | Kcal + gramas de proteína, carboidrato e gordura; editável. |
| F3 | Base de alimentos padrão | Pré-carregada com os mais comuns (arroz, feijão, frango, ovo, batata, batata-doce, aveia, banana, whey…), macros por 100 g, com a fonte de cada valor. |
| F4 | Alimentos da pessoa | Ela cadastra o próprio alimento (nome, apelidos, macros por 100 g ou por porção). Visível só para ela. |
| F5 | Lançamento por voz | Gravar → transcrever → extrair itens → casar com alimentos → tela de revisão → salvar. |
| F6 | Lançamento por texto/manual | Mesma tela de revisão, entrada digitada ou busca de alimento. |
| F7 | Painel do dia | Total consumido × meta (kcal e macros), lista de lançamentos agrupada por refeição, editar/apagar lançamento. |
| F8 | Histórico | Navegar entre dias. |

### Depois do MVP (candidatas — ver `BACKLOG.md`)

Porções caseiras ("1 colher de sopa", "1 concha", "1 unidade média"), refeições salvas/favoritas
("meu café de sempre"), gráficos semanais, código de barras, foto do prato, sugestão de macros
para alimento desconhecido a partir de tabela oficial, exportar dados.

## Fluxo do lançamento por voz

```
[gravar áudio] ──► [upload] ──► [transcrição (STT)] ──► texto
                                                          │
                                                          ▼
                                    [extração (LLM, saída estruturada)]
                                    [{ "alimento": "arroz branco cozido",
                                       "quantidade": 200, "unidade": "g" }, …]
                                                          │
                                                          ▼
                    [casamento com o banco: nome + apelidos, depois busca aproximada]
                         │                         │                         │
                   casou com 1             vários candidatos            nenhum
                         │                         │                         │
                         ▼                         ▼                         ▼
                 item pronto            pessoa escolhe na revisão   pessoa cadastra ou troca
                         └─────────────────────────┴─────────────────────────┘
                                                   ▼
                                     [tela de revisão — confirma]
                                                   ▼
                     [salva lançamentos com snapshot dos macros calculados]
                                                   ▼
                                           [painel do dia]
```

**Snapshot dos macros no lançamento**: o lançamento guarda os valores calculados no momento em que
foi salvo. Se a pessoa editar o alimento depois, os dias passados não mudam.

**Unidades no MVP**: gramas (`g`) e mililitros (`ml`, tratado como grama para líquidos comuns,
salvo densidade cadastrada). "Unidade"/"scoop"/"fatia" só valem quando o alimento tem uma
**porção padrão** cadastrada em gramas (ex.: whey, 1 scoop = 30 g). Sem porção cadastrada, a
revisão pede o peso.

## Modelo de dados (rascunho — o schema definitivo sai na tarefa de banco)

| Entidade | Campos principais |
|---|---|
| `users` | id, email, nome, criado_em |
| `daily_goals` | user_id, kcal, proteina_g, carbo_g, gordura_g, vigente_desde |
| `foods` | id, **user_id (nulo = alimento padrão)**, nome, apelidos[], kcal/proteina/carbo/gordura **por 100 g**, porcao_padrao_g (opcional), nome_porcao, fonte |
| `voice_logs` | id, user_id, transcricao, extracao_json, status (`pendente` / `confirmado` / `descartado`), criado_em |
| `meal_entries` | id, user_id, data, refeicao, food_id, gramas, **kcal/proteina/carbo/gordura calculados (snapshot)**, origem (`voz` / `texto` / `manual`), voice_log_id |

Toda consulta de `foods` para uma pessoa retorna **padrões + os dela**, nunca os de outra pessoa.

## Fora do escopo do produto (por ora)

- Recomendação nutricional, dieta ou meta "ideal" calculada pelo app — o app registra e soma, não
  prescreve. Meta é a pessoa que define.
- Micronutrientes (vitaminas, sódio, fibras) — candidato futuro.
- Integração com balança, wearable ou app de academia.
