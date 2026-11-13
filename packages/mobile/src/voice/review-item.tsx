import { CreateFoodSchema, type FoodDto } from "@kcal/shared";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { errorMessage } from "../api/client";
import { createFood, searchFoods } from "../api/review-entries";
import { Button, colors, ErrorMessage, Field } from "../ui/components";
import { fieldErrors } from "../ui/validation";
import { allowedUnits, lineLabel, type ReviewLine, UNIT_LABELS, withFood } from "./review-lines";

type ChipProps = { label: string; selected: boolean; onPress(): void; disabled?: boolean };

/** Opção selecionável (unidade, refeição). */
export function Chip({ label, selected, onPress, disabled }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.off]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

type Painel = "buscar" | "cadastrar" | null;

type Props = {
  line: ReviewLine;
  index: number;
  /** Enquanto confirma: nada é editável. */
  locked: boolean;
  onChange(line: ReviewLine): void;
};

/** Um item da revisão: alimento (casado, candidato, busca ou cadastro), quantidade e unidade. */
export function ReviewItemCard({ line, index, locked, onChange }: Props) {
  const [painel, setPainel] = useState<Painel>(null);
  const rotulo = lineLabel(line, index);
  const entendido = `"${line.extraido.alimento}" — ${line.extraido.quantidade} ${UNIT_LABELS[line.extraido.unidade]}`;

  if (line.removido) {
    return (
      <View style={[styles.card, styles.cardOff]}>
        <Text style={styles.muted}>{`${rotulo}: removido`}</Text>
        <Button
          title="Desfazer"
          variant="secondary"
          disabled={locked}
          onPress={() => onChange({ ...line, removido: false })}
        />
      </View>
    );
  }

  if (line.salvo) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{rotulo}</Text>
        <Text
          style={styles.text}
        >{`${line.food?.nome ?? ""} — ${line.quantidade} ${UNIT_LABELS[line.unidade]}`}</Text>
        <Text style={styles.saved}>Salvo</Text>
      </View>
    );
  }

  function escolher(food: FoodDto) {
    onChange(withFood(line, food));
    setPainel(null);
  }

  const unidades = allowedUnits(line.food);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{rotulo}</Text>
      <Text style={styles.muted}>{`Entendi: ${entendido}`}</Text>

      {line.food ? (
        <Text style={styles.text}>{`Alimento: ${line.food.nome}`}</Text>
      ) : line.candidatos.length > 0 ? (
        <Text style={styles.text}>Qual destes?</Text>
      ) : (
        <Text style={styles.text}>Não achei este alimento. Busque ou cadastre.</Text>
      )}

      {line.candidatos.length > 0 ? (
        <View style={styles.row}>
          {line.candidatos.map((c) => (
            <Chip
              key={c.id}
              label={c.nome}
              selected={line.food?.id === c.id}
              disabled={locked}
              onPress={() => escolher(c)}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.row}>
        <Chip
          label="Buscar"
          selected={painel === "buscar"}
          disabled={locked}
          onPress={() => setPainel(painel === "buscar" ? null : "buscar")}
        />
        <Chip
          label="Cadastrar"
          selected={painel === "cadastrar"}
          disabled={locked}
          onPress={() => setPainel(painel === "cadastrar" ? null : "cadastrar")}
        />
        <Chip
          label="Remover"
          selected={false}
          disabled={locked}
          onPress={() => onChange({ ...line, removido: true })}
        />
      </View>

      {painel === "buscar" ? (
        <BuscaAlimento inicial={line.extraido.alimento} onEscolher={escolher} />
      ) : null}
      {painel === "cadastrar" ? (
        <CadastroAlimento inicial={line.extraido.alimento} onCriado={escolher} />
      ) : null}

      {line.precisaPeso ? (
        <Text style={styles.text}>
          {`${line.food?.nome ?? "Este alimento"} não tem porção padrão para "${UNIT_LABELS[line.extraido.unidade]}": informe o peso em gramas.`}
        </Text>
      ) : null}
      <Field
        label={
          line.precisaPeso ? `Peso em gramas — item ${index + 1}` : `Quantidade — item ${index + 1}`
        }
        value={line.quantidade}
        onChangeText={(quantidade) => onChange({ ...line, quantidade, erro: null })}
        keyboardType="decimal-pad"
        editable={!locked}
      />
      <View style={styles.row}>
        {unidades.map((u) => (
          <Chip
            key={u}
            label={UNIT_LABELS[u]}
            selected={line.unidade === u}
            disabled={locked}
            onPress={() => onChange({ ...line, unidade: u, erro: null })}
          />
        ))}
      </View>
      <ErrorMessage>{line.erro}</ErrorMessage>
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
        <Text style={styles.muted}>Nenhum alimento encontrado. Tente outro nome ou cadastre.</Text>
      ) : null}
      {resultado && resultado.length > 0 ? (
        <View style={styles.row}>
          {resultado.map((f) => (
            <Chip key={f.id} label={f.nome} selected={false} onPress={() => onEscolher(f)} />
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
      <Text style={styles.muted}>Valores por 100 g (veja o rótulo ou a tabela nutricional).</Text>
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
  card: { gap: 10, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  cardOff: { opacity: 0.7 },
  panel: { gap: 10, padding: 12, borderRadius: 8, backgroundColor: "#F4F6F5" },
  title: { fontSize: 17, fontWeight: "600", color: colors.text },
  text: { fontSize: 16, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  saved: { fontSize: 15, fontWeight: "600", color: colors.primary },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 15, color: colors.primary },
  chipTextSelected: { color: colors.primaryText },
  off: { opacity: 0.5 },
});
