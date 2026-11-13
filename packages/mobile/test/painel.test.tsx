import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { addDays, todayLocal } from "../src/day/dates";
import { DayPanel } from "../src/day/day-panel";
import { callsTo, dayFetch, entry } from "./day-fixtures";
import { jsonResponse, mockFetch } from "./helpers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
  // Sem navegador nos testes: "ganhar foco" = montar (e de novo quando o callback muda).
  useFocusEffect: (cb: () => void) => require("react").useEffect(() => cb(), [cb]),
}));

async function renderPanel() {
  await render(<DayPanel />);
}

describe("DayPanel (painel do dia)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra totais × meta com kcal inteiro e gramas com 1 casa", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderPanel();

    // consumido: 1234.6 kcal, 50.04 / 120.25 / 33.35 g (sem arredondar, como vem da API).
    expect(await screen.findByText("Calorias: 1235 / 2000 kcal")).toBeOnTheScreen();
    expect(screen.getByText("Proteína: 50 / 120 g")).toBeOnTheScreen();
    expect(screen.getByText("Carboidrato: 120,3 / 250 g")).toBeOnTheScreen();
    expect(screen.getByText("Gordura: 33,4 / 70 g")).toBeOnTheScreen();
    // Lançamentos por refeição: gramas com até 1 casa, kcal inteiro.
    expect(screen.getByText("Café da manhã · 19 kcal")).toBeOnTheScreen();
    expect(screen.getByText("ovo cozido · 12,3 g · 19 kcal")).toBeOnTheScreen();
    expect(screen.getByText("arroz branco cozido · 200 g · 256 kcal")).toBeOnTheScreen();
    expect(screen.getAllByText("Nada lançado")).toHaveLength(2);
    expect(screen.getByText("Hoje")).toBeOnTheScreen();
    expect(callsTo(fetchMock, "GET", `/days/${todayLocal()}`)).toHaveLength(1);
    expect(screen.queryByText("Definir meta")).toBeNull();
  });

  it("seta 'anterior' pede GET /days/<ontem>; 'próximo' volta e não passa de hoje", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderPanel();
    await screen.findByText("Hoje");
    const user = userEvent.setup();
    const hoje = todayLocal();
    const ontem = addDays(hoje, -1);

    expect(screen.getByRole("button", { name: "Próximo dia" })).toBeDisabled();

    await user.press(screen.getByRole("button", { name: "Dia anterior" }));
    expect(await screen.findByText("Ontem")).toBeOnTheScreen();
    await waitFor(() => expect(callsTo(fetchMock, "GET", `/days/${ontem}`)).toHaveLength(1));

    await user.press(screen.getByRole("button", { name: "Dia anterior" }));
    await waitFor(() =>
      expect(callsTo(fetchMock, "GET", `/days/${addDays(hoje, -2)}`)).toHaveLength(1),
    );

    await user.press(screen.getByRole("button", { name: "Próximo dia" }));
    expect(await screen.findByText("Ontem")).toBeOnTheScreen();
    await waitFor(() => expect(callsTo(fetchMock, "GET", `/days/${ontem}`)).toHaveLength(2));
  });

  it("apagar com confirmação chama DELETE /entries/:id e recarrega o dia", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderPanel();
    const user = userEvent.setup();

    await user.press(await screen.findByText("arroz branco cozido · 200 g · 256 kcal"));
    await user.press(screen.getByRole("button", { name: "Apagar" }));
    // Primeiro toque só pede confirmação.
    expect(callsTo(fetchMock, "DELETE", "/entries/e1")).toHaveLength(0);
    await user.press(screen.getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => expect(callsTo(fetchMock, "DELETE", "/entries/e1")).toHaveLength(1));
    await waitFor(() => expect(callsTo(fetchMock, "GET", `/days/${todayLocal()}`)).toHaveLength(2));
  });

  it("'Não apagar' desiste sem chamar a API", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderPanel();
    const user = userEvent.setup();

    await user.press(await screen.findByText("ovo cozido · 12,3 g · 19 kcal"));
    await user.press(screen.getByRole("button", { name: "Apagar" }));
    await user.press(screen.getByRole("button", { name: "Não apagar" }));

    expect(screen.getByRole("button", { name: "Apagar" })).toBeOnTheScreen();
    expect(callsTo(fetchMock, "DELETE", "/entries/e2")).toHaveLength(0);
  });

  it("editar gramas manda PATCH só com o que mudou", async () => {
    const fetchMock = dayFetch(mockFetch(), {
      outras: () => jsonResponse(200, entry({ id: "e1" })),
    });
    await renderPanel();
    const user = userEvent.setup();

    await user.press(await screen.findByText("arroz branco cozido · 200 g · 256 kcal"));
    const gramas = screen.getByLabelText("Gramas");
    await user.clear(gramas);
    await user.type(gramas, "150,5");
    await user.press(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(callsTo(fetchMock, "PATCH", "/entries/e1")).toHaveLength(1));
    const [init] = callsTo(fetchMock, "PATCH", "/entries/e1");
    expect(JSON.parse(init?.body as string)).toEqual({ gramas: 150.5 });
  });

  it("trocar só a refeição manda PATCH sem gramas (mantém o snapshot)", async () => {
    const fetchMock = dayFetch(mockFetch(), {
      outras: () => jsonResponse(200, entry({ id: "e1" })),
    });
    await renderPanel();
    const user = userEvent.setup();

    await user.press(await screen.findByText("arroz branco cozido · 200 g · 256 kcal"));
    await user.press(screen.getByRole("radio", { name: "Jantar" }));
    await user.press(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(callsTo(fetchMock, "PATCH", "/entries/e1")).toHaveLength(1));
    const [init] = callsTo(fetchMock, "PATCH", "/entries/e1");
    expect(JSON.parse(init?.body as string)).toEqual({ refeicao: "jantar" });
  });

  it("gramas inválidas mostram o erro do schema sem chamar a API", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderPanel();
    const user = userEvent.setup();

    await user.press(await screen.findByText("arroz branco cozido · 200 g · 256 kcal"));
    await user.clear(screen.getByLabelText("Gramas"));
    await user.type(screen.getByLabelText("Gramas"), "0");
    await user.press(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Gramas deve ser maior que zero")).toBeOnTheScreen();
    expect(callsTo(fetchMock, "PATCH", "/entries/e1")).toHaveLength(0);
  });

  it("sem meta mostra só o consumido e o botão 'Definir meta'", async () => {
    dayFetch(mockFetch(), { meta: null });
    await renderPanel();

    expect(await screen.findByText("Calorias: 1235 kcal")).toBeOnTheScreen();
    expect(screen.getByText("Gordura: 33,4 g")).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Definir meta" }));
    expect(router.push).toHaveBeenCalledWith("/meta");
  });

  it("'Lançar manualmente' abre o lançamento com a data do painel", async () => {
    dayFetch(mockFetch());
    await renderPanel();
    const user = userEvent.setup();
    await screen.findByText("Hoje");

    await user.press(screen.getByRole("button", { name: "Dia anterior" }));
    await screen.findByText("Ontem");
    await user.press(await screen.findByRole("button", { name: "Lançar manualmente" }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/lancamento",
      params: { data: addDays(todayLocal(), -1) },
    });
  });

  it("erro da API aparece com 'Tentar de novo'", async () => {
    mockFetch().mockResolvedValue(jsonResponse(500, { erro: "Falha ao carregar o dia" }));
    await renderPanel();

    expect(await screen.findByText("Falha ao carregar o dia")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeOnTheScreen();
  });
});
