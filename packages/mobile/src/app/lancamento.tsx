import {
  CreateEntrySchema,
  EntryMealSchema,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { errorMessage } from "../api/client";
import { createEntry } from "../api/entries";
import { searchFoods } from "../api/foods";
import { formatDayLabel, mealForHour, todayLocal } from "../day/dates";
import { SegmentedRow } from "../ui/choice";
import { Button, ErrorMessage, Field, TopBar } from "../ui/components";
import { formatKcal, MEAL_OPTIONS, parseNumber } from "../ui/format";
import { textStyles, theme } from "../ui/theme";
import { unitOptions } from "../ui/unit-options";

/**
 * Lançamento manual (F6): busca o alimento (`GET /foods?q=`), quantidade + unidade e refeição →
 * `POST /entries` com origem `manual`. Quem converte em gramas e calcula os macros é o servidor.
 * Parâmetros opcionais: `data` (YYYY-MM-DD) e `refeicao` (ex.: "+ adicionar" numa refeição do
 * painel); inválidos caem no default (hoje / refeição pela hora do aparelho).
 */
export default function LancamentoScreen() {
  const params = useLocalSearchParams<{ data?: string; refeicao?: string }>();
  const hoje = todayLocal();
  const data = IsoDateSchema.safeParse(params.data).success ? (params.data as string) : hoje;

  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<FoodDto[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [food, setFood] = useState<FoodDto | null>(null);
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState<QuantityUnit>("g");
  const [refeicao, setRefeicao] = useState<MealKind>(() => {
    const doParam = EntryMealSchema.safeParse(params.refeicao);
    return doParam.success ? doParam.data : mealForHour(new Date().getHours());
  });
  const [salvando, setSalvando] = useState(false);
  const [erroQuantidade, setErroQuantidade] = useState<string | undefined>();
  const [erro, setErro] = useState<string | null>(null);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

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
      voltar();
    } catch (err) {
      setErro(errorMessage(err));
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <TopBar title="Lançar" onBack={voltar} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>{`Lançar em: ${formatDayLabel(data, hoje)}`}</Text>

          {food ? (
            <View style={styles.card}>
              <View style={styles.chosen}>
                <Text style={styles.foodName}>{food.nome}</Text>
                <Text style={styles.line}>{`${formatKcal(food.kcal100g)} kcal / 100 g`}</Text>
                <Text style={styles.source}>{`fonte: ${food.fonte}`}</Text>
              </View>
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
              <SegmentedRow
                label="Unidade"
                options={unitOptions(food)}
                value={unidade}
                onChange={setUnidade}
                disabled={salvando}
              />
              <SegmentedRow
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
                <Text style={styles.empty}>Nenhum alimento encontrado.</Text>
              ) : null}
              {resultados?.length ? (
                <View style={styles.results}>
                  {resultados.map((f) => (
                    <Pressable
                      key={f.id}
                      accessibilityRole="button"
                      onPress={() => escolher(f)}
                      style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}
                    >
                      <Text style={styles.resultName}>{f.nome}</Text>
                      <Text style={styles.line}>{`${formatKcal(f.kcal100g)} kcal / 100 g`}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const c = theme.color;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.paper },
  flex: { flex: 1 },
  container: { padding: theme.space.page, gap: theme.space.block },
  card: { gap: theme.space.row },
  label: { ...textStyles.label, color: c.ink },
  line: { ...textStyles.line, color: c.ink },
  source: { ...textStyles.line, color: c.textMuted },
  empty: { ...textStyles.body, color: c.textMuted },
  chosen: { gap: 4 },
  foodName: {
    fontFamily: theme.font.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.3,
    textTransform: "uppercase",
    color: c.ink,
  },
  results: { borderTopWidth: theme.border.medium, borderColor: c.ink },
  result: {
    minHeight: theme.touch + 12,
    paddingVertical: 10,
    gap: 2,
    justifyContent: "center",
    borderBottomWidth: theme.border.medium,
    borderColor: c.ink,
  },
  resultPressed: { backgroundColor: c.accent },
  resultName: {
    fontFamily: theme.font.display,
    fontSize: 17,
    lineHeight: 20,
    textTransform: "uppercase",
    color: c.ink,
  },
});
