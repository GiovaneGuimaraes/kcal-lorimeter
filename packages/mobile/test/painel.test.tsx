import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { addDays, formatDayShortLabel, todayLocal } from "../src/day/dates";
import { DayPanel } from "../src/day/day-panel";
import { theme } from "../src/ui/theme";
import { callsTo, day, dayFetch, entry, GOAL } from "./day-fixtures";
import { jsonResponse, mockFetch } from "./helpers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
  // Sem navegador nos testes: "ganhar foco" = montar (e de novo quando o callback muda).
  useFocusEffect: (cb: () => void) => require("react").useEffect(() => cb(), [cb]),
}));

async function renderPanel() {
  await render(<DayPanel />);
}

/** `GET /days/:data` com o consumido de kcal trocado (meta de 2000), como a API calcularia. */
function fetchComKcal(kcal: number) {
  mockFetch().mockImplementation(async (url: string) => {
    const data = String(url).slice(-10);
    const base = day(data);
    return jsonResponse(200, {
      ...base,
      consumido: { ...base.consumido, kcal },
      restante: base.restante ? { ...base.restante, kcal: GOAL.kcal - kcal } : null,
    });
  });
}

describe("DayPanel (painel do dia)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("com meta: herói com as kcal que ainda cabem, macros e lançamentos por refeição", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderPanel();
    const hoje = todayLocal();

    // consumido: 1234.6 kcal, 50.04 / 120.25 / 33.35 g (sem arredondar, como vem da API).
    expect(await screen.findByText("765")).toBeOnTheScreen();
    expect(screen.getByText("AINDA CABEM")).toBeOnTheScreen();
    expect(screen.getByText("KCAL RESTANTES")).toBeOnTheScreen();
    expect(screen.getByText("1.235 / 2.000")).toBeOnTheScreen();
    // Macros: gramas com até 1 casa, "/ meta g · %".
    expect(screen.getByText("50")).toBeOnTheScreen();
    expect(screen.getByText("/ 120 g · 42%")).toBeOnTheScreen();
    expect(screen.getByText("120,3")).toBeOnTheScreen();
    expect(screen.getByText("/ 250 g · 48%")).toBeOnTheScreen();
    expect(screen.getByText("33,4")).toBeOnTheScreen();
    expect(screen.getByText("/ 70 g · 48%")).toBeOnTheScreen();
    // Lançamentos: "nome — gramas" e kcal inteiro à direita; subtotal no cabeçalho.
    expect(screen.getByText("Café da manhã")).toBeOnTheScreen();
    expect(screen.getByText("ovo cozido — 12,3 g")).toBeOnTheScreen();
    expect(screen.getByText("arroz branco cozido — 200 g")).toBeOnTheScreen();
    expect(screen.getAllByText("256 kcal")).toHaveLength(2); // linha + subtotal do almoço
    expect(screen.getAllByText("19 kcal")).toHaveLength(2); // linha + subtotal do café
    expect(screen.getByText(formatDayShortLabel(hoje, hoje))).toBeOnTheScreen();
    expect(screen.getByText(/^HOJE · /)).toBeOnTheScreen();
    expect(screen.queryByText("SEM META")).toBeNull();
    expect(screen.queryByRole("button", { name: "Voltar para hoje" })).toBeNull();
    expect(callsTo(fetchMock, "GET", `/days/${hoje}`)).toHaveLength(1);
  });

  it("herói mostra o restante com separador de milhar ('1.215')", async () => {
    fetchComKcal(785);
    await renderPanel();

    expect(await screen.findByText("1.215")).toBeOnTheScreen();
    expect(screen.getByText("785 / 2.000")).toBeOnTheScreen();
    const fill = StyleSheet.flatten(screen.getByTestId("hero-fill").props.style);
    expect(fill.width).toBe("39.25%");
    expect(fill.backgroundColor).toBe(theme.color.ink);
  });

  it("acima da meta: '+N', 'PASSOU DE HOJE' e barra cheia em danger", async () => {
    fetchComKcal(2120);
    await renderPanel();

    expect(await screen.findByText("+120")).toBeOnTheScreen();
    expect(screen.getByText("PASSOU DE HOJE")).toBeOnTheScreen();
    expect(screen.getByText("KCAL ACIMA DA META")).toBeOnTheScreen();
    expect(screen.getByText("2.120 / 2.000")).toBeOnTheScreen();
    expect(screen.queryByText("AINDA CABEM")).toBeNull();
    const fill = StyleSheet.flatten(screen.getByTestId("hero-fill").props.style);
    expect(fill.width).toBe("100%");
    expect(fill.backgroundColor).toBe(theme.color.danger);
  });

  it("sem meta: 'SEM META' e 'Definir meta' no lugar do número", async () => {
    dayFetch(mockFetch(), { meta: null });
    await renderPanel();

    expect(await screen.findByText("SEM META")).toBeOnTheScreen();
    expect(screen.getByText("Consumido hoje: 1.235 kcal")).toBeOnTheScreen();
    expect(screen.queryByText("AINDA CABEM")).toBeNull();
    expect(screen.getAllByText("g · sem meta")).toHaveLength(3);
    await userEvent.setup().press(screen.getByRole("button", { name: "Definir meta" }));
    expect(router.push).toHaveBeenCalledWith("/meta");
  });

  it("tocar numa coluna de macro abre a meta", async () => {
    dayFetch(mockFetch());
    await renderPanel();

    await userEvent.setup().press(await screen.findByRole("button", { name: /^Proteína:/ }));
    expect(router.push).toHaveBeenCalledWith("/meta");
  });

  it("seta 'anterior' pede GET /days/<ontem>; 'próximo' volta e não passa de hoje", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderPanel();
    const hoje = todayLocal();
    const ontem = addDays(hoje, -1);
    await screen.findByText(formatDayShortLabel(hoje, hoje));
    const user = userEvent.setup();

    expect(screen.getByRole("button", { name: "Próximo dia" })).toBeDisabled();

    await user.press(screen.getByRole("button", { name: "Dia anterior" }));
    expect(await screen.findByText(formatDayShortLabel(ontem, hoje))).toBeOnTheScreen();
    expect(screen.getByText(/^ONTEM · /)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Voltar para hoje" })).toBeOnTheScreen();
    await waitFor(() => expect(callsTo(fetchMock, "GET", `/days/${ontem}`)).toHaveLength(1));

    await user.press(screen.getByRole("button", { name: "Dia anterior" }));
    await waitFor(() =>
      expect(callsTo(fetchMock, "GET", `/days/${addDays(hoje, -2)}`)).toHaveLength(1),
    );

    await user.press(screen.getByRole("button", { name: "Próximo dia" }));
    expect(await screen.findByText(formatDayShortLabel(ontem, hoje))).toBeOnTheScreen();
    await waitFor(() => expect(callsTo(fetchMock, "GET", `/days/${ontem}`)).toHaveLength(2));

    await user.press(screen.getByRole("button", { name: "Voltar para hoje" }));
    expect(await screen.findByText(formatDayShortLabel(hoje, hoje))).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Voltar para hoje" })).toBeNull();
  });

  it("'+ adicionar' abre o lançamento com a data do painel e a refeição", async () => {
    dayFetch(mockFetch());
    await renderPanel();
    const user = userEvent.setup();
    const hoje = todayLocal();
    await screen.findByText(formatDayShortLabel(hoje, hoje));

    // Toda refeição tem "+ adicionar" (vazia no cabeçalho, com itens abaixo deles).
    expect(screen.getAllByText("+ adicionar")).toHaveLength(4);

    await user.press(screen.getByRole("button", { name: "Dia anterior" }));
    await screen.findByText(formatDayShortLabel(addDays(hoje, -1), hoje));
    await user.press(await screen.findByRole("button", { name: "Adicionar em Lanche" }));

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/lancamento",
      params: { data: addDays(hoje, -1), refeicao: "lanche" },
    });
  });

  it("apagar pede 'APAGAR MESMO?' e só então chama DELETE /entries/:id e recarrega o dia", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderPanel();
    const user = userEvent.setup();

    await user.press(await screen.findByText("arroz branco cozido — 200 g"));
    await user.press(screen.getByRole("button", { name: "Apagar" }));
    // Primeiro toque só pede confirmação.
    expect(screen.getByText("APAGAR MESMO?")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
    expect(callsTo(fetchMock, "DELETE", "/entries/e1")).toHaveLength(0);
    await user.press(screen.getByRole("button", { name: "Apagar" }));

    await waitFor(() => expect(callsTo(fetchMock, "DELETE", "/entries/e1")).toHaveLength(1));
    await waitFor(() => expect(callsTo(fetchMock, "GET", `/days/${todayLocal()}`)).toHaveLength(2));
  });

  it("'Não' desiste de apagar sem chamar a API", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderPanel();
    const user = userEvent.setup();

    await user.press(await screen.findByText("ovo cozido — 12,3 g"));
    await user.press(screen.getByRole("button", { name: "Apagar" }));
    await user.press(screen.getByRole("button", { name: "Não" }));

    expect(screen.queryByText("APAGAR MESMO?")).toBeNull();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeOnTheScreen();
    expect(callsTo(fetchMock, "DELETE", "/entries/e2")).toHaveLength(0);
  });

  it("'Cancelar' fecha o editor sem chamar a API", async () => {
    const fetchMock = dayFetch(mockFetch());
    await renderPanel();
    const user = userEvent.setup();

    await user.press(await screen.findByText("ovo cozido — 12,3 g"));
    await user.press(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByLabelText("Gramas")).toBeNull();
    expect(callsTo(fetchMock, "PATCH", "/entries/e2")).toHaveLength(0);
  });

  it("editar gramas manda PATCH só com o que mudou", async () => {
    const fetchMock = dayFetch(mockFetch(), {
      outras: () => jsonResponse(200, entry({ id: "e1" })),
    });
    await renderPanel();
    const user = userEvent.setup();

    await user.press(await screen.findByText("arroz branco cozido — 200 g"));
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

    await user.press(await screen.findByText("arroz branco cozido — 200 g"));
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

    await user.press(await screen.findByText("arroz branco cozido — 200 g"));
    await user.clear(screen.getByLabelText("Gramas"));
    await user.type(screen.getByLabelText("Gramas"), "0");
    await user.press(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Gramas deve ser maior que zero")).toBeOnTheScreen();
    expect(callsTo(fetchMock, "PATCH", "/entries/e1")).toHaveLength(0);
  });

  it("erro da API aparece com 'Tentar de novo'", async () => {
    mockFetch().mockResolvedValue(jsonResponse(500, { erro: "Falha ao carregar o dia" }));
    await renderPanel();

    expect(await screen.findByText("Falha ao carregar o dia")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeOnTheScreen();
  });
});
