import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { StyleSheet } from "react-native";
import LoginScreen from "../src/app/login";
import { SESSION_STORAGE_KEY } from "../src/auth/session";
import { theme } from "../src/ui/theme";
import { AppProviders, AUTH, jsonResponse, mockFetch } from "./helpers";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));

async function preencher(email: string, senha: string) {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText("E-mail"), email);
  if (senha) await user.type(screen.getByLabelText("Senha"), senha);
  await user.press(screen.getByRole("button", { name: /entrar/i }));
}

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("campos vazios mostram erro de validação em pt-BR sem chamar a API", async () => {
    const fetchMock = mockFetch();
    await render(<LoginScreen />, { wrapper: AppProviders });

    await preencher("", "");

    expect(await screen.findByText("E-mail é obrigatório")).toBeOnTheScreen();
    expect(screen.getByText("Senha é obrigatória")).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("credenciais inválidas (401) mostram a mensagem da API", async () => {
    const fetchMock = mockFetch().mockResolvedValue(
      jsonResponse(401, { erro: "E-mail ou senha inválidos" }),
    );
    await render(<LoginScreen />, { wrapper: AppProviders });

    await preencher("teste@exemplo.com", "123");

    expect(await screen.findByText("E-mail ou senha inválidos")).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("servidor fora do ar mostra erro de conexão", async () => {
    mockFetch().mockRejectedValue(new TypeError("Network request failed"));
    await render(<LoginScreen />, { wrapper: AppProviders });

    await preencher("teste@exemplo.com", "senha-teste-123");

    expect(await screen.findByText(/Não foi possível falar com o servidor/)).toBeOnTheScreen();
  });

  it("login válido salva o token no SecureStore e navega para a tela inicial", async () => {
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(200, AUTH));
    await render(<LoginScreen />, { wrapper: AppProviders });

    await preencher("teste@exemplo.com", "senha-teste-123");

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      SESSION_STORAGE_KEY,
      JSON.stringify(AUTH),
    );
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/auth/login");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "teste@exemplo.com",
      senha: "senha-teste-123",
    });
  });

  it("visual D: título-cartaz, faixa ENTRAR (ink/accent) | CRIAR CONTA (paper)", async () => {
    mockFetch();
    await render(<LoginScreen />, { wrapper: AppProviders });

    const titulo = screen.getByRole("header", { name: "Fala que a gente conta." });
    expect(StyleSheet.flatten(titulo.props.style)).toMatchObject({
      fontSize: 64,
      lineHeight: 56,
      letterSpacing: -3,
      textTransform: "uppercase",
    });

    const entrar = StyleSheet.flatten(screen.getByRole("button", { name: /entrar/i }).props.style);
    expect(entrar.backgroundColor).toBe(theme.color.ink);
    expect(StyleSheet.flatten(screen.getByText("Entrar").props.style)).toMatchObject({
      color: theme.color.accent,
      textTransform: "uppercase",
    });
    const criar = StyleSheet.flatten(
      screen.getByRole("button", { name: /criar conta/i }).props.style,
    );
    expect(criar.backgroundColor).toBe(theme.color.paper);
  });

  it("CRIAR CONTA leva para /cadastro", async () => {
    mockFetch();
    await render(<LoginScreen />, { wrapper: AppProviders });

    await userEvent.setup().press(screen.getByRole("button", { name: /criar conta/i }));

    expect(router.push).toHaveBeenCalledWith("/cadastro");
  });
});
