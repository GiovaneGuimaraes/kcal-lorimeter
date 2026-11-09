# TODO-HUMAN — o que só o humano resolve

> Agentes registram aqui tudo que **só o humano pode decidir ou fazer**: produto/UX, stack, gasto
> (API paga, hospedagem), credenciais e segredos, aprovação de merge, mudança de prioridade, e toda
> tarefa que bateu 3 reprovações.
>
> **Como responder**: preencha "Resposta do humano" (ou responda na conversa da sessão). Se a
> recomendação servir, basta escrever **ok**. No início de toda sessão o orquestrador lê este
> arquivo, aplica as respostas e move o item para "Resolvidos" — a resposta vira registro de
> decisão. Regra que vale para as próximas tarefas também vai para `CLAUDE.md` ou `docs/PRODUTO.md`.
>
> Item novo entra **no topo** de "Abertos". Nunca apague item sem resposta.

## Modelo de item

```markdown
### [AAAA-MM-DD] H-000 — Título da pendência
- **Origem**: orquestrador | executor (T-xxx) | revisor (T-xxx)
- **Bloqueia**: T-xxx (ou "nada — informativo")
- **Pergunta**: o que decidir, com opções e trade-offs
- **Recomendação**: a opção sugerida e por quê
- **Resposta do humano**: _(preencher)_
```

---

## Abertos

### [2026-11-08] H-006 — Quem faz o merge das PRs?
- **Origem**: orquestrador (fase 0)
- **Bloqueia**: nada agora — define o passo 5 do loop.
- **Pergunta**: (a) **humano mergeia** toda PR; (b) **modo auto**: com revisor `APROVADA` + CI
  verde, o orquestrador mergeia sozinho e o humano revisa depois; (c) auto só para docs/estilo
  (complexidade baixa), humano no resto.
- **Recomendação**: (a) até o CI existir (T-001) e rodar umas 5 PRs; depois (c) ou (b). Com o CI
  vermelho bloqueando o merge (proteção da `main` no GitHub), o modo auto fica seguro.
- **Resposta do humano**: _(preencher)_

### [2026-11-08] H-005 — De onde vêm os macros dos alimentos padrão?
- **Origem**: orquestrador
- **Bloqueia**: T-002
- **Pergunta**: a base padrão precisa de uma fonte citável — o LLM não pode inventar os números.
  Opções: **TACO** (Tabela Brasileira de Composição de Alimentos, Unicamp — pública, alimentos
  brasileiros, mas não tem industrializados como whey); **USDA FoodData Central** (enorme, em
  inglês, alimentos americanos); **rótulo** (para industrializado, varia por marca).
- **Recomendação**: **TACO** para alimentos in natura/preparados; produtos industrializados
  (whey, pasta de amendoim) entram como "genérico" com o valor médio de rótulo e fonte = "rótulo
  médio", ou ficam de fora e a pessoa cadastra o da marca dela. Diga qual dos dois prefere para
  industrializados.
- **Resposta do humano**: _(preencher)_

### [2026-11-08] H-004 — Banco, hospedagem e autenticação
- **Origem**: orquestrador
- **Bloqueia**: T-001, T-003, T-005, T-015
- **Pergunta**: (1) **Banco**: Postgres gerenciado (Supabase/Neon) ou SQLite/libSQL (Turso),
  como no vetor-wallet? (2) **Hospedagem** da API e do front. (3) **Auth**: implementação própria
  (e-mail + senha) ou provedor (Supabase Auth, Cognito, Clerk)? (4) O app é **só para você** no
  começo ou já nasce **multiusuário** para terceiros (muda o peso de auth e LGPD)?
- **Recomendação**: Postgres gerenciado (Supabase ou Neon, ambos com plano gratuito) + auth do
  próprio provedor, multiusuário desde o schema (o `user_id` custa pouco agora e muito depois).
  Hospedagem pode esperar o MVP rodar local.
- **Resposta do humano**: _(preencher)_

### [2026-11-08] H-003 — Qual LLM extrai os itens da transcrição?
- **Origem**: orquestrador
- **Bloqueia**: T-010
- **Pergunta**: a extração transforma "duzentos de arroz e um scoop de whey" em JSON estruturado.
  É uma tarefa curta e barata. Opções: Claude (Haiku 5.5 ou Sonnet 5.5) com saída estruturada /
  tool use; ou o mesmo provedor da transcrição, se for um só fornecedor.
