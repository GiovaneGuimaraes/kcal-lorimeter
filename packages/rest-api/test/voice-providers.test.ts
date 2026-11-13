import { createVoiceProviders } from "../src/voice-providers";

describe("createVoiceProviders", () => {
  it("sem chaves → nulls e avisa no log, sem lançar", () => {
    const avisos: string[] = [];
    const voice = createVoiceProviders({}, (m) => avisos.push(m));
    expect(voice).toEqual({ transcriber: null, extractor: null });
    expect(avisos).toEqual([
      expect.stringContaining("STT desativado (sem OPENAI_API_KEY)"),
      expect.stringContaining("Extração desativada (sem ANTHROPIC_API_KEY)"),
    ]);
  });

  it("com chaves (falsas) → monta os dois sem chamar a rede e sem avisos", () => {
    const avisos: string[] = [];
    const voice = createVoiceProviders(
      { openaiApiKey: "chave-falsa-1", anthropicApiKey: "chave-falsa-2" },
      (m) => avisos.push(m),
    );
    expect(typeof voice.transcriber?.transcribe).toBe("function");
    expect(typeof voice.extractor?.extract).toBe("function");
    expect(avisos).toEqual([]);
  });
});
