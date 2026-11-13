/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  // Resolve pacotes do workspace (@kcal/*) pelo código-fonte (condição "source"),
  // para os testes não dependerem de `pnpm build` antes.
  testEnvironmentOptions: {
    customExportConditions: ["source", "node", "require", "default"],
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json" }],
  },
};
