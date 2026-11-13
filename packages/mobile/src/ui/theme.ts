import type { TextStyle } from "react-native";

/** Tokens do visual D "Cartaz" (docs/HANDOFF-DESIGN-D.md § 2.1). Telas não definem cor/fonte/borda. */
export const theme = {
  color: {
    ink: "#111111", // texto, bordas, botão principal
    paper: "#FFFFFF", // fundo
    accent: "#FFD60A", // destaque (hero, refeição selecionada, texto do botão principal)
    textMuted: "#444444", // texto secundário (contraste 9,7:1 no branco)
    textFaint: "#6B6B6B", // refeição vazia, rótulos apagados (5,3:1)
    hairline: "#D0D0D0", // divisória entre itens
    disabledBg: "#D9D9D9",
    disabledText: "#3A3A3A",
    warnStripe: "#FFF5C2", // listras do item pendente na revisão
    danger: "#B3261E", // erro e "Confirmar exclusão"
    onInk: "#FFFFFF",
  },
  border: { heavy: 3, medium: 2, hair: 1 }, // estrutura / cabeçalho de refeição / entre itens
  radius: 0,
  space: { page: 20, row: 14, block: 18 },
  touch: 44, // mínimo de área tocável
  font: {
    display: "Archivo_900Black", // títulos, números grandes — SEMPRE maiúsculas
    bold: "Archivo_700Bold", // botões
    body: "Archivo_500Medium",
    mono: "IBMPlexMono_400Regular", // números, rótulos, linhas de alimento
    monoBold: "IBMPlexMono_600SemiBold",
  },
} as const;

/** Escala de texto do § 2.1 (RN usa `letterSpacing` em px). Cor fica com quem usa. */
export const textStyles = {
  heroNumber: { fontFamily: theme.font.display, fontSize: 108, lineHeight: 97, letterSpacing: -5 },
  screenTitle: {
    fontFamily: theme.font.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    textTransform: "uppercase",
  },
  mealTitle: {
    fontFamily: theme.font.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.2,
    textTransform: "uppercase",
  },
  macroNumber: { fontFamily: theme.font.display, fontSize: 30, lineHeight: 32, letterSpacing: -1 },
  buttonPrimary: {
    fontFamily: theme.font.display,
    fontSize: 20,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  buttonSecondary: { fontFamily: theme.font.bold, fontSize: 16, letterSpacing: 0 },
  label: {
    fontFamily: theme.font.mono,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  line: { fontFamily: theme.font.mono, fontSize: 14, letterSpacing: 0 },
  body: { fontFamily: theme.font.body, fontSize: 15, letterSpacing: 0 },
} as const satisfies Record<string, TextStyle>;
