/**
 * Forma canônica de um nome de alimento para comparação (nunca para exibição):
 * - remove acentos (NFD + descarta as marcas combinantes: "ç" vira "c", "ã" vira "a");
 * - minúsculas;
 * - pontuação e hífen viram espaço ("batata-doce" → "batata doce"); espaços colapsados;
 * - singular simples por palavra (pt-BR): "ões"/"ães" → "ao"; "s" final cai quando a palavra tem
 *   mais de 3 letras e não termina em "ss" ("ovos" → "ovo", "pães" → "pao", "mais" → "mai").
 *
 * O singular é heurístico e pode errar ("lápis" → "lapi"); como os dois lados da comparação passam
 * pela mesma função, o erro se anula na maioria dos casos.
 */
export function normalizeFoodText(texto: string): string {
  const semAcento = texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const palavras = semAcento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((p) => p.length > 0);
  return palavras.map(singularizar).join(" ");
}

function singularizar(palavra: string): string {
  if (palavra.length <= 3) return palavra;
  if (palavra.endsWith("oes") || palavra.endsWith("aes")) return `${palavra.slice(0, -3)}ao`;
  if (palavra.endsWith("s") && !palavra.endsWith("ss")) return palavra.slice(0, -1);
  return palavra;
}
