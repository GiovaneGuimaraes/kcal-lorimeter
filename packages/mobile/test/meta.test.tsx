import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import MetaScreen from "../src/app/meta";
import { todayLocal } from "../src/day/dates";
import { callsTo, GOAL } from "./day-fixtures";
import { jsonResponse, mockFetch } from "./helpers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));

describe("MetaScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sem meta (404) começa vazia; salvar manda PUT /goals com o payload e volta", async () => {
    const fetchMock = mockFetch().mockImplementation(async (_url: string, init: RequestInit) =>
      init.method === "PUT"
        ? jsonResponse(200, { ...GOAL, vigenteDesde: todayLocal() })
        : jsonResponse(404, { erro: "Nenhuma meta cadastrada" }),
    );
    await render(<MetaScreen />);
    const user = userEvent.setup();

    const kcal = await screen.findByLabelText("Calorias (kcal)");
    expect(kcal.props.value).toBe("");
    expect(callsTo(fetchMock, "GET", `/goals?data=${todayLocal()}`)).toHaveLength(1);
    // 404 aqui é "ainda sem meta", não erro.
    expect(screen.queryByText("Nenhuma meta cadastrada")).toBeNull();

    await user.type(kcal, "2000");
    await user.type(screen.getByLabelText("Proteína (g)"), "120");
    await user.type(screen.getByLabelText("Carboidrato (g)"), "250");
    await user.type(screen.getByLabelText("Gordura (g)"), "70");
    await user.press(screen.getByRole("button", { name: /salvar meta/i }));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    const [init] = callsTo(fetchMock, "PUT", "/goals");
    expect(JSON.parse(init?.body as string)).toEqual({
      kcal: 2000,
      proteinaG: 120,
      carboG: 250,
      gorduraG: 70,
      vigenteDesde: todayLocal(),
    });
  });

  it("com meta vigente, preenche os campos", async () => {
    mockFetch().mockResolvedValue(jsonResponse(200, GOAL));
    await render(<MetaScreen />);

    expect((await screen.findByLabelText("Calorias (kcal)")).props.value).toBe("2000");
    expect(screen.getByLabelText("Gordura (g)").props.value).toBe("70");
  });

  it("TopBar META DIÁRIA com voltar e hint VALE A PARTIR DE HOJE", async () => {
    mockFetch().mockResolvedValue(jsonResponse(200, GOAL));
    await render(<MetaScreen />);

    expect(screen.getByRole("header", { name: "Meta diária" })).toBeOnTheScreen();
    expect(await screen.findByText("Vale a partir de hoje")).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Voltar" }));
    expect(router.back).toHaveBeenCalled();
  });

  it("campo vazio ou decimal mostra o erro do schema sem chamar PUT", async () => {
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(200, GOAL));
    await render(<MetaScreen />);
    const user = userEvent.setup();

    await user.clear(await screen.findByLabelText("Calorias (kcal)"));
    await user.clear(screen.getByLabelText("Proteína (g)"));
    await user.type(screen.getByLabelText("Proteína (g)"), "1,5");
    await user.press(screen.getByRole("button", { name: /salvar meta/i }));

    expect(await screen.findByText("Calorias é obrigatório(a)")).toBeOnTheScreen();
    expect(screen.getByText("Proteína deve ser um número inteiro")).toBeOnTheScreen();
    expect(callsTo(fetchMock, "PUT", "/goals")).toHaveLength(0);
  });
});
