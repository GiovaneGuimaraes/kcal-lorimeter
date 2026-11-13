import {
  CreateEntrySchema,
  type FoodDto,
  IsoDateSchema,
  type MealKind,
  type QuantityUnit,
} from "@kcal/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { errorMessage } from "../api/client";
import { createEntry } from "../api/entries";
import { searchFoods } from "../api/foods";
import { formatDayLabel, mealForHour, todayLocal } from "../day/dates";
import { ChoiceRow } from "../ui/choice";
import { Button, colors, ErrorMessage, Field } from "../ui/components";
import { formatKcal, MEAL_OPTIONS, parseNumber } from "../ui/format";
import { unitOptions } from "../ui/unit-options";

/**
 * Lançamento manual (F6): busca o alimento (`GET /foods?q=`), quantidade + unidade e refeição →
 * `POST /entries` com origem `manual`. Quem converte em gramas e calcula os macros é o servidor.
 */
export default function LancamentoScreen() {
  const params = useLocalSearchParams<{ data?: string }>();
  const hoje = todayLocal();
  const data = IsoDateSchema.safeParse(params.data).success ? (params.data as string) : hoje;

  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<FoodDto[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [food, setFood] = useState<FoodDto | null>(null);
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState<QuantityUnit>("g");
  const [refeicao, setRefeicao] = useState<MealKind>(() => mealForHour(new Date().getHours()));
  const [salvando, setSalvando] = useState(false);
  const [erroQuantidade, setErroQuantidade] = useState<string | undefined>();
  const [erro, setErro] = useState<string | null>(null);

  async function buscar() {
    const q = busca.trim();
    if (!q) return;
    setErro(null);
    setBuscando(true);
    try {
      setResultados(await searchFoods(q));
    } catch (err) {
      setErro(errorMessage(err));
    } finally {
      setBuscando(false);
    }
  }

  function escolher(f: FoodDto) {
    setFood(f);
    setUnidade("g");
    setErroQuantidade(undefined);
  }

  async function lancar() {
    if (!food) return;
    const parsed = CreateEntrySchema.safeParse({
      data,
      refeicao,
      foodId: food.id,
      quantidade: parseNumber(quantidade),
      unidade,
      origem: "manual",
    });
    if (!parsed.success) {
      setErroQuantidade(parsed.error.issues[0]?.message);
      return;
    }
    setErroQuantidade(undefined);
    setErro(null);
    setSalvando(true);
    try {
      await createEntry(parsed.data);
      if (router.canGoBack()) router.back();
      else router.replace("/");
    } catch (err) {
      setErro(errorMessage(err));
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>{`Lançar em: ${formatDayLabel(data, hoje)}`}</Text>

        {food ? (
          <View style={styles.card}>
            <Text style={styles.foodName}>{food.nome}</Text>
            <Text style={styles.hint}>
              {`${formatKcal(food.kcal100g)} kcal por 100 g · fonte: ${food.fonte}`}
            </Text>
            <Button
              title="Trocar alimento"
              variant="secondary"
              disabled={salvando}
              onPress={() => setFood(null)}
            />
            <Field
              label="Quantidade"
              value={quantidade}
              onChangeText={setQuantidade}
              error={erroQuantidade}
              keyboardType="decimal-pad"
              placeholder="200"
              editable={!salvando}
            />
            <ChoiceRow
              label="Unidade"
              options={unitOptions(food)}
              value={unidade}
              onChange={setUnidade}
              disabled={salvando}
            />
            <ChoiceRow
              label="Refeição"
              options={MEAL_OPTIONS}
              value={refeicao}
              onChange={setRefeicao}
              disabled={salvando}
            />
            <ErrorMessage>{erro}</ErrorMessage>
            <Button title="Lançar" busy={salvando} onPress={lancar} />
          </View>
        ) : (
          <>
            <Field
              label="Buscar alimento"
              value={busca}
              onChangeText={setBusca}
              placeholder="arroz, ovo, whey…"
              returnKeyType="search"
              onSubmitEditing={buscar}
            />
            <Button title="Buscar" busy={buscando} disabled={!busca.trim()} onPress={buscar} />
            <ErrorMessage>{erro}</ErrorMessage>
            {resultados?.length === 0 ? (
              <Text style={styles.hint}>Nenhum alimento encontrado.</Text>
            ) : null}
            {resultados?.map((f) => (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                onPress={() => escolher(f)}
                style={styles.result}
              >
                <Text style={styles.foodName}>{f.nome}</Text>
                <Text style={styles.hint}>{`${formatKcal(f.kcal100g)} kcal por 100 g`}</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, gap: 16 },
  card: { gap: 12 },
  hint: { fontSize: 14, color: colors.muted },
  foodName: { fontSize: 17, fontWeight: "600", color: colors.text },
  result: {
    minHeight: 48,
    paddingVertical: 8,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
});
