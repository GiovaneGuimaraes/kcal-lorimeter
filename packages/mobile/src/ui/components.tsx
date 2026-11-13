import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { textStyles, theme } from "./theme";

const c = theme.color;

/**
 * @deprecated Paleta antiga, mantida só para as telas ainda não redesenhadas (T-022/023/024)
 * compilarem sem mudança de layout. Agora aponta para os tokens de `theme`; tela nova usa `theme`.
 */
export const colors = {
  primary: c.ink,
  primaryText: c.onInk,
  danger: c.danger,
  text: c.ink,
  muted: c.textMuted,
  border: c.hairline,
  background: c.paper,
};

export type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = {
  title: string;
  onPress(): void;
  disabled?: boolean;
  /**
   * Motivo de o botão estar indisponível (ex.: "Resolva o item 04"). Quando presente, o botão fica
   * desabilitado e o rótulo mostra o motivo no lugar do `title`.
   */
  disabledReason?: string;
  busy?: boolean;
  variant?: ButtonVariant;
};

export function Button({
  title,
  onPress,
  disabled,
  disabledReason,
  busy,
  variant = "primary",
}: ButtonProps) {
  const off = !!(disabled || disabledReason || busy);
  const label = disabledReason || title;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" ? styles.buttonPrimary : styles.buttonOther,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        off && styles.buttonOff,
        pressed && !off && styles.buttonPressed,
      ]}
    >
      {busy ? <ActivityIndicator color={c.disabledText} /> : null}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={[
          styles.buttonText,
          variant === "primary" ? styles.buttonTextPrimary : styles.buttonTextOther,
          variant === "danger" && styles.buttonTextDanger,
          off && styles.buttonTextOff,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string };

export function Field({ label, error, style, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.textFaint}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...input}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/** Mensagem de erro de tela (anunciada por leitor de tela), com prefixo "!". */
export function ErrorMessage({ children }: { children: string | null | undefined }) {
  if (!children) return null;
  return (
    <View accessible accessibilityRole="alert" accessibilityLabel={children} style={styles.error}>
      <Text style={styles.errorMark}>!</Text>
      <Text style={styles.errorMessage}>{children}</Text>
    </View>
  );
}

type TopBarProps = { title: string; onBack?(): void };

/** Barra de topo: "←" opcional à esquerda (64 px, borda direita 3) e título em maiúsculas. */
export function TopBar({ title, onBack }: TopBarProps) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
      ) : null}
      <Text accessibilityRole="header" numberOfLines={1} style={styles.topBarTitle}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radius,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonPrimary: { minHeight: 56, backgroundColor: c.ink },
  buttonOther: { minHeight: theme.touch },
  buttonSecondary: {
    backgroundColor: c.paper,
    borderWidth: theme.border.heavy,
    borderColor: c.ink,
  },
  buttonDanger: { backgroundColor: c.danger },
  buttonOff: { backgroundColor: c.disabledBg, borderColor: c.disabledBg },
  buttonPressed: { opacity: 0.85 },
  buttonText: { flexShrink: 1, textAlign: "center" },
  buttonTextPrimary: { ...textStyles.buttonPrimary, color: c.accent },
  buttonTextOther: { ...textStyles.buttonSecondary, color: c.ink },
  buttonTextDanger: { color: c.onInk },
  buttonTextOff: { color: c.disabledText },
  field: { gap: 6 },
  label: { ...textStyles.label, color: c.ink },
  input: {
    height: 52,
    borderWidth: theme.border.heavy,
    borderColor: c.ink,
    borderRadius: theme.radius,
    paddingHorizontal: 12,
    fontFamily: theme.font.body,
    fontSize: 16,
    color: c.ink,
    backgroundColor: c.paper,
  },
  inputError: { borderColor: c.danger },
  fieldError: { ...textStyles.body, color: c.danger },
  error: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  errorMark: { fontFamily: theme.font.monoBold, fontSize: 15, color: c.danger },
  errorMessage: { ...textStyles.body, flex: 1, color: c.danger },
  topBar: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 56,
    borderBottomWidth: theme.border.heavy,
    borderColor: c.ink,
    backgroundColor: c.paper,
  },
  back: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: theme.border.heavy,
    borderColor: c.ink,
  },
  backPressed: { backgroundColor: c.accent },
  backArrow: { fontFamily: theme.font.display, fontSize: 24, color: c.ink },
  topBarTitle: {
    ...textStyles.screenTitle,
    flex: 1,
    alignSelf: "center",
    paddingHorizontal: theme.space.page,
    color: c.ink,
  },
});
