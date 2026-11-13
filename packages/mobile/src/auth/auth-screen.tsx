import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Logo } from "../ui/logo";
import { textStyles, theme } from "../ui/theme";

const c = theme.color;

type AuthScreenProps = {
  /** Linhas do título-cartaz (ex.: `["Fala", "que a", "gente", "conta."]`); exibidas em maiúsculas. */
  titulo: readonly string[];
  /** Conteúdo do bloco branco da base (campos, erro, faixa de botões). */
  children: ReactNode;
};

/**
 * Layout das telas sem sessão no visual D (docs/HANDOFF-DESIGN-D.md § 2.4.1/2.4.2): fundo `accent`
 * inteiro, logo 72 no topo, título display 64/56 em linhas e bloco branco com borda superior 3 na base.
 */
export function AuthScreen({ titulo, children }: AuthScreenProps) {
  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Logo size={72} />
            <Text
              accessibilityRole="header"
              accessibilityLabel={titulo.join(" ")}
              style={styles.title}
            >
              {titulo.join("\n")}
            </Text>
          </View>
          <SafeAreaView edges={["bottom"]} style={styles.block}>
            {children}
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type Action = { title: string; onPress(): void; busy?: boolean; disabled?: boolean };

/**
 * Faixa de dois botões lado a lado dentro de uma borda 3: principal (fundo `ink`, texto `accent`) |
 * secundária (fundo `paper`). Os dois em display maiúsculo; o nome acessível é o `title` como escrito.
 */
export function AuthActions({ primary, secondary }: { primary: Action; secondary: Action }) {
  return (
    <View style={styles.strip}>
      <StripButton action={primary} kind="primary" />
      <StripButton action={secondary} kind="secondary" />
    </View>
  );
}

function StripButton({ action, kind }: { action: Action; kind: "primary" | "secondary" }) {
  const off = !!(action.disabled || action.busy);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: !!action.busy }}
      disabled={off}
      onPress={action.onPress}
      style={({ pressed }) => [
        styles.stripButton,
        kind === "primary" ? styles.stripPrimary : styles.stripSecondary,
        off && styles.stripOff,
        pressed && !off && styles.stripPressed,
      ]}
    >
      {action.busy ? <ActivityIndicator color={c.disabledText} /> : null}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={[
          styles.stripText,
          kind === "primary" ? styles.stripTextPrimary : styles.stripTextSecondary,
          off && styles.stripTextOff,
        ]}
      >
        {action.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.accent },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "space-between" },
  top: {
    paddingHorizontal: theme.space.page,
    paddingTop: theme.space.page,
    paddingBottom: 28,
    gap: 24,
  },
  title: {
    fontFamily: theme.font.display,
    fontSize: 64,
    lineHeight: 56,
    letterSpacing: -3,
    textTransform: "uppercase",
    color: c.ink,
  },
  block: {
    backgroundColor: c.paper,
    borderTopWidth: theme.border.heavy,
    borderColor: c.ink,
    padding: theme.space.page,
    gap: theme.space.row,
  },
  strip: {
    flexDirection: "row",
    borderWidth: theme.border.heavy,
    borderColor: c.ink,
    borderRadius: theme.radius,
  },
  stripButton: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 8,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stripPrimary: { backgroundColor: c.ink },
  stripSecondary: {
    backgroundColor: c.paper,
    borderLeftWidth: theme.border.heavy,
    borderColor: c.ink,
  },
  stripOff: { backgroundColor: c.disabledBg },
  stripPressed: { opacity: 0.85 },
  stripText: { ...textStyles.buttonPrimary, fontSize: 18, flexShrink: 1, textAlign: "center" },
  stripTextPrimary: { color: c.accent },
  stripTextSecondary: { color: c.ink },
  stripTextOff: { color: c.disabledText },
});
