# Handoff — visual D "Cartaz" + correções da review

> Para: Orca (orquestrador). De: sessão de teste/design de 2026-11-13.
> Base: branch `GiovaneGuimaraes/kcal-lorimeter`, commit `82f9879`.
> Canvas com as telas desenhadas (privado; peça acesso ao humano se precisar abrir):
> https://claude.ai/artifact/J11MfBjVgfjj2TgGkh1a3r — linha "D · Cartaz" (painel, revisão, login) e
> prancha "Logos provisórias" (logo 5).
>
> Tudo do `CLAUDE.md` continua valendo: teste automatizado em toda mudança de comportamento, texto
> em pt-BR, nenhum valor nutricional vindo de LLM, dado inventado nos testes, nada de segredo no app.

O documento tem três partes:

1. **Correções** encontradas no teste (independentes do visual; fazer primeiro).
2. **Especificação do visual D**, tela por tela, já traduzida para React Native/Expo.
3. **Sugestão de quebra em tarefas** e o que precisa de decisão humana.

---

## Parte 1 — Correções da review

Ordem sugerida = ordem da lista. Cada item tem arquivo, problema, reprodução, correção proposta e o
teste que deve acompanhar.

### F-1 · Conta criada mas a tela diz "Algo deu errado" — `packages/mobile/src/auth/session.tsx:88-93`

- **Severidade**: bloqueante no web; baixa probabilidade no nativo (falha de Keychain/Keystore).
- **Problema**: `persist` grava no `SecureStore` **antes** de aplicar a sessão. Se a gravação falhar,
  o cadastro/login já aconteceu no servidor (201/200), mas a pessoa vê erro genérico; tentar de novo
  dá 409 "E-mail já cadastrado".
- **Reproduzir**: rodar o app no web (onde `ExpoSecureStore` é `{}`) e criar conta. Observado no teste:
  `POST /auth/register 201` seguido de "Algo deu errado. Tente de novo." na tela.
- **Correção**:
  ```diff
     const persist = useCallback(
       async (auth: AuthResponse) => {
  -      await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(auth));
  -      apply(auth);
  +      apply(auth);
  +      try {
  +        await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(auth));
  +      } catch {
  +        // Sem armazenamento seguro: a sessão fica só em memória (pede login ao reabrir o app).
  +      }
       },
       [apply],
     );
  ```
- **Teste**: mock de `expo-secure-store` com `setItemAsync` rejeitando → `signUp`/`signIn` resolvem,
  `status` vira `signedIn`, nenhum erro na tela.

### F-2 · "Sair" não limpa a revisão pendente — `packages/mobile/src/app/index.tsx:81` (+ `auth/session.tsx`)

- **Severidade**: sugestão (privacidade).
- **Problema**: a `VoiceReview` (com a transcrição) fica no `ReviewProvider` depois do `signOut`. Se
  outra pessoa entrar no mesmo aparelho, `/revisao` ainda mostra a frase da anterior. O servidor já
  bloqueia a confirmação (testado: `POST /entries` com `voiceLogId` de outra pessoa → 404), mas o
  texto aparece.
- **Correção**: limpar a revisão ao sair. Opção simples na tela inicial:
  ```diff
  -            <Button title="Sair" variant="secondary" disabled={ocupado} onPress={signOut} />
  +            <Button
  +              title="Sair"
  +              variant="secondary"
  +              disabled={ocupado}
  +              onPress={() => {
  +                setReview(null);
  +                void signOut();
  +              }}
  +            />
  ```
  Mais robusto: o `ReviewProvider` observar `useSession().status` e zerar quando virar `signedOut`
  (cobre também o 401 automático). No visual D o "Sair" muda de lugar (menu da conta, ver 2.4.3):
  aplique a mesma limpeza lá.
- **Teste**: com revisão no contexto, sair → `review` é `null`.

### F-3 · Transcrição continua gravada depois de "descartado" — `packages/voice-core/src/discardVoiceLog.ts`

