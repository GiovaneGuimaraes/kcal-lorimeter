import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { ApiError, apiRequest } from "../src/api/client";
import { SESSION_STORAGE_KEY, SessionProvider, useSession } from "../src/auth/session";
import { AUTH, jsonResponse, mockFetch } from "./helpers";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

const getItem = SecureStore.getItemAsync as jest.Mock;

describe("SessionProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it("carrega a sessão salva no boot", async () => {
    getItem.mockResolvedValue(JSON.stringify(AUTH));
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });

    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    expect(result.current.user).toEqual(AUTH.user);
    expect(result.current.token).toBe(AUTH.token);
  });

  it("401 numa requisição autenticada encerra a sessão e apaga o token salvo", async () => {
    getItem.mockResolvedValue(JSON.stringify(AUTH));
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => expect(result.current.status).toBe("signedIn"));

    mockFetch().mockResolvedValue(jsonResponse(401, { erro: "Sessão expirada" }));
    await act(() =>
      expect(apiRequest("/me")).rejects.toEqual(new ApiError(401, "Sessão expirada")),
    );

    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
  });

  it("falha ao gravar no SecureStore não derruba o login nem o cadastro (F-1)", async () => {
    getItem.mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error("sem keychain"));
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(200, AUTH));
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => expect(result.current.status).toBe("signedOut"));

    await act(() => result.current.signIn({ email: "teste@exemplo.com", senha: "senha-de-teste" }));
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
    expect(result.current.token).toBe(AUTH.token);

    await act(() => result.current.signOut());
    fetchMock.mockResolvedValue(jsonResponse(201, AUTH));
    await act(() =>
      result.current.signUp({
        nome: "Pessoa Teste",
        email: "teste@exemplo.com",
        senha: "senha-de-teste",
      }),
    );
    await waitFor(() => expect(result.current.status).toBe("signedIn"));
  });

  it("signOut limpa a sessão", async () => {
    getItem.mockResolvedValue(JSON.stringify(AUTH));
    const { result } = await renderHook(() => useSession(), { wrapper: SessionProvider });
    await waitFor(() => expect(result.current.status).toBe("signedIn"));

    await act(() => result.current.signOut());

    await waitFor(() => expect(result.current.status).toBe("signedOut"));
    expect(result.current.token).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
  });
});
