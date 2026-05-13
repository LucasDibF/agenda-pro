// ─── Shell da área autenticada: tabs, tema, notificações ─────────────────────

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { AppTab, ThemeMode } from "../types";
import { APP_THEMES, APP_VERSION, tabs } from "../constants/theme";
import { ensureProfessionalProfile } from "../utils";
import { styles } from "../styles";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { DashboardScreen } from "./DashboardScreen";
import { ServicesScreen } from "./ServicesScreen";
import { AgendaScreen } from "./AgendaScreen";
import { AvailabilityScreen } from "./AvailabilityScreen";
import { BlockedTimesScreen } from "./BlockedTimesScreen";

type ProfessionalAreaProps = {
  session: Session;
};

export function ProfessionalArea({ session }: ProfessionalAreaProps) {
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [dashboardRefreshSignal, setDashboardRefreshSignal] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const tabTransition = useRef(new Animated.Value(1)).current;
  const theme = APP_THEMES[themeMode];

  const userName =
    session.user.user_metadata?.full_name || session.user.email || "Profissional";
  const userFirstName = String(userName).split(" ")[0];

  // ── Garante que o perfil existe no banco ──────────────────────────────────
  useEffect(() => {
    const prepareProfile = async () => {
      setProfileLoading(true);
      setProfileError("");
      const error = await ensureProfessionalProfile(session.user);
      if (error) setProfileError(error.message);
      setProfileLoading(false);
    };

    prepareProfile();
  }, [session.user]);

  // ── Configura push notifications ──────────────────────────────────────────
  useEffect(() => {
    const setupNotifications = async () => {
      if (Platform.OS === "web") return;
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      if (current.status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    };

    const registerPushToken = async () => {
      if (Platform.OS === "web") return;
      const permission = await Notifications.getPermissionsAsync();
      const status = permission.granted
        ? "granted"
        : (await Notifications.requestPermissionsAsync()).status;

      if (status !== "granted") return;

      try {
        const tokenResult = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
        });
        const token = tokenResult.data;
        if (!token) return;

        const { error } = await supabase
          .from("profiles")
          .update({ push_token: token })
          .eq("id", session.user.id);

        if (error) console.warn("Falha ao salvar push token:", error.message);
      } catch (error) {
        console.warn("Falha ao registrar push token:", error);
      }
    };

    setupNotifications();
    registerPushToken();
  }, [session.user.id]);

  // ── Animação de transição entre tabs ─────────────────────────────────────
  useEffect(() => {
    tabTransition.setValue(0);
    const animation = Animated.timing(tabTransition, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [activeTab, tabTransition]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={[styles.dashboardContainer, { backgroundColor: theme.background }]}>
      <AnimatedBackground mode={themeMode} />
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <View style={[styles.topHeader, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.brand, { color: theme.accent }]}>{`v${APP_VERSION}`}</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Agenda Online</Text>
        </View>
        <View style={styles.headerButtonsRow}>
          <Pressable
            onPress={() => setDashboardRefreshSignal((current) => current + 1)}
            style={({ pressed }) => [
              styles.themeToggleButton,
              { borderColor: theme.border, backgroundColor: theme.card },
              pressed && styles.pressableShrink,
            ]}
          >
            <Text style={[styles.themeToggleButtonText, { color: theme.textPrimary }]}>
              ↻ Atualizar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setThemeMode((current) => (current === "dark" ? "light" : "dark"))}
            style={({ pressed }) => [
              styles.themeToggleButton,
              { borderColor: theme.border, backgroundColor: theme.card },
              pressed && styles.pressableShrink,
            ]}
          >
            <Text style={[styles.themeToggleButtonText, { color: theme.textPrimary }]}>
              {themeMode === "dark" ? "◐ Claro" : "◐ Escuro"}
            </Text>
          </Pressable>
        </View>
      </View>

      {profileLoading ? (
        <View style={styles.loadingListContainer}>
          <ActivityIndicator />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Preparando sua área...
          </Text>
        </View>
      ) : profileError ? (
        <Text style={styles.errorBanner}>{profileError}</Text>
      ) : (
        <View style={styles.mainContent}>
          {/* ── Barra de tabs ─────────────────────────────────────────────── */}
          <View
            style={[styles.tabsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              persistentScrollbar={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabsRow}
            >
              {tabs.map((tab) => {
                const selected = activeTab === tab.value;
                return (
                  <Pressable
                    key={tab.value}
                    onPress={() => setActiveTab(tab.value)}
                    style={({ pressed }) => [
                      styles.tabButton,
                      {
                        borderColor: theme.border,
                        backgroundColor: selected ? theme.tabSelectedBg : theme.tabBg,
                      },
                      pressed && styles.pressableShrink,
                    ]}
                  >
                    <Text
                      allowFontScaling={false}
                      style={[
                        styles.tabButtonText,
                        { color: selected ? theme.tabSelectedText : theme.tabText },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Conteúdo da tab ativa ──────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.contentScroll,
              {
                opacity: tabTransition,
                transform: [
                  {
                    translateY: tabTransition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.dashboardScrollContent}
              showsVerticalScrollIndicator={false}
              persistentScrollbar={false}
              scrollEventThrottle={16}
            >
              {activeTab === "dashboard" ? (
                <DashboardScreen
                  professionalId={session.user.id}
                  onOpenAgenda={() => setActiveTab("agenda")}
                  theme={theme}
                  displayName={userFirstName}
                  refreshSignal={dashboardRefreshSignal}
                />
              ) : null}
              {activeTab === "services" ? (
                <ServicesScreen professionalId={session.user.id} theme={theme} />
              ) : null}
              {activeTab === "agenda" ? (
                <AgendaScreen professionalId={session.user.id} theme={theme} />
              ) : null}
              {activeTab === "availability" ? (
                <AvailabilityScreen professionalId={session.user.id} theme={theme} />
              ) : null}
              {activeTab === "blocked" ? (
                <BlockedTimesScreen professionalId={session.user.id} theme={theme} />
              ) : null}

              <Pressable
                onPress={handleSignOut}
                style={[
                  styles.button,
                  styles.secondaryButton,
                  { backgroundColor: theme.buttonPrimary, borderColor: theme.border },
                ]}
              >
                <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>Sair</Text>
              </Pressable>
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}
