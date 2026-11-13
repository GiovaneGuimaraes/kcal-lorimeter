import { RegisterBodySchema } from "@kcal/shared";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { errorMessage } from "../api/client";
import { useSession } from "../auth/session";
import { Button, colors, ErrorMessage, Field } from "../ui/components";
import { fieldErrors } from "../ui/validation";

export default function CadastroScreen() {
  const { signUp } = useSession();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function cadastrar() {
    setErro(null);
    const parsed = RegisterBodySchema.safeParse({ nome, email, senha });
    if (!parsed.success) {
      setErros(fieldErrors(parsed.error.issues));
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      await signUp(parsed.data);
      router.replace("/");
    } catch (err) {
      setErro(errorMessage(err));
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>
            Criar conta
          </Text>
          <Field
            label="Nome"
            value={nome}
            onChangeText={setNome}
            error={erros.nome}
            autoComplete="name"
            textContentType="name"
          />
          <Field
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            error={erros.email}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Field
            label="Senha"
            value={senha}
            onChangeText={setSenha}
            error={erros.senha}
            placeholder="Pelo menos 8 caracteres"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <ErrorMessage>{erro}</ErrorMessage>
          <Button title="Criar conta" onPress={cadastrar} busy={enviando} />
          <Button
            title="Já tenho conta"
            variant="secondary"
            disabled={enviando}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
});
