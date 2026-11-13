import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import LancamentoScreen from "../src/app/lancamento";
import { callsTo, entry, FOOD } from "./day-fixtures";
import { jsonResponse, mockFetch } from "./helpers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({ data: "2026-11-10" }),
}));

const WHEY = {
  ...FOOD,
  id: "f9",
  nome: "whey protein",
  apelidos: [],
  porcaoPadraoG: 30,
  nomePorcao: "scoop",
};

function apiFake(fetchMock: jest.Mock) {
  return fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.includes("/foods?")) return jsonResponse(200, { foods: [FOOD, WHEY] });
    if (init.method === "POST") return jsonResponse(201, entry({ id: "novo", origem: "manual" }));
    return jsonResponse(404, { erro: "não esperado" });
  });
}

describe("LancamentoScreen (lançamento manual)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("busca, escolhe, informa quantidade e refeição → POST /entries com origem manual", async () => {
    const fetchMock = apiFake(mockFetch());
    await render(<LancamentoScreen />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Buscar alimento"), "arroz");
    await user.press(screen.getByRole("button", { name: "Buscar" }));
    expect(callsTo(fetchMock, "GET", "/foods?q=arroz")).toHaveLength(1);

    await user.press(await screen.findByText("arroz branco cozido"));
    await user.type(screen.getByLabelText("Quantidade"), "150");
    await user.press(screen.getByRole("radio", { name: "Almoço" }));
    await user.press(screen.getByRole("button", { name: "Lançar" }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    const [init] = callsTo(fetchMock, "POST", "/entries");
    expect(JSON.parse(init?.body as string)).toEqual({
      data: "2026-11-10",
      refeicao: "almoco",
      foodId: "f1",
      quantidade: 150,
      unidade: "g",
      origem: "manual",
    });
  });

  it("alimento com porção padrão permite lançar em porções", async () => {
    const fetchMock = apiFake(mockFetch());
    await render(<LancamentoScreen />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Buscar alimento"), "whey");
    await user.press(screen.getByRole("button", { name: "Buscar" }));
    await user.press(await screen.findByText("whey protein"));
    await user.type(screen.getByLabelText("Quantidade"), "1");
    await user.press(screen.getByRole("radio", { name: "scoop (30 g)" }));
    await user.press(screen.getByRole("radio", { name: "Lanche" }));
    await user.press(screen.getByRole("button", { name: "Lançar" }));

    await waitFor(() => expect(callsTo(fetchMock, "POST", "/entries")).toHaveLength(1));
    const [init] = callsTo(fetchMock, "POST", "/entries");
    expect(JSON.parse(init?.body as string)).toMatchObject({
      foodId: "f9",
      quantidade: 1,
      unidade: "unidade",
      refeicao: "lanche",
      origem: "manual",
    });
  });

  it("quantidade vazia mostra erro e não chama POST", async () => {
    const fetchMock = apiFake(mockFetch());
    await render(<LancamentoScreen />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Buscar alimento"), "arroz");
    await user.press(screen.getByRole("button", { name: "Buscar" }));
    await user.press(await screen.findByText("arroz branco cozido"));
    await user.press(screen.getByRole("button", { name: "Lançar" }));

    expect(await screen.findByText("Quantidade deve ser um número")).toBeOnTheScreen();
    expect(callsTo(fetchMock, "POST", "/entries")).toHaveLength(0);
  });
});
