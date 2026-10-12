// ─── Nova senha após link de recuperação ─────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { friendlySupabaseMessage } from "../utils";
import { validatePassword } from "../utils/password";
import { styles } from "../styles";

type ResetPasswordScreenProps = {
  onBackToForgot: () => void;
  onSuccess: () => void;
};

export function ResetPasswordScreen({ onBackToForgot, onSuccess }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(
    () => password.trim() !== "" && confirmPassword.trim() !== "",
    [password, confirmPassword],
  );

  useEffect(() => {
    let mounted = true;

    const verifyRecoverySession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error || !data.session) {
        setCanReset(false);
        setCheckingSession(false);
        return;
      }

      setCanReset(true);
      setCheckingSession(false);
    };

    void verifyRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setCanReset(true);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("As senhas nao coincidem.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(friendlySupabaseMessage(error.message));
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    onSuccess();
  };

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Validando link de recuperacao...</Text>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  if (!canReset) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <AnimatedBackground mode="light" />
        <View style={styles.authCard}>
          <Text style={styles.brand}>Lillo</Text>
          <Text style={styles.title}>Link invalido ou expirado</Text>
          <Text style={styles.subtitle}>Solicite um novo link de recuperacao de senha.</Text>

          <Pressable onPress={onBackToForgot} style={styles.button}>
            <Text style={styles.buttonText}>Solicitar novo link</Text>
          </Pressable>
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.authContainer}>
      <AnimatedBackground mode="light" />
      <View style={styles.authCard}>
        <Text style={styles.brand}>Lillo</Text>
        <Text style={styles.title}>Nova senha</Text>
        <Text style={styles.subtitle}>
          Escolha uma senha forte para acessar o painel da profissional.
        </Text>

        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Nova senha (min. 8 caracteres)"
          style={styles.input}
        />
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Confirmar nova senha"
          style={styles.input}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          onPress={handleSubmit}
          disabled={loading || !canSubmit}
          style={[styles.button, (loading || !canSubmit) && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{loading ? "Salvando..." : "Salvar nova senha"}</Text>
        </Pressable>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}
