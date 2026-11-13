import { SetGoalSchema } from "@kcal/shared";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import { errorMessage } from "../api/client";
import { getGoal, setGoal } from "../api/goals";
import { todayLocal } from "../day/dates";
import { Button, colors, ErrorMessage, Field } from "../ui/components";
import { parseNumber } from "../ui/format";
import { fieldErrors } from "../ui/validation";

type Campos = { kcal: string; proteinaG: string; carboG: string; gorduraG: string };
const VAZIO: Campos = { kcal: "", proteinaG: "", carboG: "", gorduraG: "" };

/**
 * Meta diária (F2): carrega a vigente hoje (`GET /goals?data=`) e grava uma nova (`PUT /goals`)
 * valendo a partir de hoje — dias anteriores continuam com a meta que tinham.
 */
export default function MetaScreen() {
  const hoje = todayLocal();
  const [campos, setCampos] = useState<Campos>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    getGoal(hoje)
      .then((goal) => {
        if (ativo && goal) {
          setCampos({
            kcal: String(goal.kcal),
            proteinaG: String(goal.proteinaG),
            carboG: String(goal.carboG),
            gorduraG: String(goal.gorduraG),
          });
        }
      })
      .catch((err) => {
        if (ativo) setErro(errorMessage(err));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [hoje]);

  function campo(key: keyof Campos) {
    return (texto: string) => setCampos((c) => ({ ...c, [key]: texto }));
  }

  async function salvar() {
    const parsed = SetGoalSchema.safeParse({
      kcal: parseNumber(campos.kcal),
      proteinaG: parseNumber(campos.proteinaG),
      carboG: parseNumber(campos.carboG),
      gorduraG: parseNumber(campos.gorduraG),
      vigenteDesde: hoje,
    });
    if (!parsed.success) {
      setErros(fieldErrors(parsed.error.issues));
      return;
    }
    setErros({});
    setErro(null);
    setSalvando(true);
    try {
      await setGoal(parsed.data);
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (err) {
      setErro(errorMessage(err));
      setSalvando(false);
    }
  }

  if (carregando) {
    return <ActivityIndicator style={styles.loading} color={colors.primary} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>A nova meta vale a partir de hoje.</Text>
        <Field
          label="Calorias (kcal)"
          value={campos.kcal}
          onChangeText={campo("kcal")}
          error={erros.kcal}
          keyboardType="number-pad"
          editable={!salvando}
        />
        <Field
          label="Proteína (g)"
          value={campos.proteinaG}
          onChangeText={campo("proteinaG")}
          error={erros.proteinaG}
          keyboardType="number-pad"
          editable={!salvando}
        />
        <Field
          label="Carboidrato (g)"
          value={campos.carboG}
          onChangeText={campo("carboG")}
          error={erros.carboG}
          keyboardType="number-pad"
          editable={!salvando}
        />
        <Field
          label="Gordura (g)"
          value={campos.gorduraG}
          onChangeText={campo("gorduraG")}
          error={erros.gorduraG}
          keyboardType="number-pad"
          editable={!salvando}
        />
        <ErrorMessage>{erro}</ErrorMessage>
        <Button title="Salvar meta" busy={salvando} onPress={salvar} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, gap: 16 },
  hint: { fontSize: 14, color: colors.muted },
});