- **Recomendação**: **Claude Haiku 5.5** com tool use (schema do JSON validado no código),
  escalando para Sonnet 5.5 só se a precisão nos testes com frases reais não bastar. Precisa de
  uma chave da API da Anthropic no `.env` (você cria; nunca vai para o repo).
- **Resposta do humano**: _(preencher)_

### [2026-11-08] H-002 — Qual serviço transcreve o áudio (STT)?
- **Origem**: orquestrador
- **Bloqueia**: T-009 (e, por consequência, todo o lançamento por voz)
- **Pergunta**: opções: (a) **API de transcrição hospedada** (família Whisper — OpenAI, Groq —
  ou Deepgram): boa em pt-BR, custo por minuto, exige chave (fica no servidor, nunca no app);
  (b) **reconhecimento de voz do próprio aparelho** (iOS/Android, via biblioteca de terceiros no
  Expo): grátis, sem servidor, mas a qualidade varia por aparelho, exige development build (não
  roda no Expo Go) e não há áudio para reprocessar; (c) **Whisper rodando por conta própria**: sem custo por uso, mas exige servidor com
  GPU/CPU forte.
- **Recomendação**: (a), atrás de uma interface `transcribe()` para poder trocar de provedor sem
  mexer no resto. Os áudios são curtos (10–30 s), então o custo por pessoa/mês tende a ser baixo —
  confira o preço atual do provedor escolhido. **E**: o áudio bruto é **apagado** logo após a
  transcrição (guarda-se só o texto)? Recomendo que sim.
- **Resposta do humano**: _(preencher)_

### [2026-11-08] H-007 — Contas para distribuir o app (Expo, Apple, Google)
- **Origem**: orquestrador (consequência da H-001)
- **Bloqueia**: T-016 (build para instalar no aparelho). **Não** bloqueia o desenvolvimento: dá
  para programar e testar com Expo Go e simulador sem nenhuma dessas contas.
- **Pergunta**: (1) criar uma conta Expo (grátis) para o EAS Build; (2) **Apple Developer
  Program** (pago, anual) — necessário para instalar build no iPhone fora do Expo Go e para
  publicar na App Store; (3) **Google Play Console** (taxa única) — só para publicar na Play Store;
  build Android interno (`.apk`) não precisa. Qual plataforma vem primeiro: iOS, Android ou as duas?
- **Recomendação**: começar pela plataforma do seu celular, só com a conta Expo e build interno;
  pagar loja só quando for abrir para outras pessoas. Confira os valores atuais nos sites.
- **Resposta do humano**: _(preencher)_

### [2026-11-08] H-001b — Back-end: monorepo pnpm + TypeScript igual ao vetor-wallet?
- **Origem**: orquestrador (o que sobrou da H-001)
- **Bloqueia**: T-001 (e, por consequência, toda a implementação)
- **Pergunta**: o mobile está decidido (Expo). Falta o resto: monorepo pnpm + TypeScript strict,
  `rest-api` fina + `*-core` de domínio + integrações separadas, como em `CLAUDE.md` § Stack? Ou
  outro desenho (ex.: back-end serverless direto no provedor do banco)?
- **Recomendação**: o mesmo desenho do vetor-wallet, com o app Expo como mais um package
  (`packages/mobile`). Os cores ficam reaproveitáveis se um dia vier versão web ou bot.
- **Resposta do humano**: _(preencher)_

## Resolvidos

### [2026-11-08] H-001 — Plataforma do app
- **Origem**: orquestrador
- **Pergunta**: onde a pessoa grava o áudio: PWA web, app nativo (React Native/Expo) ou bot de
  WhatsApp/Telegram?
- **Resposta do humano (2026-11-08)**: usar **[Expo](https://expo.dev/)** para a estrutura mobile.
  Aplicado em `CLAUDE.md` § Stack (`packages/mobile`, Expo Router, `expo-audio`, EAS). A parte de
  back-end virou a H-001b; as contas de distribuição, a H-007.
