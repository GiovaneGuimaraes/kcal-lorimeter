import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { requestRecordingPermissionsAsync } from "expo-audio";
import { router } from "expo-router";
import HomeScreen from "../src/app/index";
import { MIC_DENIED_MESSAGE } from "../src/voice/use-voice-recorder";
import { AppProviders, AUTH, jsonResponse, mockFetch, REVIEW } from "./helpers";

jest.mock("expo-secure-store", () => ({
  // Sessão já salva: a tela inicial só existe para quem está logado.
  getItemAsync: jest.fn(async () => JSON.stringify(require("./helpers").AUTH)),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
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

async function renderHome() {
  await render(<HomeScreen />, { wrapper: AppProviders });
  // A sessão carrega do SecureStore no boot.
  expect(await screen.findByText(`Olá, ${AUTH.user.nome}`)).toBeOnTheScreen();
}

describe("HomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecorder.uri = "file:///cache/gravacao-teste.m4a";
  });

  it("permissão do microfone negada mostra orientação e não grava", async () => {
    permissao(false);
    const fetchMock = mockFetch();
    await renderHome();

    await userEvent.setup().press(screen.getByRole("button", { name: "Gravar" }));

    expect(await screen.findByText(MIC_DENIED_MESSAGE)).toBeOnTheScreen();
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(mockRecorder.record).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("negada sem poder perguntar de novo oferece abrir as configurações", async () => {
    permissao(false, false);
    mockFetch();
    await renderHome();

    await userEvent.setup().press(screen.getByRole("button", { name: "Gravar" }));

    expect(await screen.findByRole("button", { name: "Abrir configurações" })).toBeOnTheScreen();
  });

  it("gravar e parar envia o áudio em multipart para POST /voice e abre a revisão", async () => {
    permissao(true);
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(200, REVIEW));
    await renderHome();
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: "Gravar" }));
    await user.press(await screen.findByRole("button", { name: "Parar e enviar" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/revisao"));
    expect(mockRecorder.prepareToRecordAsync).toHaveBeenCalled();
    expect(mockRecorder.record).toHaveBeenCalled();
    expect(mockRecorder.stop).toHaveBeenCalled();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/voice");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${AUTH.token}`);
    // multipart: quem põe o Content-Type (com boundary) é o fetch.
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("erro da API ao enviar o áudio aparece na tela", async () => {
    permissao(true);
    mockFetch().mockResolvedValue(
      jsonResponse(422, { erro: "Não entendi o áudio. Tente de novo." }),
    );
    await renderHome();
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: "Gravar" }));
    await user.press(await screen.findByRole("button", { name: "Parar e enviar" }));

    expect(await screen.findByText("Não entendi o áudio. Tente de novo.")).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("para sozinho em 60 s e envia", async () => {
    permissao(true);
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(200, REVIEW));
    let agora = 1_000_000;
    const now = jest.spyOn(Date, "now").mockImplementation(() => agora);
    try {
      await renderHome();
      await userEvent.setup().press(screen.getByRole("button", { name: "Gravar" }));
      expect(await screen.findByText("0:00 / 1:00")).toBeOnTheScreen();

      agora += 60_000;
      await waitFor(() => expect(mockRecorder.stop).toHaveBeenCalled());
      await waitFor(() => expect(router.push).toHaveBeenCalledWith("/revisao"));
      expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:3000/voice");
    } finally {
      now.mockRestore();
    }
  });

  it("texto enviado vai para POST /voice/text e navega para /revisao", async () => {
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(200, REVIEW));
    await renderHome();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Ou digite"), "200 g de arroz");
    await user.press(screen.getByRole("button", { name: "Enviar texto" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/revisao"));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/voice/text");
    expect(JSON.parse(init.body as string)).toEqual({ texto: "200 g de arroz" });
  });

  it("texto vazio mostra erro de validação sem chamar a API", async () => {
    const fetchMock = mockFetch();
    await renderHome();

    await userEvent.setup().press(screen.getByRole("button", { name: "Enviar texto" }));

    expect(await screen.findByText("Texto é obrigatório")).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
