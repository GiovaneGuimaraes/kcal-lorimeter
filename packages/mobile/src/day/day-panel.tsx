import { formatMacros, roundHalfUp } from "@kcal/nutrition-core";
import type { DaySummaryDto, EntryDto, GoalDto, Macros, MealKind } from "@kcal/shared";
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
import { Button, ErrorMessage } from "../ui/components";
import { formatGrams, formatKcal, MEAL_LABELS } from "../ui/format";
import { textStyles, theme } from "../ui/theme";
import { addDays, formatDayShortLabel, todayLocal } from "./dates";
import { EntryEditor } from "./entry-editor";

const c = theme.color;

/**
 * Painel do dia no visual D (docs/HANDOFF-DESIGN-D.md § 2.4.3): navegação de dia, bloco herói com
 * as kcal que ainda cabem, grade de macros e lançamentos por refeição (tocar abre o editor).
 * Recarrega ao ganhar foco (ex.: voltar da revisão ou do lançamento manual).
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

  function adicionar(refeicao: MealKind) {
    router.push({ pathname: "/lancamento", params: { data, refeicao } });
  }

  const doDia = day?.data === data ? day : null;
  const podeAvancar = data < hoje;

  return (
    <View>
      <View style={styles.nav}>
        <NavArrow label="Dia anterior" symbol="←" onPress={() => irPara(addDays(data, -1))} />
        <Text accessibilityRole="header" numberOfLines={1} style={styles.dayLabel}>
          {formatDayShortLabel(data, hoje)}
        </Text>
        <NavArrow
          label="Próximo dia"
          symbol="→"
          side="right"
          disabled={!podeAvancar}
          onPress={() => irPara(addDays(data, 1))}
        />
      </View>
      {data !== hoje ? (
        <View style={styles.backToday}>
          <Button title="Voltar para hoje" variant="secondary" onPress={() => irPara(hoje)} />
        </View>
      ) : null}

      {erro ? (
        <View style={styles.errorBox}>
          <ErrorMessage>{erro}</ErrorMessage>
          <Button title="Tentar de novo" variant="secondary" onPress={carregar} />
        </View>
      ) : null}

      {doDia ? (
        <>
          <Hero day={doDia} />
          <MacroGrid consumido={doDia.consumido} meta={doDia.meta} />
          <View style={styles.meals}>
            {doDia.refeicoes.map((grupo) => {
              const vazia = grupo.entradas.length === 0;
              const nome = MEAL_LABELS[grupo.refeicao];
              return (
                <View key={grupo.refeicao} style={styles.meal}>
                  <View style={styles.mealHeader}>
                    <Text
                      accessibilityRole="header"
                      style={[styles.mealTitle, vazia && styles.mealTitleEmpty]}
                    >
                      {nome}
                    </Text>
                    {vazia ? (
                      <AddLink meal={nome} onPress={() => adicionar(grupo.refeicao)} />
                    ) : (
                      <Text style={styles.mealKcal}>
                        {`${formatKcal(formatMacros(grupo.subtotal).kcal)} kcal`}
                      </Text>
                    )}
                  </View>
                  {grupo.entradas.map((entry) => (
                    <View key={entry.id}>
                      <EntryLine
                        entry={entry}
                        aberto={editando === entry.id}
                        onPress={() => setEditando(editando === entry.id ? null : entry.id)}
                      />
                      {editando === entry.id ? (
                        <EntryEditor
                          entry={entry}
                          onClose={() => setEditando(null)}
                          onChanged={() => {
                            setEditando(null);
                            void carregar();
                          }}
                        />
                      ) : null}
                    </View>
                  ))}
                  {vazia ? null : (
                    <View style={styles.addRow}>
                      <AddLink meal={nome} onPress={() => adicionar(grupo.refeicao)} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </>
      ) : erro ? null : (
        <ActivityIndicator style={styles.loading} color={c.ink} />
      )}
    </View>
  );
}

function NavArrow(props: {
  label: string;
  symbol: string;
  onPress(): void;
  disabled?: boolean;
  side?: "left" | "right";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      accessibilityState={{ disabled: !!props.disabled }}
      disabled={props.disabled}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.arrow,
        props.side === "right" ? styles.arrowRight : styles.arrowLeft,
        pressed && styles.arrowPressed,
      ]}
    >
      <Text style={[styles.arrowText, props.disabled && styles.arrowTextOff]}>{props.symbol}</Text>
    </Pressable>
  );
}

/** "+ adicionar": abre o lançamento manual já com a data e a refeição. */
function AddLink({ meal, onPress }: { meal: string; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Adicionar em ${meal}`}
      onPress={onPress}
      hitSlop={8}
      style={styles.add}
    >
      <Text style={styles.addText}>+ adicionar</Text>
    </Pressable>
  );
}

function EntryLine({
  entry,
  aberto,
  onPress,
}: {
  entry: EntryDto;
  aberto: boolean;
  onPress(): void;
}) {
  const nome = `${entry.food.nome} — ${formatGrams(entry.gramas)} g`;
  const kcal = `${formatKcal(formatMacros(entry).kcal)} kcal`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${nome}, ${kcal}`}
      accessibilityHint="Editar ou apagar este lançamento"
      accessibilityState={{ expanded: aberto }}
      onPress={onPress}
      style={({ pressed }) => [styles.entry, (pressed || aberto) && styles.entryActive]}
    >
      <Text style={styles.entryName}>{nome}</Text>
      <Text style={styles.entryKcal}>{kcal}</Text>
    </Pressable>
  );
}

