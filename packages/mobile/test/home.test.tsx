import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { requestRecordingPermissionsAsync } from "expo-audio";
import { router } from "expo-router";
import { deleteItemAsync } from "expo-secure-store";
import type { ReactNode } from "react";
import { Alert, type AlertButton, Text } from "react-native";
import HomeScreen from "../src/app/index";
import { SessionProvider } from "../src/auth/session";
import { todayLocal } from "../src/day/dates";
import { ReviewProvider, useReview } from "../src/voice/review-store";
import { MIC_DENIED_MESSAGE } from "../src/voice/use-voice-recorder";
import { callsTo, dayFetch } from "./day-fixtures";
import { AppProviders, AUTH, jsonResponse, mockFetch, REVIEW } from "./helpers";

jest.mock("expo-secure-store", () => ({
  // Sessão já salva: a tela inicial só existe para quem está logado.
  getItemAsync: jest.fn(async () => JSON.stringify(require("./helpers").AUTH)),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
  useFocusEffect: (cb: () => void) => require("react").useEffect(() => cb(), [cb]),
}));

const mockRecorder = {
  prepareToRecordAsync: jest.fn(async () => {}),
  record: jest.fn(),
  stop: jest.fn(async () => {}),
  uri: "file:///cache/gravacao-teste.m4a" as string | null,
};
jest.mock("expo-audio", () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  useAudioRecorder: () => mockRecorder,
  requestRecordingPermissionsAsync: jest.fn(),
  setAudioModeAsync: jest.fn(async () => {}),
}));

const requestPermission = requestRecordingPermissionsAsync as jest.Mock;

function permissao(granted: boolean, canAskAgain = true) {
  requestPermission.mockResolvedValue({
    granted,
    canAskAgain,
    status: granted ? "granted" : "denied",
    expires: "never",
  });
}

/** `fetch` com o painel (GET /days) respondendo e `resposta` para o resto (POST /voice...). */
function voiceFetch(resposta: Response): jest.Mock {
  return dayFetch(mockFetch(), { outras: () => resposta });
}

