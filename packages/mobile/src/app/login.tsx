import { LoginBodySchema } from "@kcal/shared";
import { router } from "expo-router";
import { useState } from "react";
import { errorMessage } from "../api/client";
import { AuthActions, AuthScreen } from "../auth/auth-screen";
import { useSession } from "../auth/session";
import { ErrorMessage, Field } from "../ui/components";
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
    <AuthScreen titulo={["Fala", "que a", "gente", "conta."]}>
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
      <AuthActions
        primary={{ title: "Entrar", onPress: entrar, busy: enviando }}
        secondary={{
          title: "Criar conta",
          disabled: enviando,
          onPress: () => router.push("/cadastro"),
        }}
      />
    </AuthScreen>
  );
}
