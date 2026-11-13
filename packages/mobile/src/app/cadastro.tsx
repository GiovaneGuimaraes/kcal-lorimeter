import { RegisterBodySchema } from "@kcal/shared";
import { router } from "expo-router";
import { useState } from "react";
import { errorMessage } from "../api/client";
import { AuthActions, AuthScreen } from "../auth/auth-screen";
import { useSession } from "../auth/session";
import { ErrorMessage, Field } from "../ui/components";
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
    <AuthScreen titulo={["Cria sua", "conta."]}>
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
      <AuthActions
        primary={{ title: "Criar conta", onPress: cadastrar, busy: enviando }}
        secondary={{
          title: "Já tenho conta",
          disabled: enviando,
          onPress: () => (router.canGoBack() ? router.back() : router.replace("/login")),
        }}
      />
    </AuthScreen>
  );
}
