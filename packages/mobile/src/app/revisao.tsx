import type { MealKind } from "@kcal/shared";
import { MEAL_ORDER } from "@kcal/shared";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { errorMessage } from "../api/client";
import { createEntry, discardVoiceLog } from "../api/review-entries";
import { Button, colors, ErrorMessage } from "../ui/components";
import { Chip, ReviewItemCard } from "../voice/review-item";
import {
  confirmBlockers,
  entryBody,
  initialMeal,
  initLines,
  localIsoDate,
  MEAL_LABELS,
  type ReviewLine,
} from "../voice/review-lines";
import { type PendingReview, useReview } from "../voice/review-store";

/**
 * Revisão do lançamento por voz/texto: nada é salvo sem a pessoa confirmar. Cada item pode trocar
 * de alimento (candidato, busca ou cadastro), mudar quantidade/unidade ou sair da lista.
 * Confirmar cria um `POST /entries` por item; os macros são calculados pelo servidor.
 */
export default function RevisaoScreen() {
  const { review } = useReview();

  if (!review) {
    return (
      <View style={styles.empty}>
        <Text style={styles.text}>Nada para revisar.</Text>
        <Button title="Voltar" onPress={() => router.replace("/")} />
      </View>
    );
  }

  // `key`: uma revisão nova recomeça o estado local.
  return <Revisao key={review.voiceLogId} review={review} />;
}

function voltar() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

function Revisao({ review }: { review: PendingReview }) {
  const { setReview } = useReview();
  const [lines, setLines] = useState<ReviewLine[]>(() => initLines(review));
  const [refeicao, setRefeicao] = useState<MealKind>(() => initialMeal(review, new Date()));
  const [salvando, setSalvando] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const bloqueios = confirmBlockers(lines);
  const algumSalvo = lines.some((l) => l.salvo);
  const ocupado = salvando || descartando;

  function atualizar(index: number, line: ReviewLine) {
    setLines((prev) => prev.map((l, i) => (i === index ? line : l)));
  }

  async function confirmar() {
    if (bloqueios.length > 0) return;
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
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.transcricao}>
          <Text style={styles.label}>Você disse</Text>
          <Text style={styles.text}>{review.transcricao}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Refeição</Text>
          <View style={styles.row}>
            {MEAL_ORDER.map((m) => (
              <Chip
                key={m}
                label={MEAL_LABELS[m]}
                selected={refeicao === m}
                disabled={ocupado || algumSalvo}
                onPress={() => setRefeicao(m)}
              />
            ))}
          </View>
        </View>

        {lines.length === 0 ? (
          <Text style={styles.text}>Não entendi nenhum alimento. Descarte e tente de novo.</Text>
        ) : (
          lines.map((line, i) => (
            <ReviewItemCard
              // A ordem dos itens é fixa na resposta: o índice serve de chave.
              // biome-ignore lint/suspicious/noArrayIndexKey: lista estática, não reordena
              key={i}
              line={line}
              index={i}
              locked={ocupado}
              onChange={(l) => atualizar(i, l)}
            />
          ))
        )}

        {bloqueios.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.label}>Antes de confirmar</Text>
            {bloqueios.map((b) => (
              <Text key={b} style={styles.blocker}>
                {b}
              </Text>
            ))}
          </View>
        ) : null}
        <ErrorMessage>{erro}</ErrorMessage>

        <Button
          title="Confirmar"
          onPress={confirmar}
          disabled={bloqueios.length > 0 || descartando}
          busy={salvando}
        />
        <Button
          title={algumSalvo ? "Sair sem salvar o resto" : "Descartar"}
          variant="secondary"
          onPress={descartar}
          disabled={salvando}
          busy={descartando}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, gap: 16, backgroundColor: colors.background },
  empty: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  transcricao: { gap: 4 },
  section: { gap: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: colors.muted },
  text: { fontSize: 16, color: colors.text },
  blocker: { fontSize: 15, color: colors.danger },
});
