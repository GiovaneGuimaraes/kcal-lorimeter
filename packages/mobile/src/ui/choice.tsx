import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "./components";

type Option<T extends string> = { value: T; label: string };

type ChoiceRowProps<T extends string> = {
  /** Nome do grupo para leitor de tela (ex.: "Refeição"). */
  label: string;
  options: readonly Option<T>[];
  value: NoInfer<T> | null;
  onChange(value: NoInfer<T>): void;
  disabled?: boolean;
};

/** Escolha única entre poucas opções (refeição, unidade): botões lado a lado. */
export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: ChoiceRowProps<T>) {
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: !!disabled }}
              disabled={disabled}
              onPress={() => onChange(opt.value)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
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
  group: { gap: 4 },
  label: { fontSize: 14, color: colors.text, fontWeight: "500" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.text },
  chipTextSelected: { color: colors.primaryText, fontWeight: "600" },
});
