import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import LancamentoScreen from "../src/app/lancamento";
import { mealForHour } from "../src/day/dates";
import { MEAL_LABELS } from "../src/ui/format";
import { callsTo, entry, FOOD } from "./day-fixtures";
import { jsonResponse, mockFetch } from "./helpers";

const mockParams = jest.fn((): Record<string, string> => ({ data: "2026-11-10" }));

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams(),
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
    await user.press(screen.getByRole("button", { name: /^buscar$/i }));
    expect(callsTo(fetchMock, "GET", "/foods?q=arroz")).toHaveLength(1);

    await user.press(await screen.findByText("arroz branco cozido"));
    await user.type(screen.getByLabelText("Quantidade"), "150");
    await user.press(screen.getByRole("radio", { name: "Almoço" }));
    await user.press(screen.getByRole("button", { name: /^lançar$/i }));

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
    await user.press(screen.getByRole("button", { name: /^buscar$/i }));
    await user.press(await screen.findByText("whey protein"));
    await user.type(screen.getByLabelText("Quantidade"), "1");
    await user.press(screen.getByRole("radio", { name: "scoop (30 g)" }));
    await user.press(screen.getByRole("radio", { name: "Lanche" }));
    await user.press(screen.getByRole("button", { name: /^lançar$/i }));

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
    await user.press(screen.getByRole("button", { name: /^buscar$/i }));
    await user.press(await screen.findByText("arroz branco cozido"));
    await user.press(screen.getByRole("button", { name: /^lançar$/i }));

    expect(await screen.findByText("Quantidade deve ser um número")).toBeOnTheScreen();
    expect(callsTo(fetchMock, "POST", "/entries")).toHaveLength(0);
  });

  async function escolherArroz() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Buscar alimento"), "arroz");
    await user.press(screen.getByRole("button", { name: /^buscar$/i }));
    await user.press(await screen.findByText("arroz branco cozido"));
  }

  it("refeicao=jantar no parâmetro abre com Jantar marcado", async () => {
    mockParams.mockReturnValueOnce({ data: "2026-11-10", refeicao: "jantar" });
    apiFake(mockFetch());
    await render(<LancamentoScreen />);
    await escolherArroz();

    expect(screen.getByRole("radio", { name: "Jantar" })).toBeChecked();
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(2); // g + Jantar
  });

  it("refeicao inválida no parâmetro cai na refeição pela hora", async () => {
    mockParams.mockReturnValueOnce({ data: "2026-11-10", refeicao: "xyz" });
    apiFake(mockFetch());
    await render(<LancamentoScreen />);
    await escolherArroz();

    const padrao = MEAL_LABELS[mealForHour(new Date().getHours())];
    expect(screen.getByRole("radio", { name: padrao })).toBeChecked();
  });

  it("TopBar LANÇAR com voltar, linha LANÇAR EM e resultado com kcal / 100 g", async () => {
    apiFake(mockFetch());
    await render(<LancamentoScreen />);
    const user = userEvent.setup();

    expect(screen.getByRole("header", { name: "Lançar" })).toBeOnTheScreen();
    expect(screen.getByText(/^Lançar em: /)).toBeOnTheScreen();
    await user.type(screen.getByLabelText("Buscar alimento"), "arroz");
    await user.press(screen.getByRole("button", { name: /^buscar$/i }));
    expect(await screen.findAllByText("128 kcal / 100 g")).toHaveLength(2); // arroz e whey (mesmo FOOD base)
    expect(screen.getByText("arroz branco cozido")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Voltar" }));
    expect(router.back).toHaveBeenCalled();
  });
});
