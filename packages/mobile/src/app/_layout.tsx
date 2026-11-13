import { Archivo_500Medium } from "@expo-google-fonts/archivo/500Medium";
import { Archivo_700Bold } from "@expo-google-fonts/archivo/700Bold";
import { Archivo_900Black } from "@expo-google-fonts/archivo/900Black";
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono/400Regular";
import { IBMPlexMono_600SemiBold } from "@expo-google-fonts/ibm-plex-mono/600SemiBold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SessionProvider, useSession } from "../auth/session";
import { theme } from "../ui/theme";
import { ReviewProvider } from "../voice/review-store";

/** Só os pesos usados em `theme.font` (import por peso para não empacotar a família inteira). */
const FONTS = {
  Archivo_900Black,
  Archivo_700Bold,
  Archivo_500Medium,
  IBMPlexMono_400Regular,
  IBMPlexMono_600SemiBold,
};

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
 * Enquanto a sessão ou as fontes carregam, mostra o indicador de carregamento. Se a fonte falhar,
 * segue com a fonte do sistema em vez de travar o app.
 */
function RootNavigator() {
  const { status } = useSession();
  const [fontsLoaded, fontError] = useFonts(FONTS);

  if (status === "loading" || (!fontsLoaded && !fontError)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.color.ink} />
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
    backgroundColor: theme.color.paper,
  },
});
