import { render, screen } from "@testing-library/react-native";
import { ChoiceRow } from "../src/ui/choice";
import { MEAL_OPTIONS } from "../src/ui/format";

describe("ChoiceRow", () => {
  it("expõe o chip escolhido como checked (rádio), não como selected", async () => {
    await render(
      <ChoiceRow label="Refeição" options={MEAL_OPTIONS} value="almoco" onChange={() => {}} />,
    );

    expect(screen.getByRole("radio", { name: "Almoço", checked: true })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Jantar", checked: false })).toBeOnTheScreen();
  });
});
