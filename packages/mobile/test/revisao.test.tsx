import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import RevisaoScreen from "../src/app/revisao";
import { ReviewProvider } from "../src/voice/review-store";
import { REVIEW } from "./helpers";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: jest.fn() },
}));

describe("RevisaoScreen (placeholder da T-012)", () => {
  it("mostra a transcrição e os itens entendidos", async () => {
    await render(<RevisaoScreen />, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ReviewProvider initialReview={REVIEW}>{children}</ReviewProvider>
      ),
    });

    expect(screen.getByText("duzentos gramas de arroz")).toBeOnTheScreen();
    expect(screen.getByText("arroz — 200 g")).toBeOnTheScreen();
  });

  it("sem revisão em memória avisa que não há nada", async () => {
    await render(<RevisaoScreen />, { wrapper: ReviewProvider });

    expect(screen.getByText("Nada para revisar.")).toBeOnTheScreen();
  });
});
