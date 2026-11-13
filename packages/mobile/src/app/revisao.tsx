import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, colors } from "../ui/components";
import { useReview } from "../voice/review-store";

/**
 * Placeholder da revisão (T-012): só mostra a transcrição e os itens entendidos.
 * A tela de revisão de verdade (escolher candidato, peso, confirmar) é a T-013.
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Você disse</Text>
      <Text style={styles.text}>{review.transcricao}</Text>
      <Text style={styles.label}>Itens</Text>
      {review.itens.length === 0 ? (
        <Text style={styles.text}>Nenhum alimento encontrado.</Text>
      ) : (
        review.itens.map((item, i) => (
          // A ordem dos itens é fixa na resposta: o índice serve de chave.
          // biome-ignore lint/suspicious/noArrayIndexKey: lista estática, não reordena
          <Text key={i} style={styles.text}>
            {`${item.extraido.alimento} — ${item.extraido.quantidade} ${item.extraido.unidade}`}
          </Text>
        ))
      )}
      <Button title="Voltar" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12, backgroundColor: colors.background },
  empty: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  label: { fontSize: 14, fontWeight: "600", color: colors.muted },
  text: { fontSize: 16, color: colors.text },
});