- **Severidade**: sugestão; é decisão de produto (ver H-novo na Parte 3).
- **Problema**: visto no banco de teste após descartar: `{ status: 'descartado', transcricao: 'frase
  inventada de teste' }`. Transcrição é dado de saúde e a pessoa desistiu dela.
- **Correção proposta** (se o humano aprovar): no mesmo UPDATE condicional, apagar o texto e a
  extração. `transcricao` é `notNull` (`packages/db/src/schema.ts:76`), então gravar string vazia:
  ```diff
       .update(voiceLogs)
  -    .set({ status: "descartado" })
  +    .set({ status: "descartado", transcricao: "", extracaoJson: { origem: "voz", itens: [] } })
  ```
  (Ajustar o `extracaoJson` para preservar a `origem` real, lida antes, ou tornar as colunas
  anuláveis com migration — escolha do executor, registrada no relatório.)
- **Teste**: descartar → linha tem `status = 'descartado'` e `transcricao = ''`.

### F-4 · Log de erro 500 grava o erro inteiro — `packages/rest-api/src/app.ts:36`

- **Severidade**: sugestão (privacidade).
- **Problema**: `console.error(err)` imprime mensagem completa. Num erro de banco, a mensagem do
  Drizzle pode trazer os parâmetros da query (inclusive transcrição). A rota de voz já faz certo
  (`routes/voice.ts:132`, só o tipo do erro).
- **Correção**: logar `err.name` + um id de correlação devolvido no corpo/cabeçalho, e a stack só em
  `NODE_ENV !== "production"`.
- **Teste**: rota que lança erro com texto sensível na mensagem → o texto não aparece no log
  capturado.

### F-5 · Unidade "ml" oferecida para qualquer alimento — `packages/mobile/src/app/lancamento.tsx:28-40`

- **Severidade**: sugestão.
- **Problema**: arroz cozido aparece com opção "ml" (print do teste). `gramsFromQuantity`
  (`packages/nutrition-core/src/gramsFromQuantity.ts:16`) trata ml como grama, 1:1, o que é errado
  para sólido.
- **Correção**: só oferecer "ml" quando o alimento for líquido. Não há campo para isso hoje: ou um
  campo novo em `foods` (ex.: `liquido: boolean` no seed), ou simplesmente remover "ml" do
  lançamento manual até existir. Recomendação: remover agora, abrir item de backlog para líquidos.
- **Teste**: `unitOptions(arroz)` não contém `ml`.

### F-6 · Chips de escolha expõem `selected` em vez de `checked` — `packages/mobile/src/ui/choice.tsx:33`

- **Severidade**: sugestão (acessibilidade).
- **Problema**: `accessibilityRole="radio"` com `accessibilityState={{ selected }}`. Para rádio o estado
  certo é `checked`; no web vira `aria-selected` e leitores de tela não anunciam "marcado".
- **Correção**: `accessibilityState={{ checked: selected, disabled: !!disabled }}`. No visual D o
  componente é redesenhado (ver 2.3, `SegmentedRow`): já nasce com `checked`.
- **Teste**: RNTL `getByRole("radio", { name: "Almoço", checked: true })`.

### F-7 · Web não roda (só se o web entrar no escopo) — `packages/rest-api/src/app.ts:17`, `packages/mobile/package.json`

- **Severidade**: sugestão. O MVP é nativo; isto só importa para testar no navegador ou um dia ter web.
- **Problemas** (todos vistos no teste):
  - API sem CORS: preflight `OPTIONS` → 404, navegador bloqueia (`net::ERR_FAILED`).
  - Falta `react-native-web`: `expo start --web` e `expo export --platform web` abortam.
  - O lockfile resolve `react-dom@19.3.1` (dependência opcional do expo) contra `react@19.3.0`; o
    React se recusa a montar ("Incompatible React versions").
  - `ExpoSecureStore` no web é `{}` (resolvido pelo F-1).
