import {
  type AuthResponse,
  AuthResponseSchema,
  type LoginBody,
  type PublicUser,
  type RegisterBody,
} from "@kcal/shared";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as authApi from "../api/auth";
import { setAuthToken, setOnUnauthorized } from "../api/client";

/** Chave no `expo-secure-store` (só letras, números, `.`, `-` e `_`). Guarda `{ token, user }`. */
export const SESSION_STORAGE_KEY = "kcal.session";

export type SessionStatus = "loading" | "signedOut" | "signedIn";

type SessionContextValue = {
  status: SessionStatus;
  token: string | null;
  user: PublicUser | null;
  signIn(body: LoginBody): Promise<void>;
  signUp(body: RegisterBody): Promise<void>;
  signOut(): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Sessão da pessoa: carrega `{ token, user }` do `expo-secure-store` no boot, salva no login e no
 * cadastro, apaga no `signOut` e quando a API responde 401 numa requisição autenticada
 * (token expirado: o JWT vale 30 dias e não tem refresh).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [session, setSession] = useState<AuthResponse | null>(null);

  const apply = useCallback((next: AuthResponse | null) => {
    setAuthToken(next?.token ?? null);
    setSession(next);
    setStatus(next ? "signedIn" : "signedOut");
  }, []);

  const signOut = useCallback(async () => {
    apply(null);
    try {
      await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
    } catch {
      // Sem armazenamento seguro disponível: a sessão já saiu da memória.
    }
  }, [apply]);

  useEffect(() => {
    let active = true;
    (async () => {
      let stored: AuthResponse | null = null;
      try {
        const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = AuthResponseSchema.safeParse(JSON.parse(raw));
          if (parsed.success) stored = parsed.data;
        }
      } catch {
        stored = null;
      }
      if (active) apply(stored);
    })();
    return () => {
      active = false;
    };
  }, [apply]);

  useEffect(() => {
    setOnUnauthorized(() => {
      void signOut();
    });
    return () => setOnUnauthorized(null);
  }, [signOut]);

  const persist = useCallback(
    async (auth: AuthResponse) => {
      await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(auth));
      apply(auth);
    },
    [apply],
  );

  const signIn = useCallback(
    async (body: LoginBody) => persist(await authApi.login(body)),
    [persist],
  );
  const signUp = useCallback(
    async (body: RegisterBody) => persist(await authApi.register(body)),
    [persist],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      token: session?.token ?? null,
      user: session?.user ?? null,
      signIn,
      signUp,
      signOut,
    }),
    [status, session, signIn, signUp, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession precisa estar dentro de <SessionProvider>");
  return ctx;
}