async function renderHome() {
  await render(<HomeScreen />, { wrapper: AppProviders });
  // A sessão carrega do SecureStore no boot.
  expect(
    await screen.findByRole("button", { name: `Conta de ${AUTH.user.nome}` }),
  ).toBeOnTheScreen();
}

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecorder.uri = "file:///cache/gravacao-teste.m4a";
  });

  it("permissão do microfone negada mostra orientação e não grava", async () => {
    permissao(false);
    const fetchMock = dayFetch(mockFetch());
    await renderHome();

    await userEvent.setup().press(screen.getByRole("button", { name: "Toque e fale" }));

    expect(await screen.findByText(MIC_DENIED_MESSAGE)).toBeOnTheScreen();
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(mockRecorder.record).not.toHaveBeenCalled();
    expect(callsTo(fetchMock, "POST", "/voice")).toHaveLength(0);
  });

  it("negada sem poder perguntar de novo oferece abrir as configurações", async () => {
    permissao(false, false);
    dayFetch(mockFetch());
    await renderHome();

    await userEvent.setup().press(screen.getByRole("button", { name: "Toque e fale" }));

    expect(await screen.findByRole("button", { name: "Abrir configurações" })).toBeOnTheScreen();
  });

  it("gravar e parar envia o áudio em multipart para POST /voice e abre a revisão", async () => {
    permissao(true);
    const fetchMock = voiceFetch(jsonResponse(200, REVIEW));
    await renderHome();
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: "Toque e fale" }));
    await user.press(await screen.findByRole("button", { name: "Toque para enviar" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/revisao"));
    expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalled();
    expect(mockRecorder.record).toHaveBeenCalled();
    expect(mockRecorder.stop).toHaveBeenCalled();

    const [init] = callsTo(fetchMock, "POST", "/voice");
    if (!init) throw new Error("POST /voice não foi chamado");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${AUTH.token}`);
    // multipart: quem põe o Content-Type (com boundary) é o fetch.
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("erro da API ao enviar o áudio aparece na tela", async () => {
    permissao(true);
    voiceFetch(jsonResponse(422, { erro: "Não entendi o áudio. Tente de novo." }));
    await renderHome();
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: "Toque e fale" }));
    await user.press(await screen.findByRole("button", { name: "Toque para enviar" }));

    expect(await screen.findByText("Não entendi o áudio. Tente de novo.")).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("para sozinho em 60 s e envia", async () => {
    permissao(true);
    const fetchMock = voiceFetch(jsonResponse(200, REVIEW));
    let agora = 1_000_000;
    const now = jest.spyOn(Date, "now").mockImplementation(() => agora);
    try {
      await renderHome();
      await userEvent.setup().press(screen.getByRole("button", { name: "Toque e fale" }));
      expect(await screen.findByText("0:00 / 1:00")).toBeOnTheScreen();

      agora += 60_000;
      await waitFor(() => expect(mockRecorder.stop).toHaveBeenCalled());
      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/revisao"));
      expect(callsTo(fetchMock, "POST", "/voice")).toHaveLength(1);
    } finally {
      now.mockRestore();
    }
  });

  it("texto enviado vai para POST /voice/text e navega para /revisao", async () => {
    const fetchMock = voiceFetch(jsonResponse(200, REVIEW));
    await renderHome();
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: "Digitar o que comeu" }));
    await user.type(screen.getByLabelText("O que você comeu?"), "200 g de arroz");
    await user.press(screen.getByRole("button", { name: "Enviar" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/revisao"));
    const [init] = callsTo(fetchMock, "POST", "/voice/text");
    expect(JSON.parse(init?.body as string)).toEqual({ texto: "200 g de arroz" });
  });

  it("acima da barra de voz mostra o painel de hoje (GET /days/<hoje>)", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderHome();

    // consumido 1234,6 de 2000: ainda cabem 765.
    expect(await screen.findByText("765")).toBeOnTheScreen();
    expect(screen.getByText("AINDA CABEM")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Toque e fale" })).toBeOnTheScreen();
    expect(callsTo(fetchMock, "GET", `/days/${todayLocal()}`)).toHaveLength(1);
  });

  it("texto vazio mostra erro de validação sem chamar a API", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderHome();

    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Digitar o que comeu" }));
    await user.press(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("Texto é obrigatório")).toBeOnTheScreen();
    expect(callsTo(fetchMock, "POST", "/voice/text")).toHaveLength(0);
  });

  it("cabeçalho mostra as iniciais; 'Sair' no menu da conta encerra a sessão e zera a revisão (F-2)", async () => {
    dayFetch(mockFetch());
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await render(<HomeScreen />, { wrapper: ComRevisao });
    const conta = await screen.findByRole("button", { name: `Conta de ${AUTH.user.nome}` });
    expect(screen.getByText("PT")).toBeOnTheScreen();
    expect(screen.getByText("com revisão")).toBeOnTheScreen();

    await userEvent.setup().press(conta);
    expect(alert).toHaveBeenCalledTimes(1);
    const botoes = (alert.mock.calls[0]?.[2] ?? []) as AlertButton[];
    expect(botoes.map((b) => b.text)).toEqual(["Cancelar", "Sair"]);

    await act(async () => {
      botoes.find((b) => b.text === "Sair")?.onPress?.();
    });

    expect(deleteItemAsync).toHaveBeenCalled();
    expect(await screen.findByText("sem revisão")).toBeOnTheScreen();
    alert.mockRestore();
  });

  it("'Cancelar' no menu da conta não sai", async () => {
    dayFetch(mockFetch());
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await renderHome();

    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: `Conta de ${AUTH.user.nome}` }));
    const botoes = (alert.mock.calls[0]?.[2] ?? []) as AlertButton[];
    expect(botoes.find((b) => b.text === "Cancelar")?.onPress).toBeUndefined();
    expect(deleteItemAsync).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it("gravando, o botão vira 'Toque para enviar' com o relógio e o lápis fica indisponível", async () => {
    permissao(true);
    voiceFetch(jsonResponse(200, REVIEW));
    await renderHome();

    await userEvent.setup().press(screen.getByRole("button", { name: "Toque e fale" }));

    expect(await screen.findByRole("button", { name: "Toque para enviar" })).toBeOnTheScreen();
    expect(screen.getByText("0:00 / 1:00")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Digitar o que comeu" })).toBeDisabled();
  });
});

/** Revisão pendente no contexto + um leitor, para ver o `ReviewProvider` zerar ao sair. */
function ComRevisao({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ReviewProvider initialReview={REVIEW}>
        {children}
        <EstadoRevisao />
      </ReviewProvider>
    </SessionProvider>
  );
}

function EstadoRevisao() {
  const { review } = useReview();
  return <Text>{review ? "com revisão" : "sem revisão"}</Text>;
}