- **Correção**: `app.use("*", cors({ origin: <lista do .env> }))` de `hono/cors` só em
  desenvolvimento; `npx expo install react-native-web react-dom` no `packages/mobile`.
- **Teste**: smoke de Playwright no CI abrindo o login (opcional).

### F-8 · `GET /goals` sem meta responde 404 — `packages/rest-api/src/routes/goals.ts`

- **Severidade**: cosmética. O cliente já trata (`api/goals.ts` converte 404 em `null`), mas o
  navegador/console registra erro toda vez que a tela de meta abre sem meta.
- **Correção** (opcional): responder `200` com `null`, ajustando o schema de resposta e o cliente.

---

## Parte 2 — Visual D "Cartaz"

**Ideia**: tipografia grande, preto no branco, um amarelo forte de destaque, linhas grossas, cantos
retos. O número que importa ("quanto ainda cabe hoje") é o maior elemento da tela. Números e
detalhes em fonte mono.

### 2.1 Tokens — criar `packages/mobile/src/ui/theme.ts` (substitui `colors` de `ui/components.tsx`)

```ts
export const theme = {
  color: {
    ink: "#111111",        // texto, bordas, botão principal
    paper: "#FFFFFF",      // fundo
    accent: "#FFD60A",     // destaque (hero, refeição selecionada, texto do botão principal)
    textMuted: "#444444",  // texto secundário (contraste 9,7:1 no branco)
    textFaint: "#6B6B6B",  // refeição vazia, rótulos apagados (5,3:1)
    hairline: "#D0D0D0",   // divisória entre itens
    disabledBg: "#D9D9D9",
    disabledText: "#3A3A3A",
    warnStripe: "#FFF5C2", // listras do item pendente na revisão
    danger: "#B3261E",     // erro e "Confirmar exclusão"
    onInk: "#FFFFFF",
  },
  border: { heavy: 3, medium: 2, hair: 1 }, // estrutura / cabeçalho de refeição / entre itens
  radius: 0,
  space: { page: 20, row: 14, block: 18 },
  touch: 44, // mínimo de área tocável
  font: {
    display: "Archivo_900Black",   // títulos, números grandes — SEMPRE maiúsculas
    bold: "Archivo_700Bold",       // botões
    body: "Archivo_500Medium",
    mono: "IBMPlexMono_400Regular", // números, rótulos, linhas de alimento
    monoBold: "IBMPlexMono_600SemiBold",
  },
} as const;
```

Escala de texto (RN usa `letterSpacing` em px, não em em):

| Uso | Fonte | Tamanho / linha | letterSpacing | Extra |
|---|---|---|---|---|
| Número herói ("1.215") | display | 108 / 97 | -5 | — |
| Título de tela, logo-texto | display | 22 / 26 | -0.3 | `textTransform: "uppercase"` |
| Título de refeição | display | 22 / 26 | -0.2 | maiúsculas |
| Número de macro | display | 30 / 32 | -1 | — |
| Botão principal | display | 20 | 0.2 | maiúsculas |
| Botão secundário | bold | 14–16 | 0 | — |
| Rótulo pequeno ("AINDA CABEM", "PROTEÍNA") | mono | 12–13 | 0.5 | maiúsculas |
| Linha de alimento, valores | mono | 14 | 0 | — |
| Corpo/hint | body | 15 | 0 | — |

Contraste conferido: amarelo `#FFD60A` só aparece **com texto preto em cima** ou **como texto sobre
preto**; nunca texto amarelo em fundo branco.

### 2.2 Dependências novas (instalar com `npx expo install`, não `pnpm add` direto)

- `@expo-google-fonts/archivo`, `@expo-google-fonts/ibm-plex-mono`, `expo-font` — carregar no
  `_layout.tsx` com `useFonts` e segurar o splash até carregar (o `ActivityIndicator` atual já é o
  lugar).
- `react-native-svg` — para a logo e os ícones (seta, microfone, lápis, fechar). Alternativa sem
  dependência: logo em PNG nos `assets/` e setas como texto ("←" "→", que é o que o desenho usa).
