import { formatMacros } from "@kcal/nutrition-core";
import { CreateFoodSchema, type FoodDto } from "@kcal/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";
import { errorMessage } from "../api/client";
import { createFood, searchFoods } from "../api/review-entries";
import { SegmentedRow } from "../ui/choice";
import { Button, ErrorMessage, Field } from "../ui/components";
import { formatGrams } from "../ui/format";
import { textStyles, theme } from "../ui/theme";
import { fieldErrors } from "../ui/validation";
import {
  formatKcalMilhar,
  isLinePending,
  itemNumber,
  lineMacros,
  parseQuantidade,
  type ReviewLine,
  UNIT_LABELS,
  unitChoices,
  withFood,
  withQuantidade,
  withUnidade,
} from "./review-lines";

const c = theme.color;

type Painel = "trocar" | "buscar" | "cadastrar" | null;

type Props = {
  line: ReviewLine;
  index: number;
  /** Enquanto confirma: nada é editável. */
  locked: boolean;
  onChange(line: ReviewLine): void;
};

/** "256 kcal" (inteiro, com milhar) ou `null` se o item ainda não tem macros. */
function kcalText(line: ReviewLine): string | null {
  const m = lineMacros(line);
  return m ? `${formatKcalMilhar(formatMacros(m).kcal)} kcal` : null;
}

/** "1 un = 50 g" quando o alimento tem porção padrão. */
function porcaoText(food: FoodDto | null): string | null {
  if (!food?.porcaoPadraoG) return null;
  return `1 ${food.nomePorcao ?? "un"} = ${formatGrams(food.porcaoPadraoG)} g`;
}

/**
 * Um item da revisão (§ 2.4.7): número, alimento, kcal e quantidade. Sem alimento ou precisando do
 * peso, o item fica listrado com "BUSCAR | CADASTRAR | TIRAR". O alimento pode vir do casamento,
 * de um candidato, da busca ou de um cadastro.
 */
