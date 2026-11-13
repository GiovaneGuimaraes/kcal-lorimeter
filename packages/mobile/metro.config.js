// Monorepo: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Pacotes do workspace (@kcal/shared) exportam o TypeScript de `src` pela condição "source"
// (o `default` aponta para `dist`, que só existe depois de `pnpm build`). Com "source" na lista,
// o Metro resolve direto o código-fonte e o app não depende de build prévio do shared.
config.resolver.unstable_conditionNames = [
  "source",
  ...(config.resolver.unstable_conditionNames ?? []),
];

module.exports = config;