- Seguir o guia de monorepo do Expo (`node-linker=hoisted` já está no `.npmrc`). **Não** adicionar
  `onlyBuiltDependencies`.

### 2.3 Componentes base — reescrever `ui/components.tsx` e `ui/choice.tsx`

| Componente | Visual D |
|---|---|
| `Button` primário | fundo `ink`, texto `accent`, display maiúsculo, altura ≥ 56, sem raio |
| `Button` secundário | fundo `paper`, borda 3 `ink`, texto `ink` bold |
| `Button` perigo | fundo `danger`, texto branco; texto **centralizado** e sem quebra feia (hoje "Confirmar exclusão" quebra em 2 linhas alinhado à esquerda) — usar `numberOfLines={1}` + `adjustsFontSizeToFit` ou rótulo curto "Apagar" |
| `Button` desabilitado | fundo `disabledBg`, texto `disabledText`, e o rótulo **diz o motivo** (ex.: "Resolva o item 04") |
| `Field` | rótulo mono 12 maiúsculo acima; input com borda 3 `ink`, raio 0, altura 52, fonte body 16 |
| `ErrorMessage` | texto `danger` 15, `accessibilityRole="alert"`, prefixo "!" em mono bold |
| `SegmentedRow` (novo, substitui `ChoiceRow`) | faixa de largura total dividida em colunas iguais com divisórias de 3 px; opção marcada com fundo `accent`; texto mono 13 maiúsculo; `accessibilityRole="radio"` + `accessibilityState={{ checked }}` (F-6) |
| `TopBar` (novo) | linha com borda inferior 3: botão "←" de 64 px com borda direita 3, título display maiúsculo |

### 2.4 Telas

Medidas de referência: celular 390 × 844. Margem lateral 20.

#### 2.4.1 Entrar — `app/login.tsx`

- Fundo **inteiro amarelo** (`accent`).
- Topo: logo (2.5) 72 × 72.
- Título display 64 / 56, maiúsculas, `letterSpacing -3`, em 4 linhas:
  **"FALA / QUE A / GENTE / CONTA."**
- Base: bloco branco com borda superior 3 contendo os campos E-mail e Senha (`Field`) e uma faixa
  com dois botões lado a lado dentro de uma borda 3: **"ENTRAR"** (fundo preto, texto amarelo) |
  **"CRIAR CONTA"** (fundo branco).
- Erro de login ("E-mail ou senha inválidos") acima da faixa de botões.
- Comportamento igual ao de hoje.

#### 2.4.2 Criar conta — `app/cadastro.tsx` (não desenhada; derivar da 2.4.1)

- Mesmo layout amarelo. Título **"CRIA SUA / CONTA."**. Campos Nome, E-mail, Senha (placeholder
  "Pelo menos 8 caracteres"). Faixa de botões: **"CRIAR CONTA"** | **"JÁ TENHO CONTA"**.

#### 2.4.3 Painel do dia — `app/index.tsx` + `day/day-panel.tsx`

De cima para baixo:

1. **Cabeçalho** (borda inferior 3): logo 32 px + "KCAL-LORIMETER" (display 18). À direita, botão
   quadrado 44 com as **iniciais** do nome (borda 3). Tocar abre um menu/`Alert` com "Sair" e
   "Cancelar" (o "Sair" aplica o F-2).
2. **Navegação de dia** (borda inferior 3): "←" (64 px, borda direita) | rótulo central mono 15
   maiúsculo **"HOJE · SEX 13 NOV"** (hoje "Hoje"/"Ontem" + data curta) | "→" (desabilitado no dia
   de hoje, texto `#B8B8B8`). Em dia passado, manter o "Voltar para hoje" como botão secundário logo
   abaixo.
