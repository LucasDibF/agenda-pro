// ─── Recuperação de senha ─────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { APP_VERSION } from "../constants/theme";
import { friendlySupabaseMessage } from "../utils";
import { getPasswordResetRedirectUrl } from "../utils/auth-url";
import { styles } from "../styles";

type ForgotPasswordScreenProps = {
  initialEmail?: string;
  onBack: () => void;
};

export function ForgotPasswordScreen({ initialEmail = "", onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const canSubmit = useMemo(() => email.trim() !== "", [email]);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");

    const trimmed = email.trim();
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: getPasswordResetRedirectUrl(),
    });

    if (error) {
      setErrorMessage(friendlySupabaseMessage(error.message));
      setLoading(false);
      return;
    }

    setInfoMessage(
      "Se existir uma conta com este email, enviamos um link para redefinir a senha. Verifique a caixa de entrada e o spam.",
    );
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <AnimatedBackground mode="light" />
      <View style={styles.authCard}>
        <Text style={styles.brand}>{`v${APP_VERSION}`}</Text>
        <Text style={styles.title}>Esqueci minha senha</Text>
        <Text style={styles.subtitle}>
          Informe o email da profissional. Enviaremos um link para criar uma nova senha.
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Email"
          style={styles.input}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {infoMessage ? <Text style={styles.successBanner}>{infoMessage}</Text> : null}

        <Pressable
          onPress={handleSubmit}
          disabled={loading || !canSubmit}
          style={[styles.button, (loading || !canSubmit) && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? "Enviando..." : "Enviar link de recuperacao"}
          </Text>
        </Pressable>

        <Pressable onPress={onBack} style={styles.authLinkPressable}>
          <Text style={styles.authLink}>Voltar ao login</Text>
        </Pressable>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}
