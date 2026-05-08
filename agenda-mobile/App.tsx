import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./src/lib/supabase";

type AppointmentStatus = "agendado" | "confirmado" | "cancelado" | "concluido";
type AppTab = "dashboard" | "services" | "agenda" | "availability" | "blocked";
type ThemeMode = "light" | "dark";

type ThemeTokens = {
  background: string;
  card: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSoft: string;
  buttonPrimary: string;
  buttonPrimaryText: string;
  tabBg: string;
  tabText: string;
  tabSelectedBg: string;
  tabSelectedText: string;
};

type AppointmentRow = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  service: { name: string } | null;
};

type AppointmentSelectRow = Omit<AppointmentRow, "service"> & {
  service: Array<{ name: string }> | { name: string } | null;
};

type UpcomingAppointmentRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  status: AppointmentStatus;
  customer_name: string;
  service: { name: string } | null;
};

type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

type AvailabilityRow = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_interval_minutes: number;
  is_active: boolean;
};

type BlockedTimeRow = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

type DashboardAppointmentRow = {
  id: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  service: { name: string; price: number } | null;
};

type DashboardAppointmentSelectRow = {
  id: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  service: Array<{ name: string; price: number }> | { name: string; price: number } | null;
};

const tabs: Array<{ value: AppTab; label: string }> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "services", label: "Serviços" },
  { value: "agenda", label: "Agenda" },
  { value: "availability", label: "Disponibilidade" },
  { value: "blocked", label: "Bloqueios" },
];

const APP_THEMES: Record<ThemeMode, ThemeTokens> = {
  dark: {
    background: "#000000",
    card: "#12141A",
    border: "#2A2E3A",
    textPrimary: "#ECECF3",
    textSecondary: "#B7BDCC",
    accent: "#A78BFA",
    accentSoft: "#2A203D",
    buttonPrimary: "#8B5CF6",
    buttonPrimaryText: "#F7F5FF",
    tabBg: "#191C25",
    tabText: "#DCE0EB",
    tabSelectedBg: "#8B5CF6",
    tabSelectedText: "#FFFFFF",
  },
  light: {
    background: "#FFFFFF",
    card: "#F8F9FC",
    border: "#E5E7EE",
    textPrimary: "#1F2430",
    textSecondary: "#6E7380",
    accent: "#8B5CF6",
    accentSoft: "#EDE8FF",
    buttonPrimary: "#7C4DFF",
    buttonPrimaryText: "#FFFFFF",
    tabBg: "#F1F3F8",
    tabText: "#62697A",
    tabSelectedBg: "#8B5CF6",
    tabSelectedText: "#FFFFFF",
  },
};

const statusOptions: Array<{ value: AppointmentStatus; label: string }> = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "concluido", label: "Concluido" },
];

const toIsoDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatHour = (time: string) => time.slice(0, 5);
const formatMoneyBr = (value: number) => Number(value).toFixed(2).replace(".", ",");

const formatDateBr = (dateInput: string) => {
  const [year, month, day] = dateInput.split("-");
  return `${day}/${month}/${year}`;
};

const normalizeTime = (timeInput: string) => timeInput.slice(0, 5);

const combineDateAndTime = (dateInput: string, timeInput: string) =>
  new Date(`${dateInput}T${normalizeTime(timeInput)}:00`);

const hasOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => aStart < bEnd && bStart < aEnd;

const normalizePhoneForWhatsapp = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
};

const buildWhatsappUrlForAppointment = (appointment: AppointmentRow) => {
  const phone = normalizePhoneForWhatsapp(appointment.customer_phone);
  if (!phone) return null;

  const firstName =
    appointment.customer_name.trim().split(/\s+/).filter(Boolean)[0] || "cliente";
  const serviceName = appointment.service?.name ?? "serviço";
  const message = [
    `Olá ${firstName}!`,
    `Seu horário foi confirmado para ${formatDateBr(appointment.appointment_date)} às ${formatHour(appointment.start_time)}.`,
    `Serviço: ${serviceName}.`,
    "Qualquer dúvida, estou à disposição.",
  ].join(" ");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const formatDateTimeBr = (isoDateString: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDateString));
const webAppBaseUrl =
  process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() ||
  "https://lash-agenda-k66ipli1j-lucas-freitas-dibs-projects.vercel.app";
const APP_VERSION = "1.0.0";

const weekdayOptions: Array<{ value: number; label: string }> = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const toDateAndTimeInput = (date: Date) => {
  const datePart = toIsoDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return { date: datePart, time: `${hours}:${minutes}` };
};

