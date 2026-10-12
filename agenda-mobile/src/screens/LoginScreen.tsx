// ─── Tela de login ────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { friendlySupabaseMessage } from "../utils";
import { styles } from "../styles";

type LoginScreenProps = {
  onForgotPassword: (email: string) => void;
};

export function LoginScreen({ onForgotPassword }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(
    () => email.trim() !== "" && password.trim() !== "",
    [email, password]
  );

  const handleLogin = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(friendlySupabaseMessage(error.message));
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <AnimatedBackground mode="light" />
      <View style={styles.authCard}>
        <Text style={styles.brand}>Lillo</Text>
        <Text style={styles.title}>Entrar no painel</Text>
        <Text style={styles.subtitle}>Use o mesmo login da versão web.</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Email"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Senha"
          style={styles.input}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          onPress={handleLogin}
          disabled={loading || !canSubmit}
          style={[styles.button, (loading || !canSubmit) && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>{loading ? "Entrando..." : "Entrar"}</Text>
        </Pressable>

        <Pressable onPress={() => onForgotPassword(email.trim())} style={styles.authLinkPressable}>
          <Text style={styles.authLink}>Esqueci minha senha</Text>
        </Pressable>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}