3. **Bloco herói** (fundo `accent`, borda inferior 3):
   - rótulo mono "AINDA CABEM";
   - número display 108: **kcal restantes** = `restante.kcal` da API, formatado com separador de
     milhar pt-BR ("1.215");
   - linha mono: "KCAL RESTANTES" à esquerda, "786 / 2.000" à direita;
   - barra com borda 3, fundo branco, preenchimento preto proporcional ao consumido.
   - **Passou da meta**: o número vira "+N" e o rótulo "PASSOU DE HOJE"; a barra fica cheia em
     `danger`.
   - **Sem meta**: no lugar do número, "SEM META" + botão primário "DEFINIR META" (substitui o card
     atual "Sem meta para este dia.").
4. **Macros** (borda inferior 3): grade de 3 colunas com divisórias de 3 px. Cada uma: rótulo mono
   ("PROTEÍNA", "CARBO", "GORDURA"), número display 30 (consumido, gramas com até 1 casa: "85",
   "85,5"), linha mono "/ 120 g · 71%". Tocar em qualquer coluna abre a tela de meta.
5. **Refeições** (margem 20): para cada uma, cabeçalho display 22 maiúsculo com borda inferior 2 e o
   subtotal kcal em mono à direita; abaixo, uma linha por lançamento (mono 14, altura ≥ 46, divisória
   1 `hairline`): **"Arroz branco cozido — 200 g"** e kcal à direita. Tocar abre o editor (2.4.4).
   Refeição vazia: título em `textFaint` e um botão sublinhado "+ adicionar" à direita, que abre o
   lançamento manual **já com a refeição escolhida** (ver 2.6).
   - Atenção: o desenho mostra "1 scoop"/"1 unidade" nas linhas, mas `EntryDto` só guarda `gramas`.
     **Mostrar gramas** ("30 g", "50 g"). Guardar quantidade+unidade originais é um item de backlog,
     não desta tarefa.
6. **Barra fixa de baixo** (borda superior 3, altura 84): botão grande preto **"SEGURE E FALE"**
   com ícone de microfone, texto amarelo; à direita, quadrado 84 com ícone de lápis (abre a digitação).
   - Enquanto grava: o botão vira `danger` com o cronômetro "0:12 / 1:00" (o `MAX_RECORDING_MS`
     atual é 60 s) e o texto "SOLTE PARA ENVIAR".
   - Digitar: abre um campo (modal ou bloco que sobe) com o `Field` "O QUE VOCÊ COMEU?" e o botão
     primário "ENVIAR". Substitui o card "Ou digite" que hoje ocupa a tela inicial.
   - Erros de voz/texto (503, 422, 502) aparecem como `ErrorMessage` logo acima da barra.
   - **Decisão pendente**: "segure e fale" muda o gesto de hoje (tocar para começar, tocar para
     parar). Ver Parte 3, H-novo-2. Se o humano não decidir, implementar **tocar para começar /
     tocar para parar** com o mesmo visual e o rótulo "TOQUE E FALE".

#### 2.4.4 Editor do lançamento (inline no painel) — `day/entry-editor.tsx`

- Abre embaixo da linha tocada, com borda 3 em volta.
- Campo "GRAMAS" (`Field`, teclado decimal).
- `SegmentedRow` "Refeição" (Café | Almoço | Lanche | Jantar).
- Faixa de 3 botões com divisórias: **"SALVAR"** (primário) | **"APAGAR"** (texto `danger`) |
  **"CANCELAR"**.
- Confirmação de apagar: a faixa vira **"APAGAR MESMO?"** em display + dois botões
  **"APAGAR"** (fundo `danger`) | **"NÃO"**. Sem quebra de linha.
- Regra atual mantida: só manda no PATCH o que mudou (mudar só a refeição não recalcula kcal).

#### 2.4.5 Lançar manualmente — `app/lancamento.tsx` (não desenhada; derivar)

- `TopBar` com "LANÇAR".
- Linha mono "LANÇAR EM: HOJE".
- Busca: `Field` "BUSCAR ALIMENTO" + botão primário "BUSCAR". Resultados como linhas mono com o nome
  em display 17 maiúsculo e "128 kcal / 100 g" em mono, divisória 2.
