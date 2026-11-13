/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  roots: ["<rootDir>/test"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Render de tela com o cache do transform frio passa de 5 s em máquina carregada (flake visto em
  // 4 merges seguidos); 20 s dá folga sem esconder teste travado.
  testTimeout: 20000,
  // Pacotes do workspace pelo código-fonte (mesma ideia da condição "source" do metro.config.js),
  // para os testes não dependerem de `pnpm build` antes.
  moduleNameMapper: {
    "^@kcal/shared$": "<rootDir>/../shared/src/index.ts",
    "^@kcal/nutrition-core$": "<rootDir>/../nutrition-core/src/index.ts",
  },
};
