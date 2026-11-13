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

### [2026-11-13] H-014 — Versão web entra no escopo? (F-7 e F-8 do handoff)
- **Origem**: orquestrador (handoff design D)
- **Bloqueia**: F-7 (CORS, react-native-web, react-dom) e F-8 (GET /goals 200 null).
- **Pergunta**: o MVP é nativo. A web só importa para testar no navegador (como a sessão de review
  fez) ou para um dia ter versão web. Fazer agora?
- **Recomendação**: sim, só o F-7 (é pequeno e destrava teste automatizado com Playwright no CI);
  F-8 fica como está.
- **Resposta do humano**: _(preencher)_

### [2026-11-13] H-013 — Logo: a "logo 5" provisória serve?
- **Origem**: orquestrador (handoff § 2.5)
- **Bloqueia**: nada — T-021 usa a logo 5 como provisória.
- **Pergunta**: há 6 opções no canvas. Qual fica? Pode responder depois; trocar é só o SVG e os PNGs.
- **Recomendação**: seguir com a 5 e decidir quando ver no aparelho.
- **Resposta do humano**: _(preencher)_

### [2026-11-13] H-012 — Gravar: "segure e fale" ou "toque para começar / toque para parar"?
- **Origem**: orquestrador (handoff § 2.4.3 item 6)
- **Bloqueia**: nada — T-023 implementa **tocar/tocar** com o rótulo "TOQUE E FALE" (fallback do
  handoff). Se você preferir segurar, vira tarefa pequena depois.
- **Recomendação**: tocar/tocar (melhor acessibilidade; não exige manter o dedo).
- **Resposta do humano**: _(preencher)_

### [2026-11-13] H-011 — Apagar a transcrição ao descartar? Por quanto tempo guardar as confirmadas?
- **Origem**: orquestrador (handoff F-3)
- **Bloqueia**: T-025 (apagar texto e extração no UPDATE de descarte).
- **Pergunta**: hoje a transcrição fica gravada mesmo depois de "descartado". É dado de saúde e a
  pessoa desistiu dela. Apagar ao descartar? E as confirmadas: guardar para sempre, 30 dias, ou
  apagar ao confirmar (o lançamento já tem o snapshot)?
- **Recomendação**: apagar ao descartar **e** apagar a transcrição ao confirmar (manter só status e
  datas). Menos dado sensível parado no banco.
- **Resposta do humano**: _(preencher)_

### [2026-11-12] H-010 — Testar a primeira versão no aparelho (verificação nível 4)
- **Origem**: orquestrador (T-012, T-013, T-014)
- **Bloqueia**: nada no código. É o que falta para o MVP ser "visto funcionando".
- **Pergunta**: rodar o fluxo completo no Expo Go e dizer o que quebrou. Passos:
  1. Raiz: `cp .env.example .env`, preencher `JWT_SECRET` (≥ 32 chars), `OPENAI_API_KEY` e
     `ANTHROPIC_API_KEY` (H-008). `pnpm install && pnpm dev:api`.
  2. `ipconfig` → IP da máquina. `packages/mobile/.env` com `EXPO_PUBLIC_API_URL=http://<IP>:3000`.
     Liberar a porta 3000 no firewall. Celular e PC na mesma rede. Teste no navegador do celular:
     `http://<IP>:3000/health`.
  3. `pnpm --filter @kcal/mobile start` e abrir no Expo Go.
  4. Criar conta → definir meta → gravar "duzentos gramas de arroz e um scoop de whey" → revisar
     (o whey do seed tem porção de 30 g; um alimento sem porção pede o peso) → confirmar → ver o
     painel. Depois: lançar manualmente, editar gramas, apagar, navegar para ontem, sair e entrar.
- **Recomendação**: anotar cada tela que não bater com o esperado; vira tarefa com brief.
- **Resposta do humano**: _(preencher)_


