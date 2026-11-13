import {
  type EntryDto,
  type MealKind,
  type UpdateEntryInput,
  UpdateEntrySchema,
} from "@kcal/shared";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { errorMessage } from "../api/client";
import { deleteEntry, updateEntry } from "../api/entries";
import { SegmentedRow } from "../ui/choice";
import { ErrorMessage, Field } from "../ui/components";
import { formatGrams, MEAL_SHORT_OPTIONS, parseNumber } from "../ui/format";
import { textStyles, theme } from "../ui/theme";

const c = theme.color;

type EntryEditorProps = {
  entry: EntryDto;
  /** Lançamento alterado ou apagado: o painel recarrega o dia. */
  onChanged(): void;
  onClose(): void;
};

/**
 * Edição de um lançamento no painel (visual D § 2.4.4): gramas e refeição (`PATCH /entries/:id`,
 * só o que mudou) e apagar com confirmação "APAGAR MESMO?" (`DELETE /entries/:id`).
 */
export function EntryEditor({ entry, onChanged, onClose }: EntryEditorProps) {
  const gramasIniciais = formatGrams(entry.gramas);
  const [gramas, setGramas] = useState(gramasIniciais);
  const [refeicao, setRefeicao] = useState<MealKind>(entry.refeicao);
  const [confirmando, setConfirmando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function executar(chamada: () => Promise<unknown>) {
    setErro(null);
    setOcupado(true);
    try {
      await chamada();
      onChanged();
    } catch (err) {
      setErro(errorMessage(err));
      setOcupado(false);
    }
  }

  function salvar() {
    // Só o que mudou: mandar `gramas` sem mudança recalcularia o snapshot com o alimento atual.
    const patch: UpdateEntryInput = {};
    if (gramas.trim() !== gramasIniciais) patch.gramas = parseNumber(gramas);
    if (refeicao !== entry.refeicao) patch.refeicao = refeicao;
    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }
    const parsed = UpdateEntrySchema.safeParse(patch);
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    void executar(() => updateEntry(entry.id, parsed.data));
  }

  return (
    <View style={styles.editor}>
      <Field
        label="Gramas"
        value={gramas}
        onChangeText={setGramas}
        keyboardType="decimal-pad"
        editable={!ocupado}
      />
      <SegmentedRow
        label="Refeição"
        options={MEAL_SHORT_OPTIONS}
        value={refeicao}
        onChange={setRefeicao}
        disabled={ocupado}
      />
      <ErrorMessage>{erro}</ErrorMessage>
      {confirmando ? (
        <View style={styles.confirm}>
          <Text
            accessibilityRole="header"
            accessibilityLabel={`Apagar ${entry.food.nome} mesmo?`}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.confirmText}
          >
            APAGAR MESMO?
          </Text>
          <View style={styles.strip}>
            <StripButton
              title="Apagar"
              kind="dangerFill"
              busy={ocupado}
              onPress={() => void executar(() => deleteEntry(entry.id))}
            />
            <StripButton
              title="Não"
              kind="plain"
              divider
              disabled={ocupado}
              onPress={() => setConfirmando(false)}
            />
          </View>
        </View>
      ) : (
        <View style={styles.strip}>
          <StripButton title="Salvar" kind="primary" busy={ocupado} onPress={salvar} />
          <StripButton
            title="Apagar"
            kind="dangerText"
            divider
            disabled={ocupado}
            onPress={() => setConfirmando(true)}
          />
          <StripButton title="Cancelar" kind="plain" divider disabled={ocupado} onPress={onClose} />
        </View>
      )}
    </View>
  );
}

type StripKind = "primary" | "dangerText" | "dangerFill" | "plain";

/**
 * Botão de uma faixa com divisórias de 3 px (o `Button` base tem borda própria, que dobraria a
 * linha dentro da faixa). Rótulo em maiúsculas só no estilo: o nome acessível fica "Salvar" etc.
 */
function StripButton(props: {
  title: string;
  kind: StripKind;
  onPress(): void;
  disabled?: boolean;
  busy?: boolean;
  divider?: boolean;
}) {
  const off = !!(props.disabled || props.busy);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.title}
      accessibilityState={{ disabled: off, busy: !!props.busy }}
      disabled={off}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.stripButton,
        props.divider && styles.stripDivider,
        bg[props.kind],
        off && !props.busy && styles.stripOff,
        pressed && !off && styles.stripPressed,
      ]}
    >
      {props.busy ? (
        <ActivityIndicator color={props.kind === "primary" ? c.accent : c.ink} />
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={[styles.stripText, fg[props.kind], off && styles.stripTextOff]}
        >
          {props.title}
        </Text>
      )}
    </Pressable>
  );
}

const bg = StyleSheet.create({
  primary: { backgroundColor: c.ink },
  dangerText: { backgroundColor: c.paper },
  dangerFill: { backgroundColor: c.danger },
  plain: { backgroundColor: c.paper },
});

const fg = StyleSheet.create({
  primary: { ...textStyles.buttonPrimary, fontSize: 18, color: c.accent },
  dangerText: { ...textStyles.buttonSecondary, textTransform: "uppercase", color: c.danger },
  dangerFill: { ...textStyles.buttonPrimary, fontSize: 18, color: c.onInk },
  plain: { ...textStyles.buttonSecondary, textTransform: "uppercase", color: c.ink },
});

const styles = StyleSheet.create({
  editor: {
    gap: theme.space.row,
    padding: theme.space.row,
    marginVertical: 8,
    borderWidth: theme.border.heavy,
    borderColor: c.ink,
    backgroundColor: c.paper,
  },
  confirm: { gap: 10 },
  confirmText: { ...textStyles.screenTitle, color: c.ink },
  strip: {
    flexDirection: "row",
    borderWidth: theme.border.heavy,
    borderColor: c.ink,
  },
  stripButton: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  stripDivider: { borderLeftWidth: theme.border.heavy, borderColor: c.ink },
  stripOff: { backgroundColor: c.disabledBg },
  stripPressed: { opacity: 0.85 },
  stripText: { textAlign: "center" },
  stripTextOff: { color: c.disabledText },
});
