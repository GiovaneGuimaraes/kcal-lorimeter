import { type VoiceReview, VoiceTextBodySchema } from "@kcal/shared";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { errorMessage } from "../api/client";
import { sendVoiceAudio, sendVoiceText } from "../api/voice";
import { useSession } from "../auth/session";
import { Button, colors, ErrorMessage, Field } from "../ui/components";
import { useReview } from "../voice/review-store";
import {
  formatDuration,
  MAX_RECORDING_MS,
  MIC_DENIED_MESSAGE,
  useVoiceRecorder,
} from "../voice/use-voice-recorder";

export default function HomeScreen() {
  const { user, signOut } = useSession();
  const { setReview } = useReview();
  const [texto, setTexto] = useState("");
  const [erroTexto, setErroTexto] = useState<string | undefined>();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(chamada: () => Promise<VoiceReview>) {
    setErro(null);
    setEnviando(true);
    try {
      const review = await chamada();
      setReview(review);
      router.push("/revisao");
      return true;
    } catch (err) {
      setErro(errorMessage(err));
      return false;
    } finally {
      setEnviando(false);
    }
  }

  const gravador = useVoiceRecorder((uri) => {
    void enviar(() => sendVoiceAudio(uri));
  });
  const gravando = gravador.phase === "recording";
  const ocupado = enviando || gravador.phase === "starting" || gravador.phase === "stopping";

  async function enviarTexto() {
    const parsed = VoiceTextBodySchema.safeParse({ texto });
    if (!parsed.success) {
      setErroTexto(parsed.error.issues[0]?.message);
      return;
    }
    setErroTexto(undefined);
    if (await enviar(() => sendVoiceText(parsed.data.texto))) setTexto("");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {user ? `Olá, ${user.nome}` : "kcal-lorimeter"}
            </Text>
            <Button title="Sair" variant="secondary" disabled={ocupado} onPress={signOut} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>O que você comeu?</Text>
            <Text style={styles.hint}>Ex.: "duzentos gramas de arroz e um ovo"</Text>
            {gravando ? (
              <Text accessibilityLabel="Tempo de gravação" style={styles.timer}>
                {formatDuration(gravador.elapsedMs)} / {formatDuration(MAX_RECORDING_MS)}
              </Text>
            ) : null}
            {gravando ? (
              <Button title="Parar e enviar" variant="danger" onPress={gravador.stop} />
            ) : (
              <Button
                title="Gravar"
                onPress={gravador.start}
                disabled={enviando}
                busy={gravador.phase !== "idle"}
              />
            )}
            {gravador.permission === "denied" ? (
              <View style={styles.permission}>
                <Text style={styles.permissionText}>{MIC_DENIED_MESSAGE}</Text>
                {gravador.canAskAgain ? null : (
                  <Button
                    title="Abrir configurações"
                    variant="secondary"
                    onPress={() => void Linking.openSettings()}
                  />
                )}
              </View>
            ) : null}
            <ErrorMessage>{gravador.error}</ErrorMessage>
          </View>

          <View style={styles.card}>
            <Field
              label="Ou digite"
              value={texto}
              onChangeText={setTexto}
              error={erroTexto}
              placeholder="200 g de arroz e 1 ovo"
              multiline
              editable={!enviando}
            />
            <Button title="Enviar texto" onPress={enviarTexto} disabled={ocupado || gravando} />
          </View>

          {enviando ? (
            <View style={styles.sending}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.hint}>Enviando…</Text>
            </View>
          ) : null}
          <ErrorMessage>{erro}</ErrorMessage>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { flex: 1, fontSize: 24, fontWeight: "700", color: colors.text },
  card: { gap: 12, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  cardTitle: { fontSize: 18, fontWeight: "600", color: colors.text },
  hint: { fontSize: 14, color: colors.muted },
  timer: { fontSize: 32, fontWeight: "700", textAlign: "center", color: colors.danger },
  permission: { gap: 8 },
  permissionText: { fontSize: 15, color: colors.text },
  sending: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" },
});
