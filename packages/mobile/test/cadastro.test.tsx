import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import CadastroScreen from "../src/app/cadastro";
import { AppProviders, AUTH, jsonResponse, mockFetch } from "./helpers";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));

describe("CadastroScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("título-cartaz e faixa CRIAR CONTA | JÁ TENHO CONTA", async () => {
    mockFetch();
    await render(<CadastroScreen />, { wrapper: AppProviders });

    expect(screen.getByRole("header", { name: "Cria sua conta." })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /criar conta/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /já tenho conta/i })).toBeEnabled();
    expect(screen.getByPlaceholderText("Pelo menos 8 caracteres")).toBeOnTheScreen();
  });

  it("campos vazios mostram erro de validação sem chamar a API", async () => {
    const fetchMock = mockFetch();
    await render(<CadastroScreen />, { wrapper: AppProviders });

    await userEvent.setup().press(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByText("Nome é obrigatório")).toBeOnTheScreen();
    expect(screen.getByText("E-mail inválido")).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cadastro válido chama POST /auth/register e navega para a tela inicial", async () => {
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(201, AUTH));
    await render(<CadastroScreen />, { wrapper: AppProviders });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nome"), "Pessoa Teste");
    await user.type(screen.getByLabelText("E-mail"), "teste@exemplo.com");
    await user.type(screen.getByLabelText("Senha"), "senha-teste-123");
    await user.press(screen.getByRole("button", { name: /criar conta/i }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/auth/register");
    expect(init.method).toBe("POST");
  });

  it("JÁ TENHO CONTA volta para o login", async () => {
    mockFetch();
    await render(<CadastroScreen />, { wrapper: AppProviders });

    await userEvent.setup().press(screen.getByRole("button", { name: /já tenho conta/i }));

    expect(router.back).toHaveBeenCalled();
  });
});
