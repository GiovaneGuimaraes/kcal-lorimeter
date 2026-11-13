import { type VoiceReview, VoiceTextBodySchema } from "@kcal/shared";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { errorMessage } from "../api/client";
import { sendVoiceAudio, sendVoiceText } from "../api/voice";
import { useSession } from "../auth/session";
import { DayPanel } from "../day/day-panel";
import { Button, ErrorMessage, Field } from "../ui/components";
import { initials } from "../ui/format";
import { Logo } from "../ui/logo";
import { textStyles, theme } from "../ui/theme";
import { useReview } from "../voice/review-store";
import {
  formatDuration,
  MAX_RECORDING_MS,
  MIC_DENIED_MESSAGE,
  useVoiceRecorder,
} from "../voice/use-voice-recorder";

const c = theme.color;

/**
 * Tela principal (visual D § 2.4.3): cabeçalho com a conta, painel do dia e, fixa embaixo, a barra
 * "TOQUE E FALE" (tocar para começar, tocar de novo para parar e enviar) com o lápis para digitar.
 */
export default function HomeScreen() {
  const { user, signOut } = useSession();
  const { setReview } = useReview();
  const [texto, setTexto] = useState("");
  const [erroTexto, setErroTexto] = useState<string | undefined>();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [digitando, setDigitando] = useState(false);

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
    if (await enviar(() => sendVoiceText(parsed.data.texto))) {
      setTexto("");
      setDigitando(false);
    }
  }

  function abrirConta() {
    // "Sair" zera a sessão; o `ReviewProvider` descarta a revisão pendente ao virar `signedOut` (F-2).
    Alert.alert(user?.nome ?? "Conta", user?.email, [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  const nome = user?.nome ?? "";
  const permissaoNegada = gravador.permission === "denied";
  const temAviso = permissaoNegada || !!gravador.error || !!erro;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Logo size={32} />
        <Text style={styles.brand} numberOfLines={1}>
          kcal-lorimeter
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Conta de ${nome}`}
          accessibilityHint="Abre o menu da conta, com a opção de sair"
          accessibilityState={{ disabled: ocupado }}
          disabled={ocupado}
          onPress={abrirConta}
          style={({ pressed }) => [styles.account, pressed && styles.accountPressed]}
        >
          <Text style={styles.accountText}>{initials(nome)}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled">
          <DayPanel />
        </ScrollView>

        {temAviso ? (
          <View style={styles.notice}>
            {permissaoNegada ? (
              <>
                <Text style={styles.noticeText}>{MIC_DENIED_MESSAGE}</Text>
                {gravador.canAskAgain ? null : (
                  <Button
                    title="Abrir configurações"
                    variant="secondary"
                    onPress={() => void Linking.openSettings()}
                  />
                )}
              </>
            ) : null}
            <ErrorMessage>{gravador.error}</ErrorMessage>
            <ErrorMessage>{erro}</ErrorMessage>
          </View>
        ) : null}

        {digitando ? (
          <View style={styles.typing}>
            <Field
              label="O que você comeu?"
              value={texto}
              onChangeText={setTexto}
              error={erroTexto}
              placeholder="200 g de arroz e 1 ovo"
              multiline
              editable={!enviando}
              style={styles.typingInput}
            />
            <Button
              title="Enviar"
              onPress={enviarTexto}
              busy={enviando}
              disabled={ocupado || gravando}
            />
          </View>
        ) : null}

        <View style={styles.bar}>
          <VoiceButton
            gravando={gravando}
            enviando={enviando}
            busy={gravador.phase === "starting" || gravador.phase === "stopping"}
            elapsedMs={gravador.elapsedMs}
            onPress={gravando ? gravador.stop : gravador.start}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={digitando ? "Fechar digitação" : "Digitar o que comeu"}
            accessibilityState={{ expanded: digitando, disabled: gravando }}
            disabled={gravando}
            onPress={() => setDigitando((d) => !d)}
            style={({ pressed }) => [styles.pencil, (pressed || digitando) && styles.pencilActive]}
          >
            <PencilIcon color={gravando ? c.hairline : c.ink} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

/**
 * Botão grande da barra: "TOQUE E FALE" (preto, texto amarelo). Gravando vira `danger` com o
 * relógio "0:12 / 1:00" e "TOQUE PARA ENVIAR". Tocar de novo para e envia (H-012: tocar e tocar).
 */
function VoiceButton(props: {
  gravando: boolean;
  enviando: boolean;
  busy: boolean;
  elapsedMs: number;
  onPress(): void;
}) {
  const { gravando, enviando, busy } = props;
  const off = !gravando && (enviando || busy);
  const rotulo = gravando ? "Toque para enviar" : enviando ? "Enviando…" : "Toque e fale";
  const cor = gravando ? c.onInk : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ disabled: off, busy: enviando || busy }}
      disabled={off}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.voice,
        gravando && styles.voiceRecording,
        pressed && !off && styles.voicePressed,
      ]}
    >
      {off ? <ActivityIndicator color={c.accent} /> : <MicIcon color={cor} />}
      <View style={styles.voiceTexts}>
        {gravando ? (
          <Text accessibilityLabel="Tempo de gravação" style={[styles.voiceTimer, { color: cor }]}>
            {`${formatDuration(props.elapsedMs)} / ${formatDuration(MAX_RECORDING_MS)}`}
          </Text>
        ) : null}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={[styles.voiceText, { color: cor }]}
        >
          {rotulo}
        </Text>
      </View>
    </Pressable>
  );
}

function MicIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Rect x={8} y={2} width={8} height={13} rx={4} fill={color} />
      <Path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" stroke={color} strokeWidth={2.4} fill="none" />
    </Svg>
  );
}

function PencilIcon({ color }: { color: string }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path d="M4 20l1-5L16 4l4 4L9 19z" stroke={color} strokeWidth={2.4} fill="none" />
      <Path d="M13.5 6.5l4 4" stroke={color} strokeWidth={2.4} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.paper },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: theme.space.page,
    paddingVertical: 10,
    borderBottomWidth: theme.border.heavy,
    borderColor: c.ink,
  },
  brand: { ...textStyles.screenTitle, fontSize: 18, lineHeight: 22, flex: 1, color: c.ink },
  account: {
    width: theme.touch,
    height: theme.touch,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: theme.border.heavy,
    borderColor: c.ink,
    backgroundColor: c.paper,
  },
  accountPressed: { backgroundColor: c.accent },
  accountText: { fontFamily: theme.font.display, fontSize: 16, color: c.ink },
  notice: {
    gap: 8,
    paddingHorizontal: theme.space.page,
    paddingVertical: theme.space.row,
    borderTopWidth: theme.border.heavy,
    borderColor: c.ink,
    backgroundColor: c.paper,
  },
  noticeText: { ...textStyles.body, color: c.ink },
  typing: {
    gap: 12,
    paddingHorizontal: theme.space.page,
    paddingVertical: theme.space.row,
    borderTopWidth: theme.border.heavy,
    borderColor: c.ink,
    backgroundColor: c.paper,
  },
  typingInput: { height: 84, paddingTop: 10, textAlignVertical: "top" },
  bar: {
    flexDirection: "row",
    height: 84,
    borderTopWidth: theme.border.heavy,
    borderColor: c.ink,
    backgroundColor: c.paper,
  },
  voice: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    backgroundColor: c.ink,
  },
  voiceRecording: { backgroundColor: c.danger },
  voicePressed: { opacity: 0.85 },
  voiceTexts: { flexShrink: 1, alignItems: "flex-start" },
  voiceTimer: { fontFamily: theme.font.monoBold, fontSize: 15 },
  voiceText: { ...textStyles.buttonPrimary, fontSize: 22 },
  pencil: {
    width: 84,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: theme.border.heavy,
    borderColor: c.ink,
    backgroundColor: c.paper,
  },
  pencilActive: { backgroundColor: c.accent },
});
