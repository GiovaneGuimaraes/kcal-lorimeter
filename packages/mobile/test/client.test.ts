import { AuthResponseSchema } from "@kcal/shared";
import { ApiError, apiRequest, setAuthToken } from "../src/api/client";
import { AUTH, jsonResponse, mockFetch } from "./helpers";

describe("apiRequest", () => {
  afterEach(() => setAuthToken(null));

  it("manda Authorization: Bearer quando há token", async () => {
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(200, AUTH.user));
    setAuthToken("abc");

    await apiRequest("/me");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/me");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc");
  });

  it("sem token não manda Authorization", async () => {
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(200, AUTH.user));

    await apiRequest("/me");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("erro com { erro } vira ApiError com a mensagem do servidor", async () => {
    mockFetch().mockResolvedValue(jsonResponse(409, { erro: "E-mail já cadastrado" }));

    await expect(apiRequest("/auth/register", { json: {} })).rejects.toEqual(
      new ApiError(409, "E-mail já cadastrado"),
    );
  });

  it("erro sem corpo legível vira mensagem genérica com o status", async () => {
    mockFetch().mockResolvedValue(jsonResponse(500));

    const err = await apiRequest("/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
    expect((err as ApiError).erro).toBe("Erro no servidor (500). Tente de novo.");
  });

  it("resposta fora do contrato vira ApiError (não é confiada)", async () => {
    mockFetch().mockResolvedValue(jsonResponse(200, { token: "" }));

    await expect(
      apiRequest("/auth/login", { json: {}, schema: AuthResponseSchema }),
    ).rejects.toEqual(new ApiError(200, "Resposta inesperada do servidor. Tente de novo."));
  });

  it("falha de rede vira ApiError status 0", async () => {
    mockFetch().mockRejectedValue(new TypeError("Network request failed"));

    const err = await apiRequest("/x").catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(0);
  });
});
