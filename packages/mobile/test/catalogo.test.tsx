import { render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SegmentedRow } from "../src/ui/choice";
import { Button, ErrorMessage, Field, TopBar } from "../src/ui/components";
import { MEAL_OPTIONS } from "../src/ui/format";
import { Logo } from "../src/ui/logo";
import { theme } from "../src/ui/theme";

/**
 * "Catálogo" dos componentes base do visual D: cada componente em cada variante, conferindo papel
 * de acessibilidade, estado e os tokens que o desenho exige (não há rota de catálogo no app).
 */

function pressableStyle(name: string | RegExp) {
  return StyleSheet.flatten(screen.getByRole("button", { name }).props.style);
}

describe("Button", () => {
  it.each([
    ["primary", theme.color.ink, 56],
    ["secondary", theme.color.paper, theme.touch],
    ["danger", theme.color.danger, theme.touch],
  ] as const)("variante %s: fundo e altura mínima do visual D", async (variant, bg, minHeight) => {
    await render(<Button title="Ação" variant={variant} onPress={() => {}} />);

    const style = pressableStyle("Ação");
    expect(style.backgroundColor).toBe(bg);
    expect(style.minHeight).toBe(minHeight);
    expect(style.borderRadius).toBe(0);
    expect(screen.getByRole("button", { name: "Ação" })).toBeEnabled();
  });

  it("secundário tem borda 3 em ink", async () => {
    await render(<Button title="Voltar" variant="secondary" onPress={() => {}} />);

    const style = pressableStyle("Voltar");
    expect(style.borderWidth).toBe(3);
    expect(style.borderColor).toBe(theme.color.ink);
  });

  it("primário: texto accent, display, maiúsculo, uma linha que encolhe para caber", async () => {
    await render(<Button title="Lançar" onPress={() => {}} />);

    const text = screen.getByText("Lançar");
    const style = StyleSheet.flatten(text.props.style);
    expect(style.color).toBe(theme.color.accent);
    expect(style.fontFamily).toBe(theme.font.display);
    expect(style.textTransform).toBe("uppercase");
    expect(style.textAlign).toBe("center");
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.adjustsFontSizeToFit).toBe(true);
  });

  it("perigo: texto branco centralizado", async () => {
    await render(<Button title="Confirmar exclusão" variant="danger" onPress={() => {}} />);

    const style = StyleSheet.flatten(screen.getByText("Confirmar exclusão").props.style);
    expect(style.color).toBe(theme.color.onInk);
    expect(style.textAlign).toBe("center");
  });

  it("com disabledReason fica desabilitado e o rótulo diz o motivo", async () => {
    const onPress = jest.fn();
    await render(<Button title="Confirmar" disabledReason="Resolva o item 04" onPress={onPress} />);

    const button = screen.getByRole("button", { name: "Resolva o item 04" });
    expect(button).toBeDisabled();
    expect(screen.queryByText("Confirmar")).toBeNull();
    expect(StyleSheet.flatten(button.props.style).backgroundColor).toBe(theme.color.disabledBg);
    expect(StyleSheet.flatten(screen.getByText("Resolva o item 04").props.style).color).toBe(
      theme.color.disabledText,
    );

    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("disabledReason vazio não desabilita", async () => {
    await render(<Button title="Confirmar" disabledReason="" onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeEnabled();
  });

  it("disabled sem motivo mantém o título", async () => {
    await render(<Button title="Salvar" disabled onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("busy desabilita e marca o estado ocupado", async () => {
    await render(<Button title="Salvar" busy onPress={() => {}} />);
    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).toBeDisabled();
    expect(button).toBeBusy();
  });

  it("habilitado chama onPress", async () => {
    const onPress = jest.fn();
    await render(<Button title="Entrar" onPress={onPress} />);
    await userEvent.setup().press(screen.getByRole("button", { name: "Entrar" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("Field", () => {
  it("rótulo mono 12 maiúsculo e input com borda 3, altura 52, fonte body 16", async () => {
    await render(<Field label="E-mail" value="" onChangeText={() => {}} />);

    const label = StyleSheet.flatten(screen.getByText("E-mail").props.style);
    expect(label.fontFamily).toBe(theme.font.mono);
    expect(label.fontSize).toBe(12);
    expect(label.textTransform).toBe("uppercase");

    const input = StyleSheet.flatten(screen.getByLabelText("E-mail").props.style);
    expect(input.borderWidth).toBe(3);
    expect(input.borderColor).toBe(theme.color.ink);
    expect(input.borderRadius).toBe(0);
    expect(input.height).toBe(52);
    expect(input.fontFamily).toBe(theme.font.body);
    expect(input.fontSize).toBe(16);
  });

  it("erro do campo aparece e pinta a borda de danger", async () => {
    await render(<Field label="Senha" value="" error="Senha é obrigatória" />);

    expect(screen.getByText("Senha é obrigatória")).toBeOnTheScreen();
    const input = StyleSheet.flatten(screen.getByLabelText("Senha").props.style);
    expect(input.borderColor).toBe(theme.color.danger);
  });
});

describe("ErrorMessage", () => {
  it("é um alerta com prefixo '!' e a mensagem como nome", async () => {
    const msg = "Falha ao carregar o dia";
    await render(<ErrorMessage>{msg}</ErrorMessage>);

    expect(screen.getByRole("alert", { name: "Falha ao carregar o dia" })).toBeOnTheScreen();
    expect(screen.getByText("!")).toBeOnTheScreen();
    expect(screen.getByText("Falha ao carregar o dia")).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByText("!").props.style).fontFamily).toBe(
      theme.font.monoBold,
    );
  });

  it.each([null, undefined, ""])("sem mensagem (%p) não renderiza nada", async (msg) => {
    await render(<ErrorMessage>{msg}</ErrorMessage>);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("TopBar", () => {
  it("com onBack mostra o botão Voltar e o título como cabeçalho", async () => {
    const onBack = jest.fn();
    await render(<TopBar title="Meta diária" onBack={onBack} />);

    expect(screen.getByRole("header", { name: "Meta diária" })).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("sem onBack não tem botão", async () => {
    await render(<TopBar title="Revisão" />);
    expect(screen.getByRole("header", { name: "Revisão" })).toBeOnTheScreen();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("SegmentedRow", () => {
  it("rádios com a marcada em accent e divisórias de 3 px", async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedRow label="Refeição" options={MEAL_OPTIONS} value="almoco" onChange={onChange} />,
    );

    const marcada = screen.getByRole("radio", { name: "Almoço", checked: true });
    expect(StyleSheet.flatten(marcada.props.style).backgroundColor).toBe(theme.color.accent);

    const primeira = screen.getByRole("radio", { name: "Café da manhã" });
    expect(StyleSheet.flatten(primeira.props.style).borderLeftWidth).toBeUndefined();
    const jantar = screen.getByRole("radio", { name: "Jantar", checked: false });
    expect(StyleSheet.flatten(jantar.props.style).borderLeftWidth).toBe(3);

    const texto = StyleSheet.flatten(screen.getByText("Jantar").props.style);
    expect(texto.fontFamily).toBe(theme.font.mono);
    expect(texto.fontSize).toBe(13);
    expect(texto.textTransform).toBe("uppercase");

    await userEvent.setup().press(jantar);
    expect(onChange).toHaveBeenCalledWith("jantar");
  });

  it("desabilitado: rádios desabilitados e sem onChange", async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedRow
        label="Refeição"
        options={MEAL_OPTIONS}
        value={null}
        onChange={onChange}
        disabled
      />,
    );

    const jantar = screen.getByRole("radio", { name: "Jantar", checked: false });
    expect(jantar).toBeDisabled();
    await userEvent.setup().press(jantar);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Logo", () => {
  it("renderiza com o tamanho pedido e nome acessível", async () => {
    await render(<Logo size={48} />);
    const logo = screen.getByLabelText("kcal-lorimeter");
    expect(logo).toBeOnTheScreen();
  });
});
