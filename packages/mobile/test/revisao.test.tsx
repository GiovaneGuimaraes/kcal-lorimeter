import type { EntryDto, FoodDto } from "@kcal/shared";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Text } from "react-native";
import RevisaoScreen from "../src/app/revisao";
import { localIsoDate } from "../src/voice/review-lines";
import { type PendingReview, ReviewProvider, useReview } from "../src/voice/review-store";
import { jsonResponse, mockFetch, REVIEW } from "./helpers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));

/** Alimentos inventados: os números são só dados de teste, não valores nutricionais reais. */
function food(id: string, nome: string, porcaoPadraoG: number | null = null): FoodDto {
  return {
    id,
    nome,
    apelidos: [],
    kcal100g: 100,
    proteina100g: 10,
    carbo100g: 10,
    gordura100g: 1,
    porcaoPadraoG,
    nomePorcao: null,
    fonte: "teste",
    isPadrao: true,
  };
}

const ARROZ = food("f-arroz", "Arroz teste");
const OVO = food("f-ovo", "Ovo teste", 50);
const WHEY = food("f-whey", "Whey teste");
const FRANGO_A = food("f-frango-a", "Frango A");
const FRANGO_B = food("f-frango-b", "Frango B");

function entry(foodId: string): EntryDto {
  return {
    id: `e-${foodId}`,
    data: "2026-01-01",
    refeicao: "almoco",
    food: { id: foodId, nome: foodId },
    gramas: 100,
    kcal: 100,
    proteinaG: 10,
    carboG: 10,
    gorduraG: 1,
    origem: "voz",
    voiceLogId: "vl1",
  };
}

/** Dois itens casados (exact), com refeição dita, para o payload não depender da hora. */
const DOIS_ITENS: PendingReview = {
  voiceLogId: "vl1",
  transcricao: "no almoço duzentos gramas de arroz e dois ovos",
  origem: "voz",
  itens: [
    {
      extraido: { alimento: "arroz", quantidade: 200, unidade: "g", refeicao: "almoco" },
      match: { kind: "exact", food: ARROZ },
      gramas: 200,
      precisaPeso: false,
    },
    {
      extraido: { alimento: "ovo", quantidade: 2, unidade: "unidade", refeicao: "almoco" },
      match: { kind: "exact", food: OVO },
      gramas: 100,
      precisaPeso: false,
    },
  ],
};

/** Mostra se a revisão ainda está no store (para checar o `setReview(null)`). */
function StoreProbe() {
  const { review } = useReview();
  return review === null ? <Text>store-vazio</Text> : null;
}

async function renderRevisao(review: PendingReview | null) {
  await render(<RevisaoScreen />, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ReviewProvider initialReview={review}>
        {children}
        <StoreProbe />
      </ReviewProvider>
    ),
  });
}

function bodyOf(call: unknown[]): unknown {
  return JSON.parse((call[1] as RequestInit).body as string);
}

const confirmar = () => screen.getByRole("button", { name: "Confirmar" });

