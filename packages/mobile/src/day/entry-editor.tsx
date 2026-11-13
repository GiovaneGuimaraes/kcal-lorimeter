import {
  type EntryDto,
  type MealKind,
  type UpdateEntryInput,
  UpdateEntrySchema,
} from "@kcal/shared";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { errorMessage } from "../api/client";
import { deleteEntry, updateEntry } from "../api/entries";
import { ChoiceRow } from "../ui/choice";
import { Button, colors, ErrorMessage, Field } from "../ui/components";
import { formatGrams, MEAL_OPTIONS, parseNumber } from "../ui/format";

type EntryEditorProps = {
  entry: EntryDto;
  /** Lançamento alterado ou apagado: o painel recarrega o dia. */
  onChanged(): void;
  onClose(): void;
};

/**
 * Edição de um lançamento no painel: gramas e refeição (`PATCH /entries/:id`, só o que mudou) e
 * apagar com confirmação (`DELETE /entries/:id`).
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
      <ChoiceRow
        label="Refeição"
        options={MEAL_OPTIONS}
        value={refeicao}
        onChange={setRefeicao}
        disabled={ocupado}
      />
      <ErrorMessage>{erro}</ErrorMessage>
      {confirmando ? (
        <View style={styles.confirm}>
          <Text style={styles.confirmText}>Apagar "{entry.food.nome}" deste dia?</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                title="Confirmar exclusão"
                variant="danger"
                busy={ocupado}
                onPress={() => void executar(() => deleteEntry(entry.id))}
              />
            </View>
            <View style={styles.flex}>
              <Button
                title="Não apagar"
                variant="secondary"
                disabled={ocupado}
                onPress={() => setConfirmando(false)}
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button title="Salvar" busy={ocupado} onPress={salvar} />
          </View>
          <View style={styles.flex}>
            <Button
              title="Apagar"
              variant="danger"
              disabled={ocupado}
              onPress={() => setConfirmando(true)}
            />
          </View>
          <View style={styles.flex}>
            <Button title="Cancelar" variant="secondary" disabled={ocupado} onPress={onClose} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 12, paddingVertical: 8 },
  row: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  confirm: { gap: 8 },
  confirmText: { fontSize: 15, color: colors.text },
});