- Alimento escolhido: nome display + "fonte: TACO …" em mono `textMuted`; `Field` "QUANTIDADE";
  `SegmentedRow` de unidade (sem "ml", ver F-5); `SegmentedRow` de refeição; botão primário "LANÇAR".

#### 2.4.6 Meta diária — `app/meta.tsx` (não desenhada; derivar)

- `TopBar` "META DIÁRIA". Hint mono "VALE A PARTIR DE HOJE".
- 4 `Field`: "CALORIAS (KCAL)", "PROTEÍNA (G)", "CARBOIDRATO (G)", "GORDURA (G)".
- Botão primário "SALVAR META".

#### 2.4.7 Revisão da voz — `app/revisao.tsx` + `voice/review-item.tsx`

1. `TopBar` "←" + **"CONFERE?"**.
2. Bloco preto: rótulo mono amarelo "VOCÊ DISSE" + a transcrição entre aspas em branco, bold 20.
3. `SegmentedRow` de refeição em largura total (marcada em amarelo).
4. Itens numerados **01, 02, 03…** (mono 13). Cada um, com divisória 2:
   - nome display 17 maiúsculo; abaixo, em mono, **"256 kcal"** (ver 2.6, precisa de API) e detalhe
     de porção quando houver ("1 un = 50 g");
   - à direita, campo de quantidade com borda 3 (valor em mono 15 bold + unidade "g"/"un");
   - trocar alimento e remover continuam existindo (toque longo ou botão "…" — o desenho omitiu;
     manter as ações atuais em uma linha de links mono abaixo do nome: "trocar · tirar").
5. Item **sem correspondência** ou que **precisa de peso**: fundo listrado (`warnStripe` / branco,
   45°), título display **"“FAROFA”?"**, linha mono "não achei na base" (ou "diga o peso em gramas"),
   faixa de 3 botões: **"BUSCAR"** (preto) | **"CADASTRAR"** | **"TIRAR"**.
6. Rodapé fixo: linha mono "TOTAL · 3 DE 4 ITENS" + **"568 KCAL"** em bold; abaixo, faixa
   **"DESCARTAR"** (140 px, branco) | botão principal. Com pendência: desabilitado e com o motivo
   **"RESOLVA O ITEM 04"**; sem pendência: **"SALVAR"** (preto, texto amarelo). Depois que parte já
   foi salva, "DESCARTAR" vira "SAIR SEM SALVAR O RESTO" (regra atual).

### 2.5 Logo provisória (logo 5, "K falado")

Quadrado preto com um K amarelo e duas ondas de som brancas. SVG (viewBox 32 × 32):

```svg
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="#111111"/>
  <path d="M8 7v18M8 17l9-10M11 14l7 11" stroke="#FFD60A" stroke-width="3.2" stroke-linecap="square" fill="none"/>
  <path d="M22 12a6 6 0 0 1 0 8M25.5 9a10 10 0 0 1 0 14" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>
```

- Componente `ui/logo.tsx` com `react-native-svg` (prop `size`).
- Gerar a partir do SVG: `assets/icon.png` (1024 × 1024, fundo amarelo `#FFD60A` com o quadrado preto
  centralizado em ~70%), `assets/android-icon-foreground.png`, `android-icon-background.png`
  (`#FFD60A`), `android-icon-monochrome.png`, `splash-icon.png`, `favicon.png`. Atualizar
  `app.json`: `android.adaptiveIcon.backgroundColor` → `#FFD60A`; `splash` com fundo `#FFD60A`.
- É **provisória**: registrar no relatório que a logo final ainda é decisão do humano.

### 2.6 O que o visual exige fora do mobile

