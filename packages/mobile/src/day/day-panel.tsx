import { formatMacros } from "@kcal/nutrition-core";
import type { DaySummaryDto, EntryDto, GoalDto, Macros } from "@kcal/shared";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  type DimensionValue,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { errorMessage } from "../api/client";
import { getDay } from "../api/days";
import { Button, colors, ErrorMessage } from "../ui/components";
import { formatGrams, formatKcal, MEAL_LABELS } from "../ui/format";
import { addDays, formatDayLabel, todayLocal } from "./dates";
import { EntryEditor } from "./entry-editor";

/**
 * Painel do dia (F7/F8): data com setas, consumido × meta, lançamentos por refeição com editar e
 * apagar. Recarrega ao ganhar foco (ex.: voltar da revisão ou do lançamento manual).
 */
export function DayPanel() {
  const hoje = todayLocal();
  const [data, setData] = useState(hoje);
  const [day, setDay] = useState<DaySummaryDto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  // Só a resposta do pedido mais recente vale (trocar de dia rápido não mistura dias).
  const pedido = useRef(0);

  const carregar = useCallback(async () => {
    const meu = ++pedido.current;
    setErro(null);
    try {
      const resumo = await getDay(data);
      if (meu === pedido.current) setDay(resumo);
    } catch (err) {
      if (meu === pedido.current) setErro(errorMessage(err));
    }
  }, [data]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  function irPara(nova: string) {
    setEditando(null);
    setData(nova);
  }

  const doDia = day?.data === data ? day : null;
  const podeAvancar = data < hoje;

  return (
    <View style={styles.panel}>
      <View style={styles.nav}>
        <NavArrow label="Dia anterior" symbol="‹" onPress={() => irPara(addDays(data, -1))} />
        <Text accessibilityRole="header" style={styles.dayLabel}>
          {formatDayLabel(data, hoje)}
        </Text>
        <NavArrow
          label="Próximo dia"
          symbol="›"
          disabled={!podeAvancar}
          onPress={() => irPara(addDays(data, 1))}
        />
      </View>
      {data !== hoje ? (
        <Button title="Voltar para hoje" variant="secondary" onPress={() => irPara(hoje)} />
      ) : null}

      <ErrorMessage>{erro}</ErrorMessage>
      {erro ? <Button title="Tentar de novo" variant="secondary" onPress={carregar} /> : null}

      {doDia ? (
        <>
          <Totals consumido={doDia.consumido} meta={doDia.meta} />
          <Button
            title="Lançar manualmente"
            variant="secondary"
            onPress={() => router.push({ pathname: "/lancamento", params: { data } })}
          />
          {doDia.refeicoes.map((grupo) => (
            <View key={grupo.refeicao} style={styles.meal}>
              <Text style={styles.mealTitle}>
                {`${MEAL_LABELS[grupo.refeicao]} · ${formatKcal(formatMacros(grupo.subtotal).kcal)} kcal`}
              </Text>
              {grupo.entradas.length === 0 ? (
                <Text style={styles.muted}>Nada lançado</Text>
              ) : (
                grupo.entradas.map((entry) =>
                  editando === entry.id ? (
                    <View key={entry.id}>
                      <EntryLine entry={entry} onPress={() => setEditando(null)} />
                      <EntryEditor
                        entry={entry}
                        onClose={() => setEditando(null)}
                        onChanged={() => {
                          setEditando(null);
                          void carregar();
                        }}
                      />
                    </View>
                  ) : (
                    <EntryLine key={entry.id} entry={entry} onPress={() => setEditando(entry.id)} />
                  ),
                )
              )}
            </View>
          ))}
        </>
      ) : erro ? null : (
        <ActivityIndicator color={colors.primary} />
      )}
    </View>
  );
}

function NavArrow(props: { label: string; symbol: string; onPress(): void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      hitSlop={8}
      style={[styles.arrow, props.disabled && styles.arrowOff]}
    >
      <Text style={styles.arrowText}>{props.symbol}</Text>
    </Pressable>
  );
}

function EntryLine({ entry, onPress }: { entry: EntryDto; onPress(): void }) {
  const kcal = formatMacros(entry).kcal;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Editar ou apagar este lançamento"
      onPress={onPress}
      style={styles.entry}
    >
      <Text style={styles.entryText}>
        {`${entry.food.nome} · ${formatGrams(entry.gramas)} g · ${formatKcal(kcal)} kcal`}
      </Text>
    </Pressable>
  );
}

const MACROS: { key: keyof Macros; label: string; unit: "kcal" | "g" }[] = [
  { key: "kcal", label: "Calorias", unit: "kcal" },
  { key: "proteinaG", label: "Proteína", unit: "g" },
  { key: "carboG", label: "Carboidrato", unit: "g" },
  { key: "gorduraG", label: "Gordura", unit: "g" },
];

/** Consumido × meta: uma barra por macro (largura proporcional, vermelha se passar da meta). */
function Totals({ consumido, meta }: { consumido: Macros; meta: GoalDto | null }) {
  const c = formatMacros(consumido);
  const fmt = (key: keyof Macros, v: number) => (key === "kcal" ? formatKcal(v) : formatGrams(v));

  return (
    <View style={styles.card}>
      {MACROS.map(({ key, label, unit }) => {
        const valor = fmt(key, c[key]);
        if (!meta) {
          return (
            <Text key={key} style={styles.totalText}>
              {`${label}: ${valor} ${unit}`}
            </Text>
          );
        }
        const alvo = meta[key];
        const fracao = alvo > 0 ? c[key] / alvo : c[key] > 0 ? 1 : 0;
        const largura: DimensionValue = `${Math.min(fracao, 1) * 100}%`;
        return (
          <View key={key} style={styles.bar}>
            <Text style={styles.totalText}>{`${label}: ${valor} / ${fmt(key, alvo)} ${unit}`}</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: largura },
                  fracao > 1 ? { backgroundColor: colors.danger } : null,
                ]}
              />
            </View>
          </View>
        );
      })}
      {meta ? (
        <Button title="Alterar meta" variant="secondary" onPress={() => router.push("/meta")} />
      ) : (
        <>
          <Text style={styles.muted}>Sem meta para este dia.</Text>
          <Button title="Definir meta" onPress={() => router.push("/meta")} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 16 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  arrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowOff: { opacity: 0.3 },
  arrowText: { fontSize: 28, lineHeight: 30, color: colors.primary },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "600", color: colors.text },
  card: { gap: 12, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  bar: { gap: 4 },
  totalText: { fontSize: 15, color: colors.text },
  track: { height: 10, borderRadius: 5, backgroundColor: "#E8EAED", overflow: "hidden" },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
  meal: { gap: 4 },
  mealTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
  entry: {
    minHeight: 44,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  entryText: { fontSize: 15, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
});
