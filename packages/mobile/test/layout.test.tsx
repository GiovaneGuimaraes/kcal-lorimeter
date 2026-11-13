import { userEvent } from "@testing-library/react-native";
import { renderRouter, screen } from "expo-router/testing-library";
import * as SecureStore from "expo-secure-store";
import { Text } from "react-native";
import RootLayout from "../src/app/_layout";
import LoginScreen from "../src/app/login";
import { SESSION_STORAGE_KEY } from "../src/auth/session";
import { AUTH, jsonResponse, mockFetch } from "./helpers";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

const getItem = SecureStore.getItemAsync as jest.Mock;

/** Rotas reais do `_layout`, com telas-dublê (o gate é o que está em teste). */
const rotas = {
  _layout: RootLayout,
  index: () => <Text>tela inicial</Text>,
  login: () => <Text>tela de login</Text>,
  cadastro: () => <Text>tela de cadastro</Text>,
  revisao: () => <Text>tela de revisão</Text>,
  meta: () => <Text>tela de meta</Text>,
  lancamento: () => <Text>tela de lançamento</Text>,
};

describe("RootLayout (gate de autenticação)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sem sessão salva, abrir o app leva para /login", async () => {
    getItem.mockResolvedValue(null);
    const router = await renderRouter(rotas, { initialUrl: "/" });

    expect(await screen.findByText("tela de login")).toBeOnTheScreen();
    expect(router.getPathname()).toBe("/login");
    expect(getItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
  });

  it("sem sessão, /revisao também cai no /login", async () => {
    getItem.mockResolvedValue(null);
    const router = await renderRouter(rotas, { initialUrl: "/revisao" });

    expect(await screen.findByText("tela de login")).toBeOnTheScreen();
    expect(router.getPathname()).toBe("/login");
  });

  it.each(["/meta", "/lancamento"])("sem sessão, %s também cai no /login", async (url) => {
    getItem.mockResolvedValue(null);
    const router = await renderRouter(rotas, { initialUrl: url });

    expect(await screen.findByText("tela de login")).toBeOnTheScreen();
    expect(router.getPathname()).toBe("/login");
  });

  it("com sessão salva, abre a tela inicial", async () => {
    getItem.mockResolvedValue(JSON.stringify(AUTH));
    const router = await renderRouter(rotas, { initialUrl: "/" });

    expect(await screen.findByText("tela inicial")).toBeOnTheScreen();
    expect(router.getPathname()).toBe("/");
  });

  it("login de verdade (fetch mockado) troca para a tela inicial", async () => {
    getItem.mockResolvedValue(null);
    mockFetch().mockResolvedValue(jsonResponse(200, AUTH));
    const router = await renderRouter({ ...rotas, login: LoginScreen }, { initialUrl: "/" });
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("E-mail"), "teste@exemplo.com");
    await user.type(screen.getByLabelText("Senha"), "senha-teste-123");
    await user.press(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("tela inicial")).toBeOnTheScreen();
    expect(router.getPathname()).toBe("/");
  });

  it("sessão salva corrompida é tratada como sem sessão", async () => {
    getItem.mockResolvedValue("{nao-e-json");
    const router = await renderRouter(rotas, { initialUrl: "/" });

    expect(await screen.findByText("tela de login")).toBeOnTheScreen();
    expect(router.getPathname()).toBe("/login");
  });
});
