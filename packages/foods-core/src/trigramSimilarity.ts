/**
 * Similaridade de Dice entre os conjuntos de trigramas de dois textos (já normalizados), em [0, 1].
 * Trigramas por palavra, com a palavra cercada por dois espaços à esquerda e um à direita (como o
 * `pg_trgm`): "ovo" → {"  o", " ov", "ovo", "vo "}. Isso dá peso ao começo da palavra e permite
 * comparar palavras curtas.
 *
 * Dice = 2·|A ∩ B| / (|A| + |B|). Dois textos vazios → 0 (não há o que comparar).
 */
export function trigramSimilarity(a: string, b: string): number {
  const ta = trigramas(a);
  const tb = trigramas(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let comuns = 0;
  for (const t of ta) if (tb.has(t)) comuns++;
  return (2 * comuns) / (ta.size + tb.size);
}

function trigramas(texto: string): Set<string> {
  const out = new Set<string>();
  for (const palavra of texto.split(" ")) {
    if (palavra.length === 0) continue;
    const p = `  ${palavra} `;
    for (let i = 0; i + 3 <= p.length; i++) out.add(p.slice(i, i + 3));
  }
  return out;
}
