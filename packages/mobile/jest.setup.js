// Fontes: nos testes o `useFonts` responde "carregadas" na hora, para o `_layout` não segurar o
// indicador de carregamento. O jest-expo só mocka o módulo nativo (ExpoFontLoader), e aí o
// carregamento fica assíncrono e as telas aparecem um tick depois. Teste que quer o estado
// "carregando" sobrescreve com `jest.mocked(useFonts).mockReturnValue([false, null])`.
jest.mock("expo-font", () => ({
  ...jest.requireActual("expo-font"),
  useFonts: jest.fn(() => [true, null]),
}));
