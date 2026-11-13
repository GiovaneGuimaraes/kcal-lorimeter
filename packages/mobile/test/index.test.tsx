import { render, screen } from "@testing-library/react-native";
import HomeScreen from "../src/app/index";

describe("HomeScreen", () => {
  it("mostra o nome do app e o aviso em pt-BR", async () => {
    await render(<HomeScreen />);

    expect(screen.getByText("kcal-lorimeter")).toBeTruthy();
    expect(screen.getByText("Em breve: lançamento por voz")).toBeTruthy();
  });
});
