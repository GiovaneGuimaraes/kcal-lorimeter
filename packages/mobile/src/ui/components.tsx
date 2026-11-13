import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

export const colors = {
  primary: "#1F7A4D",
  primaryText: "#FFFFFF",
  danger: "#B3261E",
  text: "#1B1B1B",
  muted: "#5F6368",
  border: "#C7C7C7",
  background: "#FFFFFF",
};

type ButtonProps = {
  title: string;
  onPress(): void;
  disabled?: boolean;
  busy?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ title, onPress, disabled, busy, variant = "primary" }: ButtonProps) {
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        off && styles.buttonOff,
        pressed && styles.buttonPressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={variant === "secondary" ? colors.primary : colors.primaryText} />
      ) : null}
      <Text style={[styles.buttonText, variant === "secondary" && styles.buttonTextSecondary]}>
        {title}
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
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...input}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

/** Mensagem de erro de tela (anunciada por leitor de tela). */
export function ErrorMessage({ children }: { children: string | null | undefined }) {
  if (!children) return null;
  return (
    <Text accessibilityRole="alert" style={styles.errorMessage}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonOff: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: colors.primaryText, fontSize: 16, fontWeight: "600" },
  buttonTextSecondary: { color: colors.primary },
  field: { gap: 4 },
  label: { fontSize: 14, color: colors.text, fontWeight: "500" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: 13 },
  errorMessage: { color: colors.danger, fontSize: 15 },
});
