/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  roots: ["<rootDir>/test"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Pacotes do workspace pelo código-fonte (mesma ideia da condição "source" do metro.config.js),
  // para os testes não dependerem de `pnpm build` antes.
  moduleNameMapper: {
    "^@kcal/shared$": "<rootDir>/../shared/src/index.ts",
    "^@kcal/nutrition-core$": "<rootDir>/../nutrition-core/src/index.ts",
  },
};