| Mudança | Onde | Por quê |
|---|---|---|
| kcal (e macros) por item na revisão | `packages/shared/src/voice.ts` (`VoiceReviewItemSchema` ganha `macros?: Macros`), `packages/voice-core/src/reviewItem.ts` (quando `match.kind === "exact"` e há `gramas`, `macros = macrosForGrams(food, gramas)` do `nutrition-core`) | A revisão mostra "256 kcal" por item e o total. **Calculado no servidor pelo `nutrition-core`**, nunca pelo LLM. Teste no `voice-core` e no contrato do `shared`. |
| Recalcular kcal do item quando a pessoa muda a quantidade na revisão | `packages/mobile` | O app pode usar `macrosForGrams` do `@kcal/nutrition-core` (já é dependência do mobile e é função pura) a partir dos valores por 100 g do `match.food`. Mesma função do servidor: nada de conta própria. |
| `lancamento` aceitar `refeicao` por parâmetro | `app/lancamento.tsx` (`useLocalSearchParams<{ data?; refeicao? }>`, validado com `EntryMealSchema`) | "+ adicionar" numa refeição vazia já abre com ela marcada. |
| Separador de milhar | `ui/format.ts` (`formatKcal`) | "1.215", "2.000". Fazer na mão (`String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")`), sem depender de `Intl` do Hermes. Atualizar testes de `format`. |

### 2.7 Fora do escopo desta mudança

- Modo escuro (o D é só claro).
- Guardar quantidade/unidade originais do lançamento (backlog).
- Versão web (só se F-7 for aprovado).

### 2.8 Como verificar

- `pnpm lint && pnpm format:check && pnpm test && pnpm build` verdes.
- Testes de RNTL atualizados para os novos textos/roles (os textos mudam: "Entrar" → "ENTRAR" etc.;
  preferir `getByRole(..., { name: /entrar/i })`).
- Prints em 390 × 844 de: login, cadastro, painel sem meta, painel com meta, painel com item,
  editor aberto, confirmação de apagar, ontem, revisão com item pendente, revisão pronta, lançamento,
  meta. Comparar com o canvas.
- Teste no aparelho (H-010) continua sendo a verificação final.

---

## Parte 3 — Sugestão de tarefas e decisões

### Tarefas (cada uma vira um T-xxx com brief)

| Ordem | Tarefa | Depende de | Nível |
|---|---|---|---|
| 1 | **Correções F-1, F-2, F-5, F-6** (mobile) | — | testes unitários |
| 2 | **Correção F-4** (log da API) | — | teste unitário |
| 3 | **Correção F-3** (apagar transcrição ao descartar) | H-novo-1 | teste de core |
| 4 | **Macros por item na revisão** (2.6, linha 1) | — | testes `shared` + `voice-core` + rota |
| 5 | **Tema D: tokens, fontes, logo, componentes base** (2.1, 2.2, 2.3, 2.5) | 1 | testes de componente + prints |
| 6 | **Telas: login, cadastro, meta, lançamento** (2.4.1, 2.4.2, 2.4.5, 2.4.6) | 5 | RNTL + prints |
| 7 | **Painel + editor** (2.4.3, 2.4.4, `formatKcal`, parâmetro `refeicao`) | 5 | RNTL + prints |
| 8 | **Revisão** (2.4.7) | 4, 5 | RNTL + prints |
| 9 | (opcional) **F-7 web + F-8** | decisão humana | smoke Playwright |

### Para o TODO-HUMAN

- **H-novo-1 — Apagar a transcrição ao descartar?** Recomendação: sim (F-3). Também vale definir por
  quanto tempo guardar transcrições confirmadas.
- **H-novo-2 — Gravar: "segure e fale" ou "toque para começar / toque para parar"?** O desenho D usa
  segurar (mais rápido, mas exige manter o dedo e é pior para acessibilidade). Recomendação: tocar e
  tocar, com o visual D e o rótulo "TOQUE E FALE".
- **H-novo-3 — Logo**: a logo 5 é provisória; há outras 5 opções no canvas.
- **H-novo-4 — Web entra no escopo?** Se sim, faz-se F-7.
