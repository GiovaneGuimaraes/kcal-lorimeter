import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { apiRequest } from "../src/api/client";
import { useSession } from "../src/auth/session";
import { useReview } from "../src/voice/review-store";
import { AppProviders, AUTH, jsonResponse, mockFetch, REVIEW } from "./helpers";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
}));

const getItem = SecureStore.getItemAsync as jest.Mock;

async function renderLogado() {
  getItem.mockResolvedValue(JSON.stringify(AUTH));
  const hook = await renderHook(() => ({ session: useSession(), review: useReview() }), {
    wrapper: AppProviders,
  });
  await waitFor(() => expect(hook.result.current.session.status).toBe("signedIn"));
  await act(async () => hook.result.current.review.setReview(REVIEW));
  expect(hook.result.current.review.review).toEqual(REVIEW);
  return hook;
}

describe("ReviewProvider x sessão", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sair zera a revisão pendente (a transcrição não vaza para a próxima conta)", async () => {
    const { result } = await renderLogado();

    await act(() => result.current.session.signOut());

    await waitFor(() => expect(result.current.review.review).toBeNull());
  });

  it("401 numa chamada autenticada zera a revisão", async () => {
    const { result } = await renderLogado();

    mockFetch().mockResolvedValue(jsonResponse(401, { erro: "Sessão expirada" }));
    await act(() => apiRequest("/me").catch(() => undefined));

    await waitFor(() => expect(result.current.session.status).toBe("signedOut"));
    expect(result.current.review.review).toBeNull();
  });
});
