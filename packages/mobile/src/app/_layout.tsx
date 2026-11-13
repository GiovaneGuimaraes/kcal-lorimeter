import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SessionProvider, useSession } from "../auth/session";
import { colors } from "../ui/components";
import { ReviewProvider } from "../voice/review-store";

export default function RootLayout() {
  return (
    <SessionProvider>
      <ReviewProvider>
        <RootNavigator />
      </ReviewProvider>
    </SessionProvider>
  );
}

/**
 * Gate de autenticação com `Stack.Protected`: sem sessão só `login`/`cadastro` existem (qualquer
 * outra rota redireciona para a primeira disponível, `login`); com sessão, o contrário.
 */
function RootNavigator() {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const signedIn = status === "signedIn";
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen name="revisao" options={{ headerShown: true, title: "Revisão" }} />
        <Stack.Screen name="meta" options={{ headerShown: true, title: "Meta diária" }} />
        <Stack.Screen
          name="lancamento"
          options={{ headerShown: true, title: "Lançar manualmente" }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" />
        <Stack.Screen name="cadastro" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
