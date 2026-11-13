import { CreateEntrySchema } from "../src";

const base = {
  data: "2026-11-12",
  refeicao: "almoco",
  foodId: "f1",
  quantidade: 100,
  unidade: "g",
};

describe("CreateEntrySchema voiceLogId", () => {
  it.each(["voz", "texto"])("aceita voiceLogId com origem %s", (origem) => {
    expect(CreateEntrySchema.safeParse({ ...base, origem, voiceLogId: "v1" }).success).toBe(true);
  });

  it("recusa voiceLogId com origem manual (explícita ou padrão)", () => {
    const manual = { ...base, origem: "manual", voiceLogId: "v1" };
    expect(CreateEntrySchema.safeParse(manual).success).toBe(false);
    expect(CreateEntrySchema.safeParse({ ...base, voiceLogId: "v1" }).success).toBe(false);
  });
});