/** Fração 0–1 da barra (sem meta positiva, cheia se já comeu algo). */
function fracao(consumido: number, alvo: number): number {
  if (alvo > 0) return Math.min(consumido / alvo, 1);
  return consumido > 0 ? 1 : 0;
}

/**
 * Bloco herói: o número que importa é o maior da tela. `restante.kcal` vem da API; abaixo de zero
 * vira "+N" e "PASSOU DE HOJE". Sem meta, "SEM META" e o botão para definir.
 */
function Hero({ day }: { day: DaySummaryDto }) {
  const consumido = formatMacros(day.consumido).kcal;
  if (!day.meta || !day.restante) {
    return (
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Consumido hoje: {formatKcal(consumido)} kcal</Text>
        <Text accessibilityRole="header" style={styles.heroNoGoal}>
          SEM META
        </Text>
        <Button title="Definir meta" onPress={() => router.push("/meta")} />
      </View>
    );
  }
  const restante = roundHalfUp(day.restante.kcal, 0);
  const passou = restante < 0;
  const numero = passou ? `+${formatKcal(-restante)}` : formatKcal(restante);
  const largura: DimensionValue = passou
    ? "100%"
    : `${fracao(day.consumido.kcal, day.meta.kcal) * 100}%`;
  return (
    <View style={styles.hero}>
      <Text style={styles.heroLabel}>{passou ? "PASSOU DE HOJE" : "AINDA CABEM"}</Text>
      <Text
        accessibilityLabel={`${numero} kcal ${passou ? "acima da meta" : "restantes"}`}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.heroNumber}
      >
        {numero}
      </Text>
      <View style={styles.heroLine}>
        <Text style={styles.heroLabel}>{passou ? "KCAL ACIMA DA META" : "KCAL RESTANTES"}</Text>
        <Text style={styles.heroLabel}>
          {`${formatKcal(consumido)} / ${formatKcal(day.meta.kcal)}`}
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Consumido da meta de kcal"
        style={styles.track}
      >
        <View
          testID="hero-fill"
          style={[styles.fill, { width: largura }, passou && styles.fillOver]}
        />
      </View>
    </View>
  );
}

const MACROS: { key: Exclude<keyof Macros, "kcal">; label: string; nome: string }[] = [
  { key: "proteinaG", label: "PROTEÍNA", nome: "Proteína" },
  { key: "carboG", label: "CARBO", nome: "Carboidrato" },
  { key: "gorduraG", label: "GORDURA", nome: "Gordura" },
];

