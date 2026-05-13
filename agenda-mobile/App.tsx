// ─── Ponto de entrada do app mobile ──────────────────────────────────────────

import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/lib/supabase";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ProfessionalArea } from "./src/screens/ProfessionalArea";
import { styles } from "./src/styles";

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

  useEffect(() => {
    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
      }
    );

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

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

  return (
    <SafeAreaProvider>
      {!session ? (
        <LoginScreen />
      ) : (
        <ProfessionalArea session={session} />
      )}
    </SafeAreaProvider>
  );
}
