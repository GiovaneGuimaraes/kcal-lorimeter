import type { MealKind } from "@kcal/shared";
import { MEAL_ORDER } from "@kcal/shared";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { errorMessage } from "../api/client";
import { createEntry, discardVoiceLog } from "../api/review-entries";
import { SegmentedRow } from "../ui/choice";
import { Button, ErrorMessage, TopBar } from "../ui/components";
import { textStyles, theme } from "../ui/theme";
import { ReviewItemCard } from "../voice/review-item";
import {
  confirmBlockers,
  entryBody,
  firstPendingIndex,
  formatKcalMilhar,
  initialMeal,
  initLines,
  itemNumber,
  localIsoDate,
  MEAL_LABELS,
  type ReviewLine,
  reviewTotal,
} from "../voice/review-lines";
import { type PendingReview, useReview } from "../voice/review-store";

const c = theme.color;

const MEAL_CHOICES = MEAL_ORDER.map((value) => ({ value, label: MEAL_LABELS[value] }));

/**
 * Revisão do lançamento por voz/texto ("CONFERE?", § 2.4.7): nada é salvo sem a pessoa confirmar.
 * Cada item pode trocar de alimento (candidato, busca ou cadastro), mudar quantidade/unidade ou
 * sair da lista. Os kcal mostrados vêm da API ou do `@kcal/nutrition-core` depois de editar;
 * salvar cria um `POST /entries` por item e o snapshot gravado é o do servidor.
 */
export default function RevisaoScreen() {
  const { review } = useReview();

  if (!review) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="CONFERE?" onBack={voltar} />
        <View style={styles.empty}>
          <Text style={styles.body}>Nada para revisar.</Text>
          <Button title="Voltar" onPress={() => router.replace("/")} />
        </View>
      </SafeAreaView>
    );
  }

  // `key`: uma revisão nova recomeça o estado local.
  return <Revisao key={review.voiceLogId} review={review} />;
}

function voltar() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

/** Motivo do botão principal estar indisponível, ou `undefined` se pode salvar. */
function motivoBloqueio(lines: readonly ReviewLine[]): string | undefined {
  const pendente = firstPendingIndex(lines);
  if (pendente >= 0) return `RESOLVA O ITEM ${itemNumber(pendente)}`;
  return confirmBlockers(lines).length > 0 ? "NADA PARA SALVAR" : undefined;
}

function Revisao({ review }: { review: PendingReview }) {
  const { setReview } = useReview();
  const [lines, setLines] = useState<ReviewLine[]>(() => initLines(review));
  const [refeicao, setRefeicao] = useState<MealKind>(() => initialMeal(review, new Date()));
  const [salvando, setSalvando] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const bloqueio = motivoBloqueio(lines);
  const total = reviewTotal(lines);
  const algumSalvo = lines.some((l) => l.salvo);
  const ocupado = salvando || descartando;

  function atualizar(index: number, line: ReviewLine) {
    setLines((prev) => prev.map((l, i) => (i === index ? line : l)));
  }

  async function confirmar() {
    if (bloqueio) return;
    setErro(null);
    setSalvando(true);
    const ctx = {
      data: localIsoDate(new Date()),
      refeicao,
      origem: review.origem ?? "voz",
      voiceLogId: review.voiceLogId,
    };
    const next = [...lines];
    let falhou = false;
    // Em sequência: um item que falha não impede os outros; os já salvos não são reenviados.
    for (let i = 0; i < next.length; i++) {
      const line = next[i];
      if (!line || line.removido || line.salvo) continue;
      try {
        await createEntry(entryBody(line, ctx));
        next[i] = { ...line, salvo: true, erro: null };
      } catch (err) {
        next[i] = { ...line, erro: errorMessage(err) };
        falhou = true;
      }
      setLines([...next]);
    }
    setSalvando(false);
    if (falhou) {
      setErro("Alguns itens não foram salvos. Corrija e confirme de novo.");
      return;
    }
    setReview(null);
    router.replace("/");
  }

  async function descartar() {
    setErro(null);
    // Parte já virou lançamento: não descarta o registro, só sai da revisão.
    if (algumSalvo) {
      setReview(null);
      router.replace("/");
      return;
    }
    setDescartando(true);
    try {
      await discardVoiceLog(review.voiceLogId);
    } catch (err) {
      setErro(errorMessage(err));
      setDescartando(false);
      return;
    }
    setReview(null);
    voltar();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TopBar title="CONFERE?" onBack={voltar} />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.disse}>
            <Text style={styles.disseLabel}>VOCÊ DISSE</Text>
            <Text style={styles.disseText}>{`“${review.transcricao}”`}</Text>
          </View>

          <View style={styles.page}>
            <SegmentedRow
              label="Refeição"
              options={MEAL_CHOICES}
              value={refeicao}
              disabled={ocupado || algumSalvo}
              onChange={setRefeicao}
            />
          </View>

          {lines.length === 0 ? (
            <Text style={[styles.body, styles.page]}>
              Não entendi nenhum alimento. Descarte e tente de novo.
            </Text>
          ) : (
            <View style={styles.items}>
              {lines.map((line, i) => (
                <ReviewItemCard
                  // A ordem dos itens é fixa na resposta: o índice serve de chave.
                  // biome-ignore lint/suspicious/noArrayIndexKey: lista estática, não reordena
                  key={i}
                  line={line}
                  index={i}
                  locked={ocupado}
                  onChange={(l) => atualizar(i, l)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {`TOTAL · ${total.contados} DE ${total.itens} ${total.itens === 1 ? "ITEM" : "ITENS"}`}
            </Text>
            <Text style={styles.totalKcal}>{`${formatKcalMilhar(total.kcal)} KCAL`}</Text>
          </View>
          <ErrorMessage>{erro}</ErrorMessage>
          <View style={styles.actions}>
            <View style={algumSalvo ? styles.actionWide : styles.actionDiscard}>
              <Button
                title={algumSalvo ? "SAIR SEM SALVAR O RESTO" : "DESCARTAR"}
                variant="secondary"
                onPress={descartar}
                disabled={salvando}
                busy={descartando}
              />
            </View>
            <View style={styles.actionWide}>
              <Button
                title="SALVAR"
                onPress={confirmar}
                disabledReason={bloqueio}
                disabled={descartando}
                busy={salvando}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.paper },
  empty: { flex: 1, padding: theme.space.page, gap: 12, justifyContent: "center" },
  scroll: { gap: theme.space.block, paddingBottom: theme.space.block },
  page: { paddingHorizontal: theme.space.page },
  disse: {
    gap: 6,
    paddingHorizontal: theme.space.page,
    paddingVertical: theme.space.block,
    backgroundColor: c.ink,
  },
  disseLabel: { ...textStyles.label, color: c.accent },
  disseText: { fontFamily: theme.font.bold, fontSize: 20, lineHeight: 26, color: c.onInk },
  items: { borderTopWidth: theme.border.medium, borderColor: c.ink },
  body: { ...textStyles.body, color: c.ink },
  footer: {
    gap: 10,
    paddingHorizontal: theme.space.page,
    paddingTop: theme.space.row,
    paddingBottom: theme.space.row,
    borderTopWidth: theme.border.heavy,
    borderColor: c.ink,
    backgroundColor: c.paper,
  },
  totalRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  totalLabel: { ...textStyles.label, fontSize: 13, color: c.ink },
  totalKcal: { fontFamily: theme.font.monoBold, fontSize: 16, color: c.ink },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionDiscard: { width: 140 },
  actionWide: { flex: 1 },
});
