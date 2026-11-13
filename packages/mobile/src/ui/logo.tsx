import Svg, { Path, Rect } from "react-native-svg";
import { theme } from "./theme";

/**
 * Logo provisória "K falado" (docs/HANDOFF-DESIGN-D.md § 2.5): quadrado preto, K amarelo e duas
 * ondas de som brancas. A logo final ainda é decisão do humano.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      accessible
      accessibilityRole="image"
      accessibilityLabel="kcal-lorimeter"
    >
      <Rect width={32} height={32} fill={theme.color.ink} />
      <Path
        d="M8 7v18M8 17l9-10M11 14l7 11"
        stroke={theme.color.accent}
        strokeWidth={3.2}
        strokeLinecap="square"
        fill="none"
      />
      <Path
        d="M22 12a6 6 0 0 1 0 8M25.5 9a10 10 0 0 1 0 14"
        stroke={theme.color.onInk}
        strokeWidth={2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
