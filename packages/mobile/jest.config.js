/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  roots: ["<rootDir>/test"],
  // @kcal/shared pelo código-fonte (mesma ideia da condição "source" do metro.config.js), para os
  // testes não dependerem de `pnpm build` antes.
  moduleNameMapper: {
    "^@kcal/shared$": "<rootDir>/../shared/src/index.ts",
  },
};