/** Grade de 3 colunas: consumido em gramas e "/ meta g · %". Tocar abre a meta. */
function MacroGrid({ consumido, meta }: { consumido: Macros; meta: GoalDto | null }) {
  const cons = formatMacros(consumido);
  return (
    <View style={styles.macros}>
      {MACROS.map(({ key, label, nome }, i) => {
        const valor = formatGrams(cons[key]);
        const alvo = meta ? meta[key] : null;
        const pct = alvo && alvo > 0 ? `${roundHalfUp((consumido[key] / alvo) * 100, 0)}%` : null;
        const detalhe =
          alvo === null ? "g · sem meta" : `/ ${formatGrams(alvo)} g${pct ? ` · ${pct}` : ""}`;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`${nome}: ${valor} ${detalhe}`}
            accessibilityHint="Abre a meta diária"
            onPress={() => router.push("/meta")}
            style={({ pressed }) => [
              styles.macro,
              i > 0 && styles.macroDivider,
              pressed && styles.macroPressed,
            ]}
          >
            <Text style={styles.macroLabel}>{label}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.macroNumber}>
              {valor}
            </Text>
            <Text style={styles.macroDetail}>{detalhe}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 56,
    borderBottomWidth: theme.border.heavy,
    borderColor: c.ink,
  },
  arrow: { width: 64, alignItems: "center", justifyContent: "center", borderColor: c.ink },
  arrowLeft: { borderRightWidth: theme.border.heavy },
  arrowRight: { borderLeftWidth: theme.border.heavy },
  arrowPressed: { backgroundColor: c.accent },
  arrowText: { fontFamily: theme.font.display, fontSize: 24, color: c.ink },
  // Sem token para o "#B8B8B8" do desenho: `hairline` é o cinza claro mais próximo.
  arrowTextOff: { color: c.hairline },
  dayLabel: {
    ...textStyles.label,
    fontSize: 15,
    flex: 1,
    alignSelf: "center",
    textAlign: "center",
    paddingHorizontal: 8,
    color: c.ink,
  },
  backToday: {
    paddingHorizontal: theme.space.page,
    paddingVertical: theme.space.row,
    borderBottomWidth: theme.border.heavy,
    borderColor: c.ink,
  },
  errorBox: { gap: 10, padding: theme.space.page },
  loading: { padding: theme.space.page },
  hero: {
    gap: 8,
    paddingHorizontal: theme.space.page,
    paddingVertical: theme.space.block,
    backgroundColor: c.accent,
    borderBottomWidth: theme.border.heavy,
    borderColor: c.ink,
  },
  heroLabel: { ...textStyles.label, fontSize: 13, color: c.ink },
  heroNumber: { ...textStyles.heroNumber, color: c.ink, paddingTop: 8 },
  heroNoGoal: {
    ...textStyles.heroNumber,
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: -2,
    color: c.ink,
  },
  heroLine: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  track: {
    height: 22,
    borderWidth: theme.border.heavy,
    borderColor: c.ink,
    backgroundColor: c.paper,
  },
  fill: { height: "100%", backgroundColor: c.ink },
  fillOver: { backgroundColor: c.danger },
  macros: {
    flexDirection: "row",
    borderBottomWidth: theme.border.heavy,
    borderColor: c.ink,
  },
  macro: { flex: 1, gap: 2, paddingHorizontal: 10, paddingVertical: theme.space.row },
  macroDivider: { borderLeftWidth: theme.border.heavy, borderColor: c.ink },
  macroPressed: { backgroundColor: c.accent },
  macroLabel: { ...textStyles.label, color: c.ink },
  macroNumber: { ...textStyles.macroNumber, color: c.ink },
  macroDetail: { ...textStyles.label, textTransform: "none", color: c.textMuted },
  meals: { padding: theme.space.page, gap: theme.space.block },
  meal: {},
  mealHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: theme.border.medium,
    borderColor: c.ink,
  },
  mealTitle: { ...textStyles.mealTitle, flexShrink: 1, color: c.ink },
  mealTitleEmpty: { color: c.textFaint },
  mealKcal: { ...textStyles.line, color: c.ink },
  add: { minHeight: theme.touch, justifyContent: "flex-end" },
  addText: { ...textStyles.line, textDecorationLine: "underline", color: c.ink },
  addRow: { alignItems: "flex-end" },
  entry: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottomWidth: theme.border.hair,
    borderColor: c.hairline,
  },
  entryActive: { backgroundColor: c.accent },
  entryName: { ...textStyles.line, flexShrink: 1, color: c.ink },
  entryKcal: { ...textStyles.line, color: c.ink },
});
