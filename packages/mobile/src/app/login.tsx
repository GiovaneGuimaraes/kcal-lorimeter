import { LoginBodySchema } from "@kcal/shared";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { errorMessage } from "../api/client";
import { useSession } from "../auth/session";
import { Button, colors, ErrorMessage, Field } from "../ui/components";
import { fieldErrors } from "../ui/validation";

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setErro(null);
    const parsed = LoginBodySchema.safeParse({ email, senha });
    if (!parsed.success) {
      setErros(fieldErrors(parsed.error.issues));
      return;
    }
    setErros({});
    setEnviando(true);
    try {
      await signIn(parsed.data);
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
            Entrar
          </Text>
          <Text style={styles.subtitle}>kcal-lorimeter: diga o que comeu, a gente conta.</Text>
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
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
          />
          <ErrorMessage>{erro}</ErrorMessage>
          <Button title="Entrar" onPress={entrar} busy={enviando} />
          <Button
            title="Criar conta"
            variant="secondary"
            disabled={enviando}
            onPress={() => router.push("/cadastro")}
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
  subtitle: { fontSize: 16, color: colors.muted },
});
