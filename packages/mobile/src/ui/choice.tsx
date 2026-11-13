import { Pressable, StyleSheet, Text, View } from "react-native";
import { textStyles, theme } from "./theme";

const c = theme.color;

type Option<T extends string> = { value: T; label: string };

type SegmentedRowProps<T extends string> = {
  /** Nome do grupo, mostrado acima e lido pelo leitor de tela (ex.: "Refeição"). */
  label: string;
  options: readonly Option<T>[];
  value: NoInfer<T> | null;
  onChange(value: NoInfer<T>): void;
  disabled?: boolean;
};

/**
 * Escolha única entre poucas opções (refeição, unidade): faixa de largura total em colunas iguais,
 * divisórias de 3 px, opção marcada com fundo `accent`.
 */
export function SegmentedRow<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: SegmentedRowProps<T>) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
        {options.map((opt, i) => {
          const checked = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ checked, disabled: !!disabled }}
              disabled={disabled}
              onPress={() => onChange(opt.value)}
              style={[styles.segment, i > 0 && styles.divider, checked && styles.checked]}
            >
              <Text
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[styles.text, disabled && !checked && styles.textOff]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  label: { ...textStyles.label, color: c.ink },
  row: {
    flexDirection: "row",
    alignSelf: "stretch",
    borderWidth: theme.border.heavy,
    borderColor: c.ink,
    borderRadius: theme.radius,
    backgroundColor: c.paper,
  },
  segment: {
    flex: 1,
    minHeight: theme.touch,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { borderLeftWidth: theme.border.heavy, borderColor: c.ink },
  checked: { backgroundColor: c.accent },
  text: {
    ...textStyles.label,
    fontSize: 13,
    textAlign: "center",
    color: c.ink,
  },
  textOff: { color: c.textFaint },
});
