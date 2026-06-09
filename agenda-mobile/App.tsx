// ─── Ponto de entrada do app mobile ──────────────────────────────────────────

import { useCallback, useEffect, useState } from "react";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/lib/supabase";
import { ForgotPasswordScreen } from "./src/screens/ForgotPasswordScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ProfessionalArea } from "./src/screens/ProfessionalArea";
import { ResetPasswordScreen } from "./src/screens/ResetPasswordScreen";
import { handleAuthDeepLink } from "./src/utils/auth-deep-link";
import { styles } from "./src/styles";

type AuthView = "login" | "forgot" | "reset";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Timeout para evitar tela de loading presa indefinidamente
const getSessionWithTimeout = () =>
  Promise.race([
    supabase.auth.getSession(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 10_000)
    ),
  ]);

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [authView, setAuthView] = useState<AuthView>("login");
  const [awaitingPasswordReset, setAwaitingPasswordReset] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");

  const loadSession = async () => {
    setLoadingSession(true);
    setSessionError(false);
    try {
      const { data } = await getSessionWithTimeout();
      setSession(data.session);
    } catch {
      setSessionError(true);
    } finally {
      setLoadingSession(false);
    }
  };

  const processIncomingUrl = useCallback(async (url: string | null) => {
    if (!url || !url.includes("auth/callback")) return;

    const ok = await handleAuthDeepLink(url);
    if (ok) {
      setAwaitingPasswordReset(true);
      setAuthView("reset");
    }
  }, []);

  useEffect(() => {
    loadSession();

    void Linking.getInitialURL().then(processIncomingUrl);

    const linkSubscription = Linking.addEventListener("url", ({ url }) => {
      void processIncomingUrl(url);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (event === "PASSWORD_RECOVERY") {
          setAwaitingPasswordReset(true);
          setAuthView("reset");
        }
        setSession(currentSession);
      }
    );

    return () => {
      linkSubscription.remove();
      authListener.subscription.unsubscribe();
    };
  }, [processIncomingUrl]);

  if (loadingSession) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Carregando sessão...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (sessionError) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { marginBottom: 12 }]}>
            Sem conexão. Verifique sua internet.
          </Text>
          <Pressable onPress={loadSession} style={styles.button}>
            <Text style={styles.buttonText}>Tentar novamente</Text>
          </Pressable>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (awaitingPasswordReset || authView === "reset") {
    return (
      <SafeAreaProvider>
        <ResetPasswordScreen
          onBackToForgot={() => {
            setAwaitingPasswordReset(false);
            setAuthView("forgot");
          }}
          onSuccess={() => {
            setAwaitingPasswordReset(false);
            setAuthView("login");
            setSession(null);
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {!session ? (
        authView === "forgot" ? (
          <ForgotPasswordScreen
            initialEmail={loginEmail}
            onBack={() => setAuthView("login")}
          />
        ) : (
          <LoginScreen
            onForgotPassword={(email) => {
              setLoginEmail(email);
              setAuthView("forgot");
            }}
          />
        )
      ) : (
        <ProfessionalArea session={session} />
      )}
    </SafeAreaProvider>
  );
}
