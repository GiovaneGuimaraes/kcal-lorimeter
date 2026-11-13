import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";

/** Duração máxima de uma gravação: ao chegar nela, para e envia sozinho. */
export const MAX_RECORDING_MS = 60_000;
const TICK_MS = 250;

/** Orientação quando a permissão do microfone é negada. */
export const MIC_DENIED_MESSAGE =
  "Sem acesso ao microfone. Para gravar, permita o uso do microfone para este app nas " +
  "configurações do aparelho. Enquanto isso, você pode digitar o que comeu abaixo.";

export type RecorderPhase = "idle" | "starting" | "recording" | "stopping";
export type MicPermission = "unknown" | "granted" | "denied";

/**
 * Gravação com `expo-audio` (preset HIGH_QUALITY → `.m4a`/AAC): pede permissão do microfone,
 * grava, conta o tempo e para sozinha em 60 s. Ao parar, entrega o `uri` do arquivo local para
 * `onRecorded` (quem envia é a tela).
 */
export function useVoiceRecorder(onRecorded: (uri: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [permission, setPermission] = useState<MicPermission>("unknown");
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startedAt = useRef<number | null>(null);
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;

  const stop = useCallback(async () => {
    if (startedAt.current === null) return;
    startedAt.current = null;
    setPhase("stopping");
    let uri: string | null = null;
    try {
      await recorder.stop();
      uri = recorder.uri;
    } catch {
      uri = null;
    }
    try {
      // iOS: com gravação ligada o som sai pelo alto-falante do ouvido; desliga ao terminar.
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      // Sem efeito para o envio.
    }
    setPhase("idle");
    if (uri) {
      onRecordedRef.current(uri);
    } else {
      setError("Não consegui gravar o áudio. Tente de novo ou digite o que comeu.");
    }
  }, [recorder]);

  const start = useCallback(async () => {
    if (startedAt.current !== null) return;
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setPermission("denied");
      setCanAskAgain(perm.canAskAgain);
      return;
    }
    setPermission("granted");
    setPhase("starting");
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setPhase("idle");
      setError("Não consegui começar a gravar. Tente de novo ou digite o que comeu.");
      return;
    }
    startedAt.current = Date.now();
    setElapsedMs(0);
    setPhase("recording");
  }, [recorder]);

  // Relógio da gravação + parada automática em 60 s.
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => {
      if (startedAt.current === null) return;
      const elapsed = Date.now() - startedAt.current;
      setElapsedMs(Math.min(elapsed, MAX_RECORDING_MS));
      if (elapsed >= MAX_RECORDING_MS) void stop();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, stop]);

  // Saiu da tela gravando: para sem enviar.
  useEffect(
    () => () => {
      if (startedAt.current === null) return;
      startedAt.current = null;
      recorder.stop().catch(() => {});
    },
    [recorder],
  );

  return { phase, elapsedMs, permission, canAskAgain, error, start, stop };
}

/** `m:ss` para o relógio da gravação. */
export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