export function ReviewItemCard({ line, index, locked, onChange }: Props) {
  const [painel, setPainel] = useState<Painel>(null);
  const numero = itemNumber(index);

  if (line.removido) {
    return (
      <View style={styles.item}>
        <View style={styles.row}>
          <Text style={styles.num}>{numero}</Text>
          <Text style={[styles.mono, styles.faint, styles.flex]}>
            {`${line.food?.nome ?? line.extraido.alimento} — tirado`}
          </Text>
          <LinkButton
            label="desfazer"
            disabled={locked}
            onPress={() => onChange({ ...line, removido: false })}
          />
        </View>
      </View>
    );
  }

  if (line.salvo) {
    const kcal = kcalText(line);
    return (
      <View style={styles.item}>
        <View style={styles.row}>
          <Text style={styles.num}>{numero}</Text>
          <View style={styles.flex}>
            <Text style={styles.name}>{line.food?.nome ?? ""}</Text>
            <Text style={styles.mono}>
              {`${line.quantidade} ${UNIT_LABELS[line.unidade]}${kcal ? ` · ${kcal}` : ""}`}
            </Text>
          </View>
          <Text style={styles.saved}>Salvo</Text>
        </View>
      </View>
    );
  }

  function escolher(food: FoodDto) {
    onChange(withFood(line, food));
    setPainel(null);
  }

  function alternar(p: Exclude<Painel, null>) {
    setPainel(painel === p ? null : p);
  }

  const food = line.food;
  const quantidadeValida = parseQuantidade(line.quantidade) !== null;
  // Listrado: sem alimento, ou precisando do peso e ainda sem um peso válido. A árvore abaixo é a
  // mesma nos dois estados (o campo de quantidade não é remontado enquanto a pessoa digita).
  const listrado = !food || (line.precisaPeso && !quantidadeValida);
  const kcal = kcalText(line);
  const porcao = porcaoText(food);
  const unidades = unitChoices(line);
  const mostrarCandidatos = line.candidatos.length > 0 && (!food || painel === "trocar");
  const mostrarFaixa =
    listrado || painel === "trocar" || painel === "buscar" || painel === "cadastrar";

  let motivo: string | null = null;
  if (!food) {
    motivo = line.candidatos.length > 0 ? "qual destes?" : "não achei na base";
  } else if (listrado) {
    motivo = "diga o peso em gramas";
  } else if (isLinePending(line)) {
    motivo = "informe uma quantidade válida";
  }

  return (
    <View style={styles.item}>
      {listrado ? <Listras id={`listras-${index}`} /> : null}
      <View style={styles.row}>
        <Text style={styles.num}>{numero}</Text>
        <View style={styles.flex}>
          <Text style={listrado ? styles.pendenteTitle : styles.name}>
            {listrado ? `“${line.extraido.alimento}”?` : (food?.nome ?? "")}
          </Text>
          {motivo ? <Text style={[styles.mono, !listrado && styles.danger]}>{motivo}</Text> : null}
          {line.precisaPeso && listrado && food ? (
            <Text style={styles.mono}>
              {`${food.nome}: sem porção para "${UNIT_LABELS[line.extraido.unidade]}"`}
            </Text>
          ) : null}
          {kcal || porcao ? (
            <View style={styles.inline}>
              {kcal ? <Text style={[styles.mono, styles.monoBold]}>{kcal}</Text> : null}
              {porcao ? <Text style={[styles.mono, styles.muted]}>{porcao}</Text> : null}
            </View>
          ) : null}
          {listrado ? null : (
            <View style={styles.inline}>
              <LinkButton label="trocar" disabled={locked} onPress={() => alternar("trocar")} />
              <Text style={[styles.mono, styles.muted]}>·</Text>
              <LinkButton
                label="tirar"
                disabled={locked}
                onPress={() => onChange({ ...line, removido: true })}
              />
            </View>
          )}
        </View>
        {food ? (
          <View style={styles.qty}>
            <TextInput
              accessibilityLabel={
                line.precisaPeso
                  ? `Peso em gramas — item ${index + 1}`
                  : `Quantidade — item ${index + 1}`
              }
              value={line.quantidade}
              onChangeText={(q) => onChange(withQuantidade(line, q))}
              keyboardType="decimal-pad"
              editable={!locked}
              style={styles.qtyInput}
            />
            <Text style={styles.qtyUnit}>{UNIT_LABELS[line.unidade]}</Text>
          </View>
        ) : null}
      </View>

      {food && unidades.length > 1 ? (
        <SegmentedRow
          label={`Unidade — item ${index + 1}`}
          options={unidades.map((u) => ({ value: u, label: UNIT_LABELS[u] }))}
          value={line.unidade}
          disabled={locked}
          onChange={(u) => onChange(withUnidade(line, u))}
        />
      ) : null}

      {mostrarCandidatos ? (
        <View style={styles.wrap}>
          {line.candidatos.map((cand) => (
            <View key={cand.id} style={styles.candidato}>
              <Button
                title={cand.nome}
                variant="secondary"
                disabled={locked}
                onPress={() => escolher(cand)}
              />
            </View>
          ))}
        </View>
      ) : null}

      {mostrarFaixa ? (
        <View style={styles.faixa}>
          <View style={styles.faixaItem}>
            <Button title="BUSCAR" disabled={locked} onPress={() => alternar("buscar")} />
          </View>
          <View style={styles.faixaItem}>
            <Button
              title="CADASTRAR"
              variant="secondary"
              disabled={locked}
              onPress={() => alternar("cadastrar")}
            />
          </View>
          {listrado ? (
            <View style={styles.faixaItem}>
              <Button
                title="TIRAR"
                variant="secondary"
                disabled={locked}
                onPress={() => onChange({ ...line, removido: true })}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {painel === "buscar" ? (
        <BuscaAlimento inicial={line.extraido.alimento} onEscolher={escolher} />
      ) : null}
      {painel === "cadastrar" ? (
        <CadastroAlimento inicial={line.extraido.alimento} onCriado={escolher} />
      ) : null}
      <ErrorMessage>{line.erro}</ErrorMessage>
    </View>
  );
}

/** Link mono ("trocar", "tirar", "desfazer"): área de toque mínima, sem cor solta. */
function LinkButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={styles.link}
    >
      <Text style={[styles.mono, styles.linkText, disabled && styles.faint]}>{label}</Text>
    </Pressable>
  );
}

/** Fundo listrado a 45° (`warnStripe` sobre branco) do item pendente, com `react-native-svg`. */
function Listras({ id }: { id: string }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={id}
            patternUnits="userSpaceOnUse"
            width={16}
            height={16}
            patternTransform="rotate(45)"
          >
            <Rect x={0} y={0} width={8} height={16} fill={c.warnStripe} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

function BuscaAlimento({
  inicial,
  onEscolher,
}: {
  inicial: string;
  onEscolher(food: FoodDto): void;
}) {
  const [q, setQ] = useState(inicial);
  const [resultado, setResultado] = useState<FoodDto[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function buscar() {
    const termo = q.trim();
    if (!termo) {
      setErro("Digite o nome do alimento.");
      return;
    }
    setErro(null);
    setBuscando(true);
    try {
      setResultado(await searchFoods(termo));
    } catch (err) {
      setErro(errorMessage(err));
    } finally {
      setBuscando(false);
    }
  }

  return (
    <View style={styles.panel}>
      <Field label="Buscar alimento" value={q} onChangeText={setQ} autoCapitalize="none" />
      <Button title="Procurar" variant="secondary" onPress={buscar} busy={buscando} />
      <ErrorMessage>{erro}</ErrorMessage>
      {resultado && resultado.length === 0 ? (
        <Text style={[styles.mono, styles.muted]}>
          Nenhum alimento encontrado. Tente outro nome ou cadastre.
        </Text>
      ) : null}
      {resultado && resultado.length > 0 ? (
        <View style={styles.wrap}>
          {resultado.map((f) => (
            <View key={f.id} style={styles.candidato}>
              <Button title={f.nome} variant="secondary" onPress={() => onEscolher(f)} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Número digitado (vírgula ou ponto); vazio → `undefined` (o schema diz que é obrigatório). */
function numero(texto: string): number | undefined {
  const t = texto.trim().replace(",", ".");
  return t === "" ? undefined : Number(t);
}

function CadastroAlimento({
  inicial,
  onCriado,
}: {
  inicial: string;
  onCriado(food: FoodDto): void;
}) {
  const [nome, setNome] = useState(inicial);
  const [kcal, setKcal] = useState("");
  const [proteina, setProteina] = useState("");
  const [carbo, setCarbo] = useState("");
  const [gordura, setGordura] = useState("");
  const [porcao, setPorcao] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    const porcaoG = numero(porcao);
    const parsed = CreateFoodSchema.safeParse({
      nome,
      kcal100g: numero(kcal),
      proteina100g: numero(proteina),
      carbo100g: numero(carbo),
      gordura100g: numero(gordura),
      ...(porcaoG === undefined ? {} : { porcaoPadraoG: porcaoG }),
    });
    if (!parsed.success) {
      setErros(fieldErrors(parsed.error.issues));
      return;
    }
    setErros({});
    setSalvando(true);
    try {
      onCriado(await createFood(parsed.data));
    } catch (err) {
      setErro(errorMessage(err));
      setSalvando(false);
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.hint}>Valores por 100 g (veja o rótulo ou a tabela nutricional).</Text>
      <Field label="Nome do alimento" value={nome} onChangeText={setNome} error={erros.nome} />
      <Field
        label="Kcal por 100 g"
        value={kcal}
        onChangeText={setKcal}
        error={erros.kcal100g}
        keyboardType="decimal-pad"
      />
      <Field
        label="Proteína (g) por 100 g"
        value={proteina}
        onChangeText={setProteina}
        error={erros.proteina100g}
        keyboardType="decimal-pad"
      />
      <Field
        label="Carboidrato (g) por 100 g"
        value={carbo}
        onChangeText={setCarbo}
        error={erros.carbo100g}
        keyboardType="decimal-pad"
      />
      <Field
        label="Gordura (g) por 100 g"
        value={gordura}
        onChangeText={setGordura}
        error={erros.gordura100g}
        keyboardType="decimal-pad"
      />
      <Field
        label="Porção padrão em gramas (opcional)"
        value={porcao}
        onChangeText={setPorcao}
        error={erros.porcaoPadraoG}
        placeholder="Ex.: 30 para 1 scoop"
        keyboardType="decimal-pad"
      />
      <ErrorMessage>{erro}</ErrorMessage>
      <Button title="Salvar alimento" onPress={salvar} busy={salvando} />
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    gap: 12,
    paddingHorizontal: theme.space.page,
    paddingVertical: theme.space.row,
    borderBottomWidth: theme.border.medium,
    borderColor: c.ink,
    backgroundColor: c.paper,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  flex: { flex: 1, gap: 4 },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  num: { ...textStyles.label, fontSize: 13, color: c.ink, paddingTop: 3 },
  name: {
    fontFamily: theme.font.display,
    fontSize: 17,
    lineHeight: 21,
    textTransform: "uppercase",
    color: c.ink,
  },
  pendenteTitle: { ...textStyles.mealTitle, color: c.ink },
  mono: { ...textStyles.line, color: c.ink },
  monoBold: { fontFamily: theme.font.monoBold },
  muted: { color: c.textMuted },
  faint: { color: c.textFaint },
  danger: { color: c.danger },
  saved: { ...textStyles.label, fontFamily: theme.font.monoBold, color: c.ink, paddingTop: 3 },
  link: { minHeight: 28, justifyContent: "center" },
  linkText: { textDecorationLine: "underline" },
  qty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 52,
    paddingHorizontal: 10,
    borderWidth: theme.border.heavy,
    borderColor: c.ink,
    borderRadius: theme.radius,
    backgroundColor: c.paper,
  },
  qtyInput: {
    minWidth: 52,
    padding: 0,
    textAlign: "right",
    fontFamily: theme.font.monoBold,
    fontSize: 15,
    color: c.ink,
  },
  qtyUnit: { fontFamily: theme.font.mono, fontSize: 15, color: c.ink },
  candidato: { flexGrow: 1 },
  faixa: { flexDirection: "row", gap: 0 },
  faixaItem: { flex: 1, justifyContent: "center" },
  panel: {
    gap: 10,
    padding: 12,
    borderWidth: theme.border.heavy,
    borderColor: c.ink,
    borderRadius: theme.radius,
    backgroundColor: c.paper,
  },
  hint: { ...textStyles.body, color: c.textMuted },
});