describe("RevisaoScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra a transcrição no topo", async () => {
    mockFetch();
    await renderRevisao(REVIEW);
    expect(screen.getByText("duzentos gramas de arroz")).toBeOnTheScreen();
  });

  it("sem revisão em memória avisa que não há nada", async () => {
    await renderRevisao(null);
    expect(screen.getByText("Nada para revisar.")).toBeOnTheScreen();
  });

  it("item sem casamento (none) oferece Cadastrar e bloqueia Confirmar", async () => {
    const fetchMock = mockFetch();
    await renderRevisao(REVIEW);

    expect(screen.getByRole("button", { name: "Cadastrar" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Buscar" })).toBeOnTheScreen();
    expect(
      screen.getByText("Item 1 (arroz): escolha, busque ou cadastre o alimento."),
    ).toBeOnTheScreen();
    expect(confirmar()).toBeDisabled();

    await userEvent.setup().press(confirmar());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cadastrar um alimento novo chama POST /foods e o item passa a usá-lo", async () => {
    const novo = food("f-novo", "Arroz da casa");
    const fetchMock = mockFetch().mockResolvedValueOnce(jsonResponse(201, novo));
    await renderRevisao(REVIEW);
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: "Cadastrar" }));
    await user.clear(screen.getByLabelText("Nome do alimento"));
    await user.type(screen.getByLabelText("Nome do alimento"), "Arroz da casa");
    await user.type(screen.getByLabelText("Kcal por 100 g"), "130");
    await user.type(screen.getByLabelText("Proteína (g) por 100 g"), "2,5");
    await user.type(screen.getByLabelText("Carboidrato (g) por 100 g"), "28");
    await user.type(screen.getByLabelText("Gordura (g) por 100 g"), "0");
    await user.press(screen.getByRole("button", { name: "Salvar alimento" }));

    expect(await screen.findByText("Alimento: Arroz da casa")).toBeOnTheScreen();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/foods");
    expect(init.method).toBe("POST");
    expect(bodyOf(fetchMock.mock.calls[0])).toEqual({
      nome: "Arroz da casa",
      apelidos: [],
      kcal100g: 130,
      proteina100g: 2.5,
      carbo100g: 28,
      gordura100g: 0,
      fonte: "cadastro da pessoa",
    });
    expect(confirmar()).toBeEnabled();
  });

  it("cadastro com macro faltando mostra erro e não chama a API", async () => {
    const fetchMock = mockFetch();
    await renderRevisao(REVIEW);
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: "Cadastrar" }));
    await user.press(screen.getByRole("button", { name: "Salvar alimento" }));

    expect(await screen.findByText("Kcal por 100 g deve ser um número")).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("buscar chama GET /foods?q= e escolher um resultado troca o alimento", async () => {
    const fetchMock = mockFetch().mockResolvedValueOnce(jsonResponse(200, { foods: [ARROZ] }));
    await renderRevisao(REVIEW);
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: "Buscar" }));
    await user.press(screen.getByRole("button", { name: "Procurar" }));
    await user.press(await screen.findByRole("button", { name: "Arroz teste" }));

    expect(screen.getByText("Alimento: Arroz teste")).toBeOnTheScreen();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:3000/foods?q=arroz");
  });

  it("escolher um candidato troca o alimento do item", async () => {
    mockFetch();
    await renderRevisao({
      voiceLogId: "vl2",
      transcricao: "frango",
      origem: "voz",
      itens: [
        {
          extraido: { alimento: "frango", quantidade: 150, unidade: "g" },
          match: { kind: "candidates", foods: [FRANGO_A, FRANGO_B] },
          precisaPeso: false,
        },
      ],
    });
    const user = userEvent.setup();

    expect(screen.getByText("Qual destes?")).toBeOnTheScreen();
    expect(confirmar()).toBeDisabled();

    await user.press(screen.getByRole("button", { name: "Frango B" }));
    expect(screen.getByText("Alimento: Frango B")).toBeOnTheScreen();
    expect(confirmar()).toBeEnabled();

    await user.press(screen.getByRole("button", { name: "Frango A" }));
    expect(screen.getByText("Alimento: Frango A")).toBeOnTheScreen();
  });

  it("precisaPeso bloqueia Confirmar com mensagem até digitar as gramas", async () => {
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(201, entry(WHEY.id)));
    await renderRevisao({
      voiceLogId: "vl3",
      transcricao: "um scoop de whey no café",
      origem: "voz",
      itens: [
        {
          extraido: { alimento: "whey", quantidade: 1, unidade: "scoop", refeicao: "cafe" },
          match: { kind: "exact", food: WHEY },
          precisaPeso: true,
        },
      ],
    });
    const user = userEvent.setup();

    expect(screen.getByText("Item 1 (whey): informe o peso em gramas.")).toBeOnTheScreen();
    expect(
      screen.getByText('Whey teste não tem porção padrão para "scoop": informe o peso em gramas.'),
    ).toBeOnTheScreen();
    expect(confirmar()).toBeDisabled();

    await user.type(screen.getByLabelText("Peso em gramas — item 1"), "30");
    expect(screen.queryByText("Item 1 (whey): informe o peso em gramas.")).toBeNull();
    expect(confirmar()).toBeEnabled();

    await user.press(confirmar());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(bodyOf(fetchMock.mock.calls[0])).toMatchObject({
      foodId: WHEY.id,
      quantidade: 30,
      unidade: "g",
      refeicao: "cafe",
    });
  });

  it("confirmar com 2 itens chama POST /entries 2× com o payload certo e volta ao painel", async () => {
    const fetchMock = mockFetch()
      .mockResolvedValueOnce(jsonResponse(201, entry(ARROZ.id)))
      .mockResolvedValueOnce(jsonResponse(201, entry(OVO.id)));
    await renderRevisao(DOIS_ITENS);

    await userEvent.setup().press(confirmar());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const hoje = localIsoDate(new Date());
    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toBe("http://localhost:3000/entries");
      expect((call[1] as RequestInit).method).toBe("POST");
    }
    expect(bodyOf(fetchMock.mock.calls[0])).toEqual({
      data: hoje,
      refeicao: "almoco",
      foodId: ARROZ.id,
      quantidade: 200,
      unidade: "g",
      origem: "voz",
      voiceLogId: "vl1",
    });
    expect(bodyOf(fetchMock.mock.calls[1])).toEqual({
      data: hoje,
      refeicao: "almoco",
      foodId: OVO.id,
      quantidade: 2,
      unidade: "unidade",
      origem: "voz",
      voiceLogId: "vl1",
    });
    expect(screen.getByText("store-vazio")).toBeOnTheScreen();
  });

  it("refeição escolhida no topo, item removido e quantidade editada entram no payload", async () => {
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(201, entry(ARROZ.id)));
    await renderRevisao(DOIS_ITENS);
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: "Jantar" }));
    const removers = screen.getAllByRole("button", { name: "Remover" });
    const removerOvo = removers[1];
    if (!removerOvo) throw new Error("sem botão Remover do item 2");
    await user.press(removerOvo);
    await user.clear(screen.getByLabelText("Quantidade — item 1"));
    await user.type(screen.getByLabelText("Quantidade — item 1"), "150,5");
    await user.press(confirmar());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bodyOf(fetchMock.mock.calls[0])).toMatchObject({
      foodId: ARROZ.id,
      quantidade: 150.5,
      refeicao: "jantar",
    });
  });

  it("revisão por texto envia origem texto com o voiceLogId", async () => {
    const fetchMock = mockFetch().mockResolvedValue(jsonResponse(201, entry(ARROZ.id)));
    await renderRevisao({ ...DOIS_ITENS, origem: "texto", itens: DOIS_ITENS.itens.slice(0, 1) });

    await userEvent.setup().press(confirmar());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    const body = bodyOf(fetchMock.mock.calls[0]) as Record<string, unknown>;
    expect(body.origem).toBe("texto");
    expect(body.voiceLogId).toBe("vl1");
  });

  it("400 num item mostra o erro nele, marca o outro como salvo e não navega", async () => {
    const fetchMock = mockFetch()
      .mockResolvedValueOnce(jsonResponse(201, entry(ARROZ.id)))
      .mockResolvedValueOnce(jsonResponse(400, { erro: "Quantidade inválida" }));
    await renderRevisao(DOIS_ITENS);
    const user = userEvent.setup();

    await user.press(confirmar());

    expect(await screen.findByText("Quantidade inválida")).toBeOnTheScreen();
    expect(screen.getByText("Salvo")).toBeOnTheScreen();
    expect(
      screen.getByText("Alguns itens não foram salvos. Corrija e confirme de novo."),
    ).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Tentar de novo só reenvia o item que falhou.
    fetchMock.mockResolvedValueOnce(jsonResponse(201, entry(OVO.id)));
    await user.press(confirmar());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(bodyOf(fetchMock.mock.calls[2])).toMatchObject({ foodId: OVO.id });
  });

  it("descartar chama POST /voice/:id/discard, limpa o store e volta", async () => {
    const fetchMock = mockFetch().mockResolvedValueOnce(jsonResponse(204));
    await renderRevisao(DOIS_ITENS);

    await userEvent.setup().press(screen.getByRole("button", { name: "Descartar" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:3000/voice/vl1/discard");
    expect(init.method).toBe("POST");
    expect(screen.getByText("store-vazio")).toBeOnTheScreen();
  });

  it("descartar ignora 404 (registro já descartado)", async () => {
    mockFetch().mockResolvedValueOnce(
      jsonResponse(404, { erro: "Registro de voz não encontrado" }),
    );
    await renderRevisao(DOIS_ITENS);

    await userEvent.setup().press(screen.getByRole("button", { name: "Descartar" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(screen.queryByText("Registro de voz não encontrado")).toBeNull();
  });
});