### [2026-11-12] H-009 — Conferir os valores do seed de alimentos contra a TACO
- **Origem**: orquestrador (T-002)
- **Bloqueia**: nada no código. Bloqueia a confiança nos números que o app mostra.
- **Pergunta**: o executor escreveu os 46 alimentos de `packages/db/src/seed/default-foods.ts`
  citando "TACO 4ª ed." mas **de memória**, sem consultar a tabela. O revisor confere uma amostra
  pela web. Mesmo assim, os números precisam de conferência humana contra a TACO (NEPA/Unicamp,
  tabela pública) antes de o app ser usado de verdade. Itens que o executor marcou como mais
  incertos: abóbora cabotian, chuchu, uva Itália, manga Tommy, amendoim torrado, queijo minas.
- **Recomendação**: abrir a TACO e conferir item a item (30–40 min); corrigir no arquivo e abrir
  PR, ou me passar as correções que eu aplico. Alternativa: reduzir o seed aos ~15 itens que você
  conferiu e deixar o resto para cadastro da pessoa.
- **Resposta do humano**: _(preencher)_

### [2026-11-12] H-008 — Chaves de API para testar voz de verdade
- **Origem**: orquestrador
- **Bloqueia**: nada no código (STT e LLM são mockados nos testes). Bloqueia só o teste **real**
  do lançamento por voz no aparelho.
- **Pergunta**: crie um `.env` na raiz (a partir do `.env.example`) com `OPENAI_API_KEY`
  (transcrição Whisper) e `ANTHROPIC_API_KEY` (extração com Claude Haiku 5.5). Ambas as contas
  são pagas por uso; áudios de 10–30 s e prompts curtos custam centavos por mês.
- **Recomendação**: criar as duas chaves com limite de gasto baixo no painel de cada provedor.
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

## Resolvidos

### [2026-11-08] H-006 — Quem faz o merge das PRs?
- **Resposta do humano (2026-11-12)**: pediu que o fluxo agêntico construísse a primeira versão.
  Aplicado como: o orquestrador integra as branches aprovadas pelo revisor na branch de trabalho
  `GiovaneGuimaraes/kcal-lorimeter`; a PR dessa branch para a `main` é mergeada **pelo humano**.
  **Atualização (2026-11-13)**: o humano autorizou o merge da PR #2 na `main` "se o CI ficar
  verde". Vale como opção (b): revisor `APROVADA` + CI verde → o orquestrador abre a PR e
  mergeia; o humano revisa depois. Proteção de branch na `main` ainda não está configurada.

### [2026-11-08] H-005 — De onde vêm os macros dos alimentos padrão?
- **Resposta do humano (2026-11-12)**: ok — **TACO** para in natura/preparados; industrializado
  genérico com fonte "rótulo médio". Aplicado em `CLAUDE.md` § Stack.

### [2026-11-08] H-004 — Banco, hospedagem e autenticação
- **Resposta do humano (2026-11-12)**: API **rodando localmente**; banco **SQLite local** enquanto
  o app não cresce. Aplicado: `better-sqlite3` + Drizzle ORM (migrações versionadas), auth
  **própria** (e-mail + senha com `scrypt`, JWT com `jose`), multiusuário desde o schema. Sem
  hospedagem por ora. Ver `CLAUDE.md` § Stack.

### [2026-11-08] H-003 — Qual LLM extrai os itens da transcrição?
- **Resposta do humano (2026-11-12)**: ok — **Claude Haiku 5.5** (`claude-haiku-5-5`) com saída
  estruturada validada por Zod. Chave em `.env` (H-008).

### [2026-11-08] H-002 — Qual serviço transcreve o áudio (STT)?
- **Resposta do humano (2026-11-12)**: ok — API hospedada (OpenAI Whisper) atrás de
  `transcribe()`; áudio bruto apagado após a transcrição. Chave em `.env` (H-008).

### [2026-11-08] H-001b — Back-end: monorepo pnpm + TypeScript igual ao vetor-wallet?
- **Resposta do humano (2026-11-12)**: ok — monorepo pnpm + TS strict, `rest-api` fina (Hono),
  `*-core` de domínio, integrações separadas. **Testes com Jest**, validação com Zod, lint com
  Biome. Aplicado em `CLAUDE.md` § Stack.

### [2026-11-08] H-001 — Plataforma do app
- **Resposta do humano (2026-11-08)**: usar **[Expo](https://expo.dev/)** para a estrutura mobile.
  Aplicado em `CLAUDE.md` § Stack (`packages/mobile`, Expo Router, `expo-audio`, EAS).
