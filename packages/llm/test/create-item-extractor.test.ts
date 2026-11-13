import type Anthropic from "@anthropic-ai/sdk";
import {
  createAnthropicClient,
  createItemExtractor,
  EXTRACTION_SYSTEM_PROMPT,
  ExtractionParseError,
  type ItemExtractorClient,
} from "../src";

/** Cliente falso: devolve `parsed_output` fixo e registra os parâmetros recebidos. Sem rede. */
function fakeClient(parsedOutput: unknown) {
  const parse = jest.fn(async (_params: unknown) => ({ parsed_output: parsedOutput }));
  const client: ItemExtractorClient = { messages: { parse } };
  return { client, parse };
}

describe("createItemExtractor", () => {
  it("frase com 3 itens devolve 3 itens tipados", async () => {
    const { client } = fakeClient({
      itens: [
        { alimento: "arroz branco cozido", quantidade: 200, unidade: "g", refeicao: "almoco" },
        { alimento: "frango grelhado", quantidade: 150, unidade: "g", refeicao: "almoco" },
        { alimento: "batata média", quantidade: 1, unidade: "unidade", refeicao: "almoco" },
      ],
    });

    const itens = await createItemExtractor({ client }).extract(
      "almocei 200 g de arroz, 150 g de frango e uma batata média",
    );

    expect(itens).toEqual([
      { alimento: "arroz branco cozido", quantidade: 200, unidade: "g", refeicao: "almoco" },
      { alimento: "frango grelhado", quantidade: 150, unidade: "g", refeicao: "almoco" },
      { alimento: "batata média", quantidade: 1, unidade: "unidade", refeicao: "almoco" },
    ]);
  });

  it('"um scoop de whey" → quantidade 1, unidade scoop', async () => {
    const { client } = fakeClient({
      itens: [{ alimento: "whey protein", quantidade: 1, unidade: "scoop" }],
    });

    const [item, ...resto] = await createItemExtractor({ client }).extract("um scoop de whey");

    expect(resto).toHaveLength(0);
    expect(item).toEqual({ alimento: "whey protein", quantidade: 1, unidade: "scoop" });
    expect(item).not.toHaveProperty("refeicao");
  });

  it("frase sem comida → lista vazia", async () => {
    const { client } = fakeClient({ itens: [] });
    await expect(createItemExtractor({ client }).extract("bom dia")).resolves.toEqual([]);
  });

  it.each([[null], [undefined]])("parsed_output %p → ExtractionParseError", async (output) => {
    const { client } = fakeClient(output);
    await expect(createItemExtractor({ client }).extract("comi arroz")).rejects.toBeInstanceOf(
      ExtractionParseError,
    );
  });

  it.each([
    ["quantidade zero", { itens: [{ alimento: "arroz", quantidade: 0, unidade: "g" }] }],
    ["unidade fora da lista", { itens: [{ alimento: "arroz", quantidade: 1, unidade: "kg" }] }],
    ["sem a lista de itens", { alimento: "arroz", quantidade: 1, unidade: "g" }],
  ])("item inválido (%s) → ExtractionParseError", async (_caso, output) => {
    const { client } = fakeClient(output);
    await expect(createItemExtractor({ client }).extract("comi arroz")).rejects.toBeInstanceOf(
      ExtractionParseError,
    );
  });

  it("campo extra kcal (e outros macros) é descartado", async () => {
    const { client } = fakeClient({
      itens: [
        {
          alimento: "banana",
          quantidade: 1,
          unidade: "unidade",
          kcal: 999,
          proteina_g: 12,
        },
      ],
      total_kcal: 999,
    });

    const itens = await createItemExtractor({ client }).extract("comi uma banana");

    expect(itens).toEqual([{ alimento: "banana", quantidade: 1, unidade: "unidade" }]);
    expect(itens[0]).not.toHaveProperty("kcal");
    expect(itens[0]).not.toHaveProperty("proteina_g");
  });

  it("chama o SDK com claude-haiku-5-5, max_tokens, prompt de sistema e output_config.format", async () => {
    const { client, parse } = fakeClient({ itens: [] });

    await createItemExtractor({ client }).extract("um scoop de whey");

    expect(parse).toHaveBeenCalledTimes(1);
    const params = parse.mock.calls[0]?.[0] as Record<string, unknown> & {
      output_config: { format: { type: string; schema: Record<string, unknown> } };
    };
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.max_tokens).toBe(4096);
    expect(params.system).toBe(EXTRACTION_SYSTEM_PROMPT);
    expect(params.messages).toEqual([{ role: "user", content: "um scoop de whey" }]);
    expect(params.output_config.format.type).toBe("json_schema");
    expect(params.output_config.format.schema).toHaveProperty("properties.itens");
    // Sem parâmetros que o brief proíbe.
    expect(params).not.toHaveProperty("temperature");
    expect(params).not.toHaveProperty("thinking");
    expect(params).not.toHaveProperty("output_format");
  });

  it("erro do SDK propaga sem ser embrulhado", async () => {
    const boom = new Error("529 overloaded");
    const client: ItemExtractorClient = {
      messages: { parse: jest.fn(async () => Promise.reject(boom)) },
    };
    await expect(createItemExtractor({ client }).extract("comi arroz")).rejects.toBe(boom);
  });
});

describe("EXTRACTION_SYSTEM_PROMPT", () => {
  it("proíbe valor nutricional e manda normalizar número por extenso", () => {
    expect(EXTRACTION_SYSTEM_PROMPT).toMatch(/Nunca informe calorias/);
    expect(EXTRACTION_SYSTEM_PROMPT).toContain('"duzentos" → 200');
  });
});

describe("createAnthropicClient", () => {
  it("devolve um cliente que satisfaz ItemExtractorClient (sem chamar a rede)", () => {
    const client: Anthropic = createAnthropicClient({ apiKey: "sk-test-falsa" });
    const asExtractorClient: ItemExtractorClient = client;
    expect(typeof asExtractorClient.messages.parse).toBe("function");
  });
});
