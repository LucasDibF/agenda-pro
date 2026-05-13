// ─── Ponto de entrada do app mobile ──────────────────────────────────────────
//
// Responsabilidade única: gerenciar estado de sessão e rotear entre
// LoginScreen (não autenticado) e ProfessionalArea (autenticado).
// Todo o restante do app está em src/screens/ e src/components/.

import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/lib/supabase";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ProfessionalArea } from "./src/screens/ProfessionalArea";
import { styles } from "./src/styles";

// Configura como notificações são exibidas quando o app está em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoadingSession(false);
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      {loadingSession ? (
        <SafeAreaView style={styles.loadingContainer}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Carregando sessão...</Text>
        </SafeAreaView>
      ) : !session ? (
        <LoginScreen />
      ) : (
        <ProfessionalArea session={session} />
      )}
    </SafeAreaProvider>
  );
}
