import {
  createFakeTranscriber,
  createOpenAiTranscriber,
  fileNameFor,
  SttEmptyTranscriptError,
  SttHttpError,
} from "../src";

const audio = { bytes: new Uint8Array([1, 2, 3]), mimeType: "audio/m4a" };

function mockFetch(res: Response) {
  return jest.fn(async (_url: unknown, _init?: unknown) => res);
}

describe("createOpenAiTranscriber", () => {
  it("sucesso: monta a requisição e devolve o texto com trim", async () => {
    const f = mockFetch(new Response(JSON.stringify({ text: "  dois ovos  " })));
    const t = createOpenAiTranscriber({ apiKey: "sk-secret", fetch: f as unknown as typeof fetch });
    await expect(t.transcribe(audio)).resolves.toEqual({ text: "dois ovos" });
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-secret");
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("model")).toBe("whisper-1");
    expect(body.get("language")).toBe("pt");
    expect(body.get("response_format")).toBe("json");
    const file = body.get("file") as File;
    expect(file.name).toBe("audio.m4a");
    expect(file.size).toBe(3);
  });

  it("HTTP 401: SttHttpError com status e corpo, sem vazar a chave", async () => {
    const f = mockFetch(new Response("invalid key", { status: 401 }));
    const t = createOpenAiTranscriber({ apiKey: "sk-secret", fetch: f as unknown as typeof fetch });
    const err = await t.transcribe(audio).catch((e) => e);
    expect(err).toBeInstanceOf(SttHttpError);
    expect(err.status).toBe(401);
    expect(err.body).toBe("invalid key");
    expect(`${err.message}${err.body}`).not.toContain("sk-secret");
  });

  it("trunca corpo de erro grande", async () => {
    const f = mockFetch(new Response("x".repeat(5000), { status: 500 }));
    const t = createOpenAiTranscriber({ apiKey: "k", fetch: f as unknown as typeof fetch });
    const err = await t.transcribe(audio).catch((e) => e);
    expect(err.body.length).toBe(500);
  });

  it.each([{ text: "" }, { text: "   " }, {}])("resposta sem texto %j", async (payload) => {
    const f = mockFetch(new Response(JSON.stringify(payload)));
    const t = createOpenAiTranscriber({ apiKey: "k", fetch: f as unknown as typeof fetch });
    await expect(t.transcribe(audio)).rejects.toBeInstanceOf(SttEmptyTranscriptError);
  });
});

describe("fileNameFor", () => {
  it.each([
    ["audio/m4a", "audio.m4a"],
    ["audio/mp4", "audio.mp4"],
    ["audio/webm", "audio.webm"],
    ["audio/webm;codecs=opus", "audio.webm"],
    ["audio/wav", "audio.wav"],
    ["audio/xyz", "audio.bin"],
  ])("%s -> %s", (m, n) => expect(fileNameFor(m)).toBe(n));
});

describe("createFakeTranscriber", () => {
  it("devolve texto fixo", async () => {
    await expect(createFakeTranscriber("oi").transcribe(audio)).resolves.toEqual({ text: "oi" });
  });
});