const parseDateTimeInput = (dateInput: string, timeInput: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return null;
  if (!/^\d{2}:\d{2}$/.test(timeInput)) return null;
  const parsed = new Date(`${dateInput}T${timeInput}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const getDurationMinutes = (startTime: string, endTime: string) => {
  const [startHour, startMinute] = normalizeTime(startTime).split(":").map(Number);
  const [endHour, endMinute] = normalizeTime(endTime).split(":").map(Number);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  return Math.max(endTotal - startTotal, 1);
};

const ensureProfessionalProfile = async (user: User) => {
  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  const phone = typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null;

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    phone,
    role: "professional",
  });

  return error;
};

function AnimatedBackground({ mode }: { mode: ThemeMode | "light" }) {
  const motionA = useRef(new Animated.Value(0)).current;
  const motionB = useRef(new Animated.Value(0)).current;
  const motionC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animationA = Animated.loop(
      Animated.sequence([
        Animated.timing(motionA, {
          toValue: 1,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(motionA, {
          toValue: 0,
          duration: 9000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const animationB = Animated.loop(
      Animated.sequence([
        Animated.timing(motionB, {
          toValue: 1,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(motionB, {
          toValue: 0,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const animationC = Animated.loop(
      Animated.sequence([
        Animated.timing(motionC, {
          toValue: 1,
          duration: 7000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(motionC, {
          toValue: 0,
          duration: 7000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    animationA.start();
    animationB.start();
    animationC.start();

    return () => {
      animationA.stop();
      animationB.stop();
      animationC.stop();
    };
  }, [motionA, motionB, motionC]);

  const blobOneTranslateY = motionA.interpolate({
    inputRange: [0, 1],
    outputRange: [-32, 28],
  });
  const blobOneTranslateX = motionB.interpolate({
    inputRange: [0, 1],
    outputRange: [-22, 24],
  });
  const blobTwoTranslateY = motionB.interpolate({
    inputRange: [0, 1],
    outputRange: [26, -24],
  });
  const blobTwoTranslateX = motionA.interpolate({
    inputRange: [0, 1],
    outputRange: [20, -18],
  });
  const blobThreeTranslateY = motionC.interpolate({
    inputRange: [0, 1],
    outputRange: [22, -26],
  });
  const blobThreeTranslateX = motionC.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 20],
  });
  const blobScale = motionA.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.12],
  });
  const blobRotate = motionB.interpolate({
    inputRange: [0, 1],
    outputRange: ["-8deg", "8deg"],
  });
  const blobOpacity = motionC.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

  const isDark = mode === "dark";
  const blobOneColor = isDark ? "rgba(139,92,246,0.32)" : "rgba(139,92,246,0.24)";
  const blobTwoColor = isDark ? "rgba(167,139,250,0.28)" : "rgba(124,77,255,0.2)";
  const blobThreeColor = isDark ? "rgba(98,84,182,0.24)" : "rgba(173,157,255,0.2)";

  return (
    <View pointerEvents="none" style={styles.animatedBackgroundLayer}>
      <Animated.View
        style={[
          styles.animatedBlob,
          styles.animatedBlobOne,
          {
            backgroundColor: blobOneColor,
            opacity: blobOpacity,
            transform: [
              { translateX: blobOneTranslateX },
              { translateY: blobOneTranslateY },
              { scale: blobScale },
              { rotate: blobRotate },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.animatedBlob,
          styles.animatedBlobTwo,
          {
            backgroundColor: blobTwoColor,
            opacity: blobOpacity,
            transform: [{ translateX: blobTwoTranslateX }, { translateY: blobTwoTranslateY }, { rotate: blobRotate }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.animatedBlob,
          styles.animatedBlobThree,
          {
            backgroundColor: blobThreeColor,
            opacity: blobOpacity,
            transform: [{ translateX: blobThreeTranslateX }, { translateY: blobThreeTranslateY }, { scale: blobScale }],
          },
        ]}
      />
    </View>
  );
}

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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

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

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(() => email.trim() !== "" && password.trim() !== "", [email, password]);

  const handleLogin = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <AnimatedBackground mode="light" />
      <View style={styles.authCard}>
        <Text style={styles.brand}>{`v${APP_VERSION}`}</Text>
        <Text style={styles.title}>Entrar no painel mobile</Text>
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
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

function ProfessionalArea({ session }: { session: Session }) {
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [dashboardRefreshSignal, setDashboardRefreshSignal] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const theme = APP_THEMES[themeMode];

  const userName = session.user.user_metadata?.full_name || session.user.email || "Profissional";
  const userFirstName = String(userName).split(" ")[0];

  useEffect(() => {
    const prepareProfile = async () => {
      setProfileLoading(true);
      setProfileError("");
      const error = await ensureProfessionalProfile(session.user);
      if (error) {
        setProfileError(error.message);
      }
      setProfileLoading(false);
    };

    prepareProfile();
  }, [session.user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={[styles.dashboardContainer, { backgroundColor: theme.background }]}>
      <AnimatedBackground mode={themeMode} />
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      <View style={[styles.topHeader, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.brand, { color: theme.accent }]}>{`v${APP_VERSION}`}</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Agenda Online</Text>
        </View>
        <View style={styles.headerButtonsRow}>
          <Pressable
            onPress={() => setDashboardRefreshSignal((current) => current + 1)}
            style={[styles.themeToggleButton, { borderColor: theme.border, backgroundColor: theme.card }]}
          >
            <Text style={[styles.themeToggleButtonText, { color: theme.textPrimary }]}>↻ Atualizar</Text>
          </Pressable>
          <Pressable
            onPress={() => setThemeMode((current) => (current === "dark" ? "light" : "dark"))}
            style={[styles.themeToggleButton, { borderColor: theme.border, backgroundColor: theme.card }]}
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
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Preparando sua área...</Text>
        </View>
      ) : profileError ? (
        <Text style={styles.errorBanner}>{profileError}</Text>
      ) : (
        <View style={styles.mainContent}>
          <View style={[styles.tabsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
                    style={[
                      styles.tabButton,
                      {
                        borderColor: theme.border,
                        backgroundColor: selected ? theme.tabSelectedBg : theme.tabBg,
                      },
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

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.dashboardScrollContent}
            showsVerticalScrollIndicator={false}
            persistentScrollbar={false}
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
            {activeTab === "agenda" ? <AgendaScreen professionalId={session.user.id} theme={theme} /> : null}
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
        </View>
      )}
    </SafeAreaView>
  );
}

function DashboardScreen({
  professionalId,
  onOpenAgenda,
  theme,
  displayName,
  refreshSignal,
}: {
  professionalId: string;
  onOpenAgenda: () => void;
  theme: ThemeTokens;
  displayName: string;
  refreshSignal: number;
}) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeServicesCount, setActiveServicesCount] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState<DashboardAppointmentRow[]>([]);
  const [statusSummary, setStatusSummary] = useState({
    agendado: 0,
    confirmado: 0,
    concluido: 0,
    cancelado: 0,
  });
  const [copyFeedback, setCopyFeedback] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setErrorMessage("");

    const today = toIsoDate(new Date());
    const [servicesRes, todayRes] = await Promise.all([
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", professionalId)
        .eq("is_active", true),
      supabase
      .from("appointments")
      .select("id, customer_name, start_time, end_time, status, service:services(name, price)")
        .eq("professional_id", professionalId)
        .eq("appointment_date", today)
        .order("start_time", { ascending: true })
        .limit(30),
    ]);

    if (todayRes.error || servicesRes.error) {
      setErrorMessage(
        todayRes.error?.message ?? servicesRes.error?.message ?? "Erro ao carregar dashboard."
      );
      setLoading(false);
      return;
    }

    const normalizedToday = ((todayRes.data ?? []) as DashboardAppointmentSelectRow[]).map((row) => ({
      id: row.id,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status,
      customer_name: row.customer_name,
      service: Array.isArray(row.service) ? (row.service[0] ?? null) : row.service,
    }));

    setActiveServicesCount(servicesRes.count ?? 0);

    const summary = normalizedToday.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      {
        agendado: 0,
        confirmado: 0,
        concluido: 0,
        cancelado: 0,
      }
    );

    setStatusSummary(summary);
    setTodayAppointments(normalizedToday);
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, [professionalId, refreshSignal]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia!";
    if (hour < 18) return "Boa tarde!";
    return "Boa noite!";
  })();

  const longDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const firstAppointment = useMemo(() => {
    const now = new Date();
    return (
      todayAppointments.find((appointment) => {
        const activeStatus =
          appointment.status === "agendado" || appointment.status === "confirmado";
        if (!activeStatus) return false;
        return combineDateAndTime(toIsoDate(), appointment.end_time) > now;
      }) ?? null
    );
  }, [todayAppointments]);
  const bookingCode = professionalId;
  const bookingLink = `${webAppBaseUrl}/booking/${bookingCode}`;

  const handleCopyBookingCode = async () => {
    await Clipboard.setStringAsync(bookingCode);
    setCopyFeedback("Código copiado.");
  };

  const handleCopyBookingLink = async () => {
    await Clipboard.setStringAsync(bookingLink);
    setCopyFeedback("Link de agendamento copiado.");
  };

  return (
    <View style={styles.sectionContainer}>
      <View
        style={[
          styles.dashboardFeatureCard,
          { borderColor: theme.border, backgroundColor: theme.accent },
        ]}
      >
        <View>
          <Text style={[styles.dashboardFeatureGreeting, { color: "#f8f8f8" }]}>{greeting}</Text>
          <Text style={[styles.dashboardFeatureTitle, { color: "#f8f8f8" }]}>{displayName}</Text>
          <Text style={[styles.dashboardDate, { color: "#e8f0f3" }]}>{longDate}</Text>
        </View>
      </View>

      {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Código de Agendamento</Text>
          <Text style={[styles.cardSubtitleSmall, { color: theme.textSecondary }]}>Copie quando precisar</Text>
        </View>
        <Text style={[styles.bookingCodeValue, { color: theme.textPrimary }]}>{bookingCode}</Text>
        <Text style={[styles.bookingLinkValue, { color: theme.textSecondary }]}>{bookingLink}</Text>
        <View style={styles.actionRow}>
          <Pressable onPress={handleCopyBookingCode} style={[styles.smallButton, { borderColor: theme.border }]}>
            <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Copiar código</Text>
          </Pressable>
          <Pressable onPress={handleCopyBookingLink} style={[styles.smallButton, { borderColor: theme.border }]}>
            <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Copiar link</Text>
          </Pressable>
        </View>
        {copyFeedback ? <Text style={styles.successBanner}>{copyFeedback}</Text> : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Agenda de Hoje</Text>
          <Pressable onPress={onOpenAgenda}>
            <Text style={[styles.sectionLink, { color: theme.accent }]}>Ver tudo</Text>
          </Pressable>
        </View>

        {loading ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Carregando...</Text>
        ) : !firstAppointment ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Nenhum agendamento hoje.
          </Text>
        ) : (
          <View style={[styles.todayAppointmentCard, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
            <View style={styles.todayAppointmentHeader}>
              <Text style={styles.todayStatusBadge}>{firstAppointment.status.toUpperCase()}</Text>
              <Text style={styles.todayTimeBadge}>{formatHour(firstAppointment.start_time)}</Text>
            </View>
            <Text style={[styles.todayCustomerName, { color: theme.textPrimary }]}>
              {firstAppointment.customer_name}
            </Text>
            <Text style={styles.todayServiceName}>{firstAppointment.service?.name ?? "Serviço"}</Text>
            <Text style={styles.todayPrice}>
              R$ {formatMoneyBr(firstAppointment.service?.price ?? 0)}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Visão Geral</Text>
          <Text style={[styles.cardSubtitleSmall, { color: theme.textSecondary }]}>
            {activeServicesCount} {activeServicesCount === 1 ? "serviço" : "serviços"}
          </Text>
        </View>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={styles.summaryValueBlue}>{loading ? "--" : String(statusSummary.agendado)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Agendado</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={styles.summaryValueYellow}>
              {loading ? "--" : String(statusSummary.confirmado)}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Confirmado</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={styles.summaryValueGreen}>{loading ? "--" : String(statusSummary.concluido)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Concluído</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={styles.summaryValueGray}>{loading ? "--" : String(statusSummary.cancelado)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Cancelado</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ServicesScreen({ professionalId, theme }: { professionalId: string; theme: ThemeTokens }) {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeCount = useMemo(() => services.filter((item) => item.is_active).length, [services]);

  const loadServices = async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("services")
      .select("id, name, duration_minutes, price, description, is_active, created_at")
      .eq("professional_id", professionalId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setServices((data ?? []) as ServiceRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadServices();
  }, [professionalId]);

  const handleCreate = async () => {
    setMessage("");
    setError("");

    const parsedDuration = Number(duration);
    const parsedPrice = Number(price.replace(",", "."));
    if (!name.trim()) {
      setError("Informe o nome do serviço.");
      return;
    }
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      setError("Duração inválida.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("Valor inválido.");
      return;
    }

    setSubmitting(true);
    const { error: insertError } = await supabase.from("services").insert({
      professional_id: professionalId,
      name: name.trim(),
      duration_minutes: parsedDuration,
      price: parsedPrice,
      description: description.trim() || null,
      is_active: true,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setName("");
    setDuration("60");
    setPrice("");
    setDescription("");
    setMessage("Serviço cadastrado com sucesso.");
    setSubmitting(false);
    await loadServices();
  };

  const toggleActive = async (service: ServiceRow) => {
    setMessage("");
    setError("");
    const { error: updateError } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setServices((current) =>
      current.map((item) => (item.id === service.id ? { ...item, is_active: !item.is_active } : item))
    );
  };

  const handleDelete = async (serviceId: string) => {
    setMessage("");
    setError("");

    const { count: linkedAppointments, error: linkedError } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", professionalId)
      .eq("service_id", serviceId);

    if (linkedError) {
      setError(linkedError.message);
      return;
    }

    if ((linkedAppointments ?? 0) > 0) {
      const { error: updateError } = await supabase
        .from("services")
        .update({ is_active: false })
        .eq("id", serviceId)
        .eq("professional_id", professionalId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setServices((current) =>
        current.map((item) => (item.id === serviceId ? { ...item, is_active: false } : item))
      );
      setMessage("Serviço com agendamentos não pode ser excluído. Ele foi desativado.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId)
      .eq("professional_id", professionalId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Serviço excluído.");
    setServices((current) => current.filter((item) => item.id !== serviceId));
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Novo serviço</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nome do serviço"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <TextInput
          value={duration}
          onChangeText={setDuration}
          placeholder="Duração em minutos"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <TextInput
          value={price}
          onChangeText={setPrice}
          placeholder="Valor (ex: 150.00)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descrição (opcional)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
          multiline
        />
        <Pressable
          onPress={handleCreate}
          disabled={submitting}
          style={[styles.button, styles.refreshButton, { backgroundColor: theme.buttonPrimary }]}
        >
          <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>
            {submitting ? "Salvando..." : "Cadastrar serviço"}
          </Text>
        </Pressable>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {message ? <Text style={styles.successBanner}>{message}</Text> : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          Serviços cadastrados ({activeCount} ativos de {services.length})
        </Text>
        {loading ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Carregando...</Text>
        ) : services.length === 0 ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Nenhum serviço cadastrado.
          </Text>
        ) : (
          services.map((service) => (
            <View
              key={service.id}
              style={[styles.listCard, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <Text style={[styles.appointmentTitle, { color: theme.textPrimary }]}>{service.name}</Text>
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {service.duration_minutes} min • R$ {formatMoneyBr(service.price)}
              </Text>
              {service.description ? (
                <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                  {service.description}
                </Text>
              ) : null}
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {service.is_active ? "Ativo" : "Inativo"}
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.smallButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => toggleActive(service)}
                >
                  <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>
                    {service.is_active ? "Desativar" : "Ativar"}
                  </Text>
                </Pressable>
                <Pressable style={styles.smallDangerButton} onPress={() => handleDelete(service.id)}>
                  <Text style={styles.smallDangerButtonText}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function AgendaScreen({ professionalId, theme }: { professionalId: string; theme: ThemeTokens }) {
  type RescheduleSlotOption = { startTime: string; endTime: string };
  type BookedRange = { start_time: string; end_time: string };

  const [selectedDate, setSelectedDate] = useState(toIsoDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState(toIsoDate());
  const [rescheduleStartTime, setRescheduleStartTime] = useState("");
  const [rescheduleSlotOptions, setRescheduleSlotOptions] = useState<RescheduleSlotOption[]>([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [showRescheduleDatePicker, setShowRescheduleDatePicker] = useState(false);
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadAppointments = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, service:services(name)"
      )
      .eq("professional_id", professionalId)
      .eq("appointment_date", selectedDate)
      .order("start_time", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const normalized = ((data ?? []) as AppointmentSelectRow[]).map((row) => ({
      ...row,
      service: Array.isArray(row.service) ? (row.service[0] ?? null) : row.service,
    }));
    setAppointments(normalized);
    setLoading(false);
  };

  useEffect(() => {
    loadAppointments();
  }, [professionalId, selectedDate]);

  const reschedulingAppointment = useMemo(
    () => appointments.find((item) => item.id === reschedulingId) ?? null,
    [appointments, reschedulingId]
  );

  useEffect(() => {
    const loadRescheduleSlots = async () => {
      if (!reschedulingId || !reschedulingAppointment) {
        setRescheduleSlotOptions([]);
        return;
      }

      setLoadingRescheduleSlots(true);

      const weekday = new Date(`${rescheduleDate}T00:00:00`).getDay();
      const dayStartIso = new Date(`${rescheduleDate}T00:00:00`).toISOString();
      const dayEndIso = new Date(`${rescheduleDate}T23:59:59`).toISOString();

      const [availabilityRes, blockedRes, bookedRes] = await Promise.all([
        supabase
          .from("availability")
          .select("id, weekday, start_time, end_time, slot_interval_minutes, is_active")
          .eq("professional_id", professionalId)
          .eq("is_active", true)
          .eq("weekday", weekday)
          .order("start_time", { ascending: true }),
        supabase
          .from("blocked_times")
          .select("id, start_at, end_at")
          .eq("professional_id", professionalId)
          .lt("start_at", dayEndIso)
          .gt("end_at", dayStartIso),
        supabase
          .from("appointments")
          .select("start_time, end_time")
          .eq("professional_id", professionalId)
          .eq("appointment_date", rescheduleDate)
          .in("status", ["agendado", "confirmado"])
          .neq("id", reschedulingId),
      ]);

      if (availabilityRes.error || blockedRes.error || bookedRes.error) {
        setErrorMessage(
          availabilityRes.error?.message ??
            blockedRes.error?.message ??
            bookedRes.error?.message ??
            "Erro ao carregar horários disponíveis."
        );
        setLoadingRescheduleSlots(false);
        return;
      }

      const durationMinutes = getDurationMinutes(
        reschedulingAppointment.start_time,
        reschedulingAppointment.end_time
      );
      const availabilityRows = (availabilityRes.data ?? []) as AvailabilityRow[];
      const blockedRows = (blockedRes.data ?? []) as Array<{ start_at: string; end_at: string }>;
      const bookedRows = (bookedRes.data ?? []) as BookedRange[];

      const generatedSlots: RescheduleSlotOption[] = [];
      const now = new Date();
      const isRescheduleDateToday = rescheduleDate === toIsoDate();
      for (const row of availabilityRows) {
        const startWindow = combineDateAndTime(rescheduleDate, row.start_time);
        const endWindow = combineDateAndTime(rescheduleDate, row.end_time);
        const stepMinutes = Math.max(durationMinutes + row.slot_interval_minutes, 1);
        let cursor = new Date(startWindow);

        while (true) {
          const slotStart = new Date(cursor);
          const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);
          if (slotEnd > endWindow) break;
          if (isRescheduleDateToday && slotStart <= now) {
            cursor = new Date(cursor.getTime() + stepMinutes * 60 * 1000);
            continue;
          }

          const overlapsBlocked = blockedRows.some((blocked) =>
            hasOverlap(slotStart, slotEnd, new Date(blocked.start_at), new Date(blocked.end_at))
          );
          const overlapsBooked = bookedRows.some((booked) =>
            hasOverlap(
              slotStart,
              slotEnd,
              combineDateAndTime(rescheduleDate, booked.start_time),
              combineDateAndTime(rescheduleDate, booked.end_time)
            )
          );

          if (!overlapsBlocked && !overlapsBooked) {
            generatedSlots.push({
              startTime: normalizeTime(slotStart.toTimeString()),
              endTime: normalizeTime(slotEnd.toTimeString()),
            });
          }

          cursor = new Date(cursor.getTime() + stepMinutes * 60 * 1000);
        }
      }

      setRescheduleSlotOptions(generatedSlots);
      setRescheduleStartTime((current) => {
        if (generatedSlots.some((slot) => slot.startTime === current)) return current;
        return generatedSlots[0]?.startTime ?? "";
      });
      setLoadingRescheduleSlots(false);
    };

    loadRescheduleSlots();
  }, [professionalId, reschedulingId, rescheduleDate, reschedulingAppointment]);

  const handleChangeStatus = async (
    appointment: AppointmentRow,
    status: AppointmentStatus
  ) => {
    setErrorMessage("");
    setSuccessMessage("");
    setUpdatingId(appointment.id);

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointment.id)
      .eq("professional_id", professionalId);

    if (error) {
      setErrorMessage(error.message);
      setUpdatingId(null);
      return;
    }

    setAppointments((current) =>
      current.map((item) => (item.id === appointment.id ? { ...item, status } : item))
    );

    if (status === "confirmado") {
      const whatsappUrl = buildWhatsappUrlForAppointment(appointment);

      if (!whatsappUrl) {
        setSuccessMessage("Status confirmado, mas telefone da cliente inválido para WhatsApp.");
        setUpdatingId(null);
        return;
      }

      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        setSuccessMessage("Status confirmado e WhatsApp aberto para envio da mensagem.");
      } else {
        setSuccessMessage("Status confirmado, mas não foi possível abrir o WhatsApp.");
      }
    } else {
      setSuccessMessage("Status atualizado com sucesso.");
    }

    setUpdatingId(null);
  };

  const handleDateChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setSelectedDate(toIsoDate(pickedDate));
  };

  const handleStartReschedule = (appointment: AppointmentRow) => {
    setErrorMessage("");
    setSuccessMessage("");
    setReschedulingId(appointment.id);
    setRescheduleDate(appointment.appointment_date);
    setRescheduleStartTime(formatHour(appointment.start_time));
    setShowRescheduleDatePicker(false);
  };

  const handleRescheduleDateChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowRescheduleDatePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setRescheduleDate(toIsoDate(pickedDate));
  };

  const handleSaveReschedule = async (appointment: AppointmentRow) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSavingReschedule(true);

    const selectedSlot = rescheduleSlotOptions.find((slot) => slot.startTime === rescheduleStartTime);

    if (!selectedSlot) {
      setErrorMessage("Selecione um horário disponível.");
      setSavingReschedule(false);
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        appointment_date: rescheduleDate,
        start_time: selectedSlot.startTime,
        end_time: selectedSlot.endTime,
      })
      .eq("id", appointment.id)
      .eq("professional_id", professionalId);

    if (error) {
      setErrorMessage(error.message);
      setSavingReschedule(false);
      return;
    }

    setSuccessMessage("Agendamento reagendado com sucesso.");
    setReschedulingId(null);
    setSavingReschedule(false);
    await loadAppointments();
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Agenda por dia</Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={[styles.datePickerButton, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}
        >
          <Text style={[styles.datePickerButtonLabel, { color: theme.textSecondary }]}>Data</Text>
          <Text style={[styles.datePickerButtonValue, { color: theme.textPrimary }]}>
            {formatDateBr(selectedDate)}
          </Text>
        </Pressable>
        {showDatePicker ? (
          <DateTimePicker
            value={new Date(`${selectedDate}T00:00:00`)}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        ) : null}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => setSelectedDate(toIsoDate())}
            style={[styles.smallButton, { backgroundColor: theme.background, borderColor: theme.border }]}
          >
            <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Hoje</Text>
          </Pressable>
          <Pressable
            onPress={loadAppointments}
            style={[styles.smallButton, { backgroundColor: theme.background, borderColor: theme.border }]}
          >
            <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Atualizar</Text>
          </Pressable>
        </View>
        {errorMessage ? <Text style={styles.errorBanner}>{errorMessage}</Text> : null}
        {successMessage ? <Text style={styles.successBanner}>{successMessage}</Text> : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Lista do dia ({appointments.length})</Text>
        {loading ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Carregando agendamentos...
          </Text>
        ) : appointments.length === 0 ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Nenhum agendamento para esta data.
          </Text>
        ) : (
          appointments.map((appointment) => (
            <View
              key={appointment.id}
              style={[styles.listCard, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <Text style={[styles.appointmentTitle, { color: theme.textPrimary }]}>
                {formatHour(appointment.start_time)} - {formatHour(appointment.end_time)} •{" "}
                {appointment.service?.name ?? "Serviço"}
              </Text>
              <Text style={[styles.appointmentCustomer, { color: theme.textPrimary }]}>
                {appointment.customer_name}
              </Text>
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {appointment.customer_phone} • {appointment.customer_email}
              </Text>
              {appointment.notes ? (
                <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                  Obs: {appointment.notes}
                </Text>
              ) : null}

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.smallButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleStartReschedule(appointment)}
                >
                  <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Reagendar</Text>
                </Pressable>
              </View>

              {reschedulingId === appointment.id ? (
                <View style={[styles.rescheduleCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Novo horário</Text>

                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.smallButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => setShowRescheduleDatePicker(true)}
                    >
                      <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>
                        Data: {formatDateBr(rescheduleDate)}
                      </Text>
                    </Pressable>
                  </View>

                  {showRescheduleDatePicker ? (
                    <DateTimePicker
                      value={new Date(`${rescheduleDate}T00:00:00`)}
                      mode="date"
                      display="default"
                      onChange={handleRescheduleDateChange}
                    />
                  ) : null}

                  {loadingRescheduleSlots ? (
                    <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
                      Carregando horários disponíveis...
                    </Text>
                  ) : rescheduleSlotOptions.length === 0 ? (
                    <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
                      Nenhum horário disponível para esta data.
                    </Text>
                  ) : (
                    <View style={styles.statusRow}>
                      {rescheduleSlotOptions.map((slot) => {
                        const selectedSlot = rescheduleStartTime === slot.startTime;
                        return (
                          <Pressable
                            key={`${slot.startTime}-${slot.endTime}`}
                            onPress={() => setRescheduleStartTime(slot.startTime)}
                            style={[
                              styles.statusButton,
                              { backgroundColor: theme.background, borderColor: theme.border },
                              selectedSlot && styles.statusButtonSelected,
                              selectedSlot && {
                                backgroundColor: theme.buttonPrimary,
                                borderColor: theme.buttonPrimary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusButtonText,
                                { color: selectedSlot ? theme.buttonPrimaryText : theme.textSecondary },
                              ]}
                            >
                              {slot.startTime} - {slot.endTime}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.smallButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => handleSaveReschedule(appointment)}
                      disabled={savingReschedule}
                    >
                      <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>
                        {savingReschedule ? "Salvando..." : "Salvar reagendamento"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.smallDangerButton}
                      onPress={() => setReschedulingId(null)}
                      disabled={savingReschedule}
                    >
                      <Text style={styles.smallDangerButtonText}>Cancelar</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={styles.statusRow}>
                {statusOptions.map((option) => {
                  const selected = appointment.status === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      disabled={updatingId === appointment.id}
                      onPress={() => handleChangeStatus(appointment, option.value)}
                      style={[
                        styles.statusButton,
                        { backgroundColor: theme.background, borderColor: theme.border },
                        selected && styles.statusButtonSelected,
                        selected && { backgroundColor: theme.buttonPrimary, borderColor: theme.buttonPrimary },
                        updatingId === appointment.id && styles.buttonDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          { color: selected ? theme.buttonPrimaryText : theme.textSecondary },
                          selected && styles.statusButtonTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function AvailabilityScreen({ professionalId, theme }: { professionalId: string; theme: ThemeTokens }) {
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [weekday, setWeekday] = useState<number>(1);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [intervalMinutes, setIntervalMinutes] = useState("0");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRows = async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("availability")
      .select("id, weekday, start_time, end_time, slot_interval_minutes, is_active")
      .eq("professional_id", professionalId)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as AvailabilityRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, [professionalId]);

  const resetForm = () => {
    setWeekday(1);
    setStartTime("08:00");
    setEndTime("18:00");
    setIntervalMinutes("0");
    setEditingRowId(null);
  };

  const handleSaveAvailability = async () => {
    setMessage("");
    setError("");
    const parsedInterval = Number(intervalMinutes);
    if (startTime >= endTime) {
      setError("Horário final deve ser maior que o inicial.");
      return;
    }
    if (!Number.isFinite(parsedInterval) || parsedInterval < 0 || parsedInterval > 180) {
      setError("Intervalo inválido (0 a 180).");
      return;
    }

    if (editingRowId) {
      const { error: updateError } = await supabase
        .from("availability")
        .update({
          weekday,
          start_time: startTime,
          end_time: endTime,
          slot_interval_minutes: parsedInterval,
        })
        .eq("id", editingRowId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage("Horário atualizado.");
    } else {
      const { error: insertError } = await supabase.from("availability").insert({
        professional_id: professionalId,
        weekday,
        start_time: startTime,
        end_time: endTime,
        slot_interval_minutes: parsedInterval,
        is_active: true,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setMessage("Horário cadastrado.");
    }

    resetForm();
    await loadRows();
  };

  const toggleActive = async (row: AvailabilityRow) => {
    setMessage("");
    setError("");
    const { error: updateError } = await supabase
      .from("availability")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setRows((current) =>
      current.map((item) => (item.id === row.id ? { ...item, is_active: !item.is_active } : item))
    );
  };

  const handleDelete = async (rowId: string) => {
    setMessage("");
    setError("");
    const { error: deleteError } = await supabase.from("availability").delete().eq("id", rowId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setRows((current) => current.filter((item) => item.id !== rowId));
  };

  const handleEdit = (row: AvailabilityRow) => {
    setMessage("");
    setError("");
    setEditingRowId(row.id);
    setWeekday(row.weekday);
    setStartTime(formatHour(row.start_time));
    setEndTime(formatHour(row.end_time));
    setIntervalMinutes(String(row.slot_interval_minutes));
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
          {editingRowId ? "Editar horário de disponibilidade" : "Configurar disponibilidade"}
        </Text>
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Dia da semana</Text>
        <View style={styles.statusRow}>
          {weekdayOptions.map((option) => {
            const selected = weekday === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setWeekday(option.value)}
                style={[
                  styles.statusButton,
                  { backgroundColor: theme.background, borderColor: theme.border },
                  selected && styles.statusButtonSelected,
                  selected && { backgroundColor: theme.buttonPrimary, borderColor: theme.buttonPrimary },
                ]}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    { color: selected ? theme.buttonPrimaryText : theme.textSecondary },
                    selected && styles.statusButtonTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={startTime}
          onChangeText={setStartTime}
          placeholder="Início (HH:MM)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <TextInput
          value={endTime}
          onChangeText={setEndTime}
          placeholder="Fim (HH:MM)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <TextInput
          value={intervalMinutes}
          onChangeText={setIntervalMinutes}
          placeholder="Intervalo entre slots (min)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleSaveAvailability}
            style={[styles.button, styles.refreshButton, { backgroundColor: theme.buttonPrimary }]}
          >
            <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>
              {editingRowId ? "Salvar alterações" : "Adicionar horário"}
            </Text>
          </Pressable>
          {editingRowId ? (
            <Pressable
              onPress={resetForm}
              style={[styles.smallButton, { backgroundColor: theme.background, borderColor: theme.border }]}
            >
              <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Cancelar</Text>
            </Pressable>
          ) : null}
        </View>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {message ? <Text style={styles.successBanner}>{message}</Text> : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Horários cadastrados</Text>
        {loading ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Carregando...</Text>
        ) : rows.length === 0 ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Nenhuma faixa cadastrada.
          </Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={[styles.listCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.appointmentTitle, { color: theme.textPrimary }]}>
                {weekdayOptions.find((option) => option.value === row.weekday)?.label ?? `Dia ${row.weekday}`}
              </Text>
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {formatHour(row.start_time)} - {formatHour(row.end_time)} • Intervalo {row.slot_interval_minutes} min
              </Text>
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {row.is_active ? "Ativo" : "Inativo"}
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.smallButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => handleEdit(row)}
                >
                  <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Editar</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => toggleActive(row)}
                >
                  <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>
                    {row.is_active ? "Desativar" : "Ativar"}
                  </Text>
                </Pressable>
                <Pressable style={styles.smallDangerButton} onPress={() => handleDelete(row.id)}>
                  <Text style={styles.smallDangerButtonText}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function BlockedTimesScreen({ professionalId, theme }: { professionalId: string; theme: ThemeTokens }) {
  const now = new Date();
  const startDefault = toDateAndTimeInput(new Date(now.getTime() + 60 * 60 * 1000));
  const endDefault = toDateAndTimeInput(new Date(now.getTime() + 2 * 60 * 60 * 1000));

  const [rows, setRows] = useState<BlockedTimeRow[]>([]);
  const [startDate, setStartDate] = useState(startDefault.date);
  const [startTime, setStartTime] = useState(startDefault.time);
  const [endDate, setEndDate] = useState(endDefault.date);
  const [endTime, setEndTime] = useState(endDefault.time);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRows = async () => {
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase
      .from("blocked_times")
      .select("id, start_at, end_at, reason")
      .eq("professional_id", professionalId)
      .order("start_at", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as BlockedTimeRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadRows();
  }, [professionalId]);

  const handleCreate = async () => {
    setMessage("");
    setError("");

    const start = parseDateTimeInput(startDate, startTime);
    const end = parseDateTimeInput(endDate, endTime);
    if (!start || !end) {
      setError("Data/hora inválida. Use YYYY-MM-DD e HH:MM.");
      return;
    }
    if (start >= end) {
      setError("Data/hora final deve ser maior que a inicial.");
      return;
    }

    const { error: insertError } = await supabase.from("blocked_times").insert({
      professional_id: professionalId,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      reason: reason.trim() || null,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setReason("");
    setMessage("Bloqueio cadastrado com sucesso.");
    await loadRows();
  };

  const handleDelete = async (rowId: string) => {
    setMessage("");
    setError("");
    const { error: deleteError } = await supabase.from("blocked_times").delete().eq("id", rowId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setRows((current) => current.filter((item) => item.id !== rowId));
  };

  const handleStartDateChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowStartDatePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setStartDate(toIsoDate(pickedDate));
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowStartTimePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setStartTime(toDateAndTimeInput(pickedDate).time);
  };

  const handleEndDateChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowEndDatePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setEndDate(toIsoDate(pickedDate));
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    setShowEndTimePicker(false);
    if (event.type !== "set" || !pickedDate) return;
    setEndTime(toDateAndTimeInput(pickedDate).time);
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Novo bloqueio</Text>
        <Pressable
          onPress={() => setShowStartDatePicker(true)}
          style={[
            styles.datePickerButton,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.datePickerButtonLabel, { color: theme.textSecondary }]}>Data início</Text>
          <Text style={[styles.datePickerButtonValue, { color: theme.textPrimary }]}>
            {formatDateBr(startDate)}
          </Text>
        </Pressable>
        {showStartDatePicker ? (
          <DateTimePicker
            mode="date"
            value={new Date(`${startDate}T00:00:00`)}
            onChange={handleStartDateChange}
          />
        ) : null}

        <Pressable
          onPress={() => setShowStartTimePicker(true)}
          style={[
            styles.datePickerButton,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.datePickerButtonLabel, { color: theme.textSecondary }]}>Hora início</Text>
          <Text style={[styles.datePickerButtonValue, { color: theme.textPrimary }]}>{startTime}</Text>
        </Pressable>
        {showStartTimePicker ? (
          <DateTimePicker
            mode="time"
            value={parseDateTimeInput(startDate, startTime) ?? new Date(`${startDate}T00:00:00`)}
            onChange={handleStartTimeChange}
          />
        ) : null}

        <Pressable
          onPress={() => setShowEndDatePicker(true)}
          style={[
            styles.datePickerButton,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.datePickerButtonLabel, { color: theme.textSecondary }]}>Data fim</Text>
          <Text style={[styles.datePickerButtonValue, { color: theme.textPrimary }]}>
            {formatDateBr(endDate)}
          </Text>
        </Pressable>
        {showEndDatePicker ? (
          <DateTimePicker
            mode="date"
            value={new Date(`${endDate}T00:00:00`)}
            onChange={handleEndDateChange}
          />
        ) : null}

        <Pressable
          onPress={() => setShowEndTimePicker(true)}
          style={[
            styles.datePickerButton,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.datePickerButtonLabel, { color: theme.textSecondary }]}>Hora fim</Text>
          <Text style={[styles.datePickerButtonValue, { color: theme.textPrimary }]}>{endTime}</Text>
        </Pressable>
        {showEndTimePicker ? (
          <DateTimePicker
            mode="time"
            value={parseDateTimeInput(endDate, endTime) ?? new Date(`${endDate}T00:00:00`)}
            onChange={handleEndTimeChange}
          />
        ) : null}

        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Motivo (opcional)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
        />
        <Pressable onPress={handleCreate} style={[styles.button, styles.refreshButton, { backgroundColor: theme.buttonPrimary }]}>
          <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>Adicionar bloqueio</Text>
        </Pressable>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {message ? <Text style={styles.successBanner}>{message}</Text> : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Bloqueios cadastrados</Text>
        {loading ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Carregando...</Text>
        ) : rows.length === 0 ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Nenhum bloqueio cadastrado.
          </Text>
        ) : (
          rows.map((row) => (
            <View key={row.id} style={[styles.listCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.appointmentTitle, { color: theme.textPrimary }]}>
                {formatDateTimeBr(row.start_at)} - {formatDateTimeBr(row.end_at)}
              </Text>
              <Text style={[styles.appointmentMeta, { color: theme.textSecondary }]}>
                {row.reason || "Sem motivo informado"}
              </Text>
              <View style={styles.actionRow}>
                <Pressable style={styles.smallDangerButton} onPress={() => handleDelete(row.id)}>
                  <Text style={styles.smallDangerButtonText}>Remover</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f7f2ef",
  },
  loadingText: {
    color: "#5b4d49",
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f2ef",
    padding: 20,
  },
  animatedBackgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  animatedBlob: {
    position: "absolute",
    borderRadius: 999,
  },
  animatedBlobOne: {
    width: 290,
    height: 290,
    top: -90,
    right: -70,
  },
  animatedBlobTwo: {
    width: 320,
    height: 320,
    bottom: 90,
    left: -110,
  },
  animatedBlobThree: {
    width: 240,
    height: 240,
    bottom: -70,
    right: 20,
  },
  authCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fffdfb",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e8d7cf",
    padding: 20,
    gap: 10,
    zIndex: 2,
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: "#f7f2ef",
    padding: 20,
  },
  topHeader: {
    minHeight: 70,
    justifyContent: "center",
    gap: 2,
    borderBottomWidth: 0,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  headerButtonsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  mainContent: {
    flex: 1,
    zIndex: 2,
  },
  tabsContainer: {
    minHeight: 56,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  contentScroll: {
    flex: 1,
  },
  dashboardScrollContent: {
    gap: 14,
    paddingBottom: 36,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  refreshButton: {
    flex: 1,
  },
  sectionContainer: {
    gap: 12,
  },
  tabsScroll: {
    marginBottom: 0,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  tabButton: {
    borderWidth: 1,
    borderColor: "#d8c5bc",
    borderRadius: 999,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    minHeight: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  tabButtonSelected: {
    backgroundColor: "#2f2725",
    borderColor: "#2f2725",
  },
  tabButtonText: {
    color: "#5f4b45",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  tabButtonTextSelected: {
    color: "#fff",
  },
  themeToggleButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  themeToggleButtonText: {
    fontSize: 11,
    fontWeight: "700",
  },
  card: {
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 18,
    backgroundColor: "#fffdfb",
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2f231f",
    fontFamily: "serif",
  },
  listCard: {
    borderWidth: 1,
    borderColor: "#edded7",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 12,
    gap: 8,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f2e8e3",
    paddingTop: 8,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  smallButton: {
    borderWidth: 1,
    borderColor: "#d8c5bc",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  smallButtonText: {
    color: "#5f4b45",
    fontWeight: "600",
    fontSize: 12,
  },
  smallDangerButton: {
    borderWidth: 1,
    borderColor: "#fecdca",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#fee4e2",
  },
  smallDangerButtonText: {
    color: "#b42318",
    fontWeight: "600",
    fontSize: 12,
  },
  statusLabel: {
    fontSize: 12,
    color: "#5f4b45",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  fieldLabel: {
    color: "#5f4b45",
    fontWeight: "600",
    fontSize: 13,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    backgroundColor: "#fffdfb",
    padding: 12,
    gap: 4,
  },
  kpiLabel: {
    color: "#6d5a54",
    fontSize: 12,
  },
  kpiValue: {
    color: "#2f231f",
    fontSize: 24,
    fontWeight: "700",
  },
  dashboardHeroCard: {
    borderWidth: 1,
    borderColor: "#e8dff8",
    borderRadius: 16,
    backgroundColor: "#f7f5ff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dashboardFeatureCard: {
    borderWidth: 1,
    borderRadius: 24,
    backgroundColor: "#488399",
    padding: 18,
    gap: 12,
  },
  dashboardFeatureGreeting: {
    fontSize: 13,
    fontWeight: "600",
  },
  dashboardFeatureTitle: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "500",
    fontFamily: "serif",
  },
  dashboardGreeting: {
    color: "#1f2937",
    fontSize: 30,
    fontWeight: "800",
    fontFamily: "serif",
  },
  dashboardDate: {
    marginTop: 2,
    color: "#7c8392",
    fontSize: 13,
    textTransform: "capitalize",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sectionLink: {
    color: "#6f56d9",
    fontSize: 12,
    fontWeight: "700",
  },
  cardSubtitleSmall: {
    color: "#9097a3",
    fontSize: 12,
    fontWeight: "600",
  },
  todayAppointmentCard: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#d7ecff",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 5,
  },
  todayAppointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  todayStatusBadge: {
    backgroundColor: "#f1bebe",
    color: "#6b3f3f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: "800",
  },
  todayTimeBadge: {
    backgroundColor: "#f4d38a",
    color: "#5f512f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "700",
  },
  todayCustomerName: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    color: "#1f2937",
    marginTop: 4,
  },
  todayServiceName: {
    color: "#ea9393",
    fontSize: 13,
    fontWeight: "700",
  },
  todayPrice: {
    color: "#488399",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  summaryGrid: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: "#edf0f5",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
  },
  summaryValueBlue: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
    color: "#488399",
  },
  summaryValueYellow: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
    color: "#f4d38a",
  },
  summaryValueGreen: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
    color: "#ea9393",
  },
  summaryValueGray: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "800",
    color: "#f1bebe",
  },
  summaryLabel: {
    color: "#687588",
    fontSize: 12,
    fontWeight: "600",
  },
  rescheduleCard: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 10,
    backgroundColor: "#fff",
    padding: 10,
    gap: 8,
  },
  bookingCodeValue: {
    color: "#1f2937",
    fontSize: 13,
    fontWeight: "700",
  },
  bookingLinkValue: {
    color: "#6b7280",
    fontSize: 12,
  },
  brand: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7f5e55",
    letterSpacing: 0.4,
    fontFamily: "serif",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2f231f",
    fontFamily: "serif",
  },
  heroGreeting: {
    fontSize: 40,
    lineHeight: 46,
    fontFamily: "serif",
    letterSpacing: 0.2,
  },
  heroGreetingPrimary: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700",
    fontFamily: "serif",
  },
  heroGreetingAccent: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700",
    fontStyle: "italic",
    fontFamily: "serif",
  },
  subtitle: {
    fontSize: 14,
    color: "#6d5a54",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    backgroundColor: "#fff",
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 2,
  },
  datePickerButtonLabel: {
    fontSize: 12,
    color: "#7b6b66",
    fontWeight: "600",
  },
  datePickerButtonValue: {
    fontSize: 16,
    color: "#2f231f",
    fontWeight: "700",
  },
  errorText: {
    color: "#b42318",
    fontSize: 13,
  },
  button: {
    backgroundColor: "#2f2725",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    marginTop: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  placeholderCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    backgroundColor: "#fffdfb",
    padding: 14,
    gap: 6,
  },
  placeholderTitle: {
    color: "#2f231f",
    fontWeight: "700",
  },
  placeholderText: {
    color: "#6d5a54",
    fontSize: 13,
  },
  loadingListContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    backgroundColor: "#fffdfb",
    padding: 14,
    gap: 6,
  },
  appointmentCard: {
    borderWidth: 1,
    borderColor: "#e8d7cf",
    borderRadius: 14,
    backgroundColor: "#fffdfb",
    padding: 14,
    gap: 6,
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2f231f",
  },
  appointmentCustomer: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3d2f2a",
  },
  appointmentMeta: {
    fontSize: 13,
    color: "#6d5a54",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  statusButton: {
    borderWidth: 1,
    borderColor: "#d8c5bc",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  statusButtonSelected: {
    backgroundColor: "#2f2725",
    borderColor: "#2f2725",
  },
  statusButtonText: {
    fontSize: 12,
    color: "#5f4b45",
    fontWeight: "600",
  },
  statusButtonTextSelected: {
    color: "#fff",
  },
  errorBanner: {
    backgroundColor: "#fee4e2",
    color: "#b42318",
    borderWidth: 1,
    borderColor: "#fecdca",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  successBanner: {
    backgroundColor: "#dcfae6",
    color: "#067647",
    borderWidth: 1,
    borderColor: "#abefc6",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
});
