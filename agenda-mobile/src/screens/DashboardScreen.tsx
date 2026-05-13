// ─── Dashboard — KPIs, agendamento do dia e link de booking ──────────────────

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { supabase } from "../lib/supabase";
import type { DashboardAppointmentRow, DashboardAppointmentSelectRow, ThemeTokens } from "../types";
import { webAppBaseUrl } from "../constants/theme";
import { toIsoDate, formatHour, formatMoneyBr, combineDateAndTime } from "../utils";
import { styles } from "../styles";
import { AnimatedSection } from "../components/AnimatedSection";

type DashboardScreenProps = {
  professionalId: string;
  onOpenAgenda: () => void;
  theme: ThemeTokens;
  displayName: string;
  refreshSignal: number;
};

export function DashboardScreen({
  professionalId,
  onOpenAgenda,
  theme,
  displayName,
  refreshSignal,
}: DashboardScreenProps) {
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

  const bookingCode = professionalId;
  const bookingLink = `${webAppBaseUrl}/booking/${bookingCode}`;

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const today = toIsoDate();
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

    const normalizedToday = ((todayRes.data ?? []) as DashboardAppointmentSelectRow[]).map(
      (row) => ({
        ...row,
        service: Array.isArray(row.service) ? (row.service[0] ?? null) : row.service,
      })
    );

    setActiveServicesCount(servicesRes.count ?? 0);
    setStatusSummary(
      normalizedToday.reduce(
        (acc, item) => { acc[item.status] += 1; return acc; },
        { agendado: 0, confirmado: 0, concluido: 0, cancelado: 0 }
      )
    );
    setTodayAppointments(normalizedToday);
    setLoading(false);
  }, [professionalId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshSignal]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia!";
    if (hour < 18) return "Boa tarde!";
    return "Boa noite!";
  })();

  const longDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());

  const firstAppointment = useMemo(
    () =>
      todayAppointments.find((a) => {
        const active = a.status === "agendado" || a.status === "confirmado";
        if (!active) return false;
        return combineDateAndTime(toIsoDate(), a.end_time) > new Date();
      }) ?? null,
    [todayAppointments]
  );

  const showCopyFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(""), 2000);
  };

  const handleCopyBookingCode = async () => {
    await Clipboard.setStringAsync(bookingCode);
    showCopyFeedback("Código copiado.");
  };

  const handleCopyBookingLink = async () => {
    await Clipboard.setStringAsync(bookingLink);
    showCopyFeedback("Link copiado.");
  };

  return (
    <View style={styles.sectionContainer}>
      {/* ── Card de boas-vindas ──────────────────────────────────────────── */}
      <AnimatedSection
        delay={40}
        style={[styles.dashboardFeatureCard, { borderColor: theme.border, backgroundColor: theme.accent }]}
      >
        <Text style={[styles.dashboardFeatureGreeting, { color: "#f8f8f8" }]}>{greeting}</Text>
        <Text style={[styles.dashboardFeatureTitle, { color: "#f8f8f8" }]}>{displayName}</Text>
        <Text style={[styles.dashboardDate, { color: "#e8f0f3" }]}>{longDate}</Text>
      </AnimatedSection>

      {errorMessage ? (
        <Text style={styles.errorBanner}>{errorMessage}</Text>
      ) : null}

      {/* ── Código e link ────────────────────────────────────────────────── */}
      <AnimatedSection delay={90} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
      </AnimatedSection>

      {/* ── Próximo agendamento ──────────────────────────────────────────── */}
      <AnimatedSection delay={140} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
            Nenhum agendamento ativo hoje.
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
            <Text style={styles.todayPrice}>R$ {formatMoneyBr(firstAppointment.service?.price ?? 0)}</Text>
          </View>
        )}
      </AnimatedSection>

      {/* ── Resumo de status ─────────────────────────────────────────────── */}
      <AnimatedSection delay={190} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Visão Geral</Text>
          <Text style={[styles.cardSubtitleSmall, { color: theme.textSecondary }]}>
            {activeServicesCount} {activeServicesCount === 1 ? "serviço" : "serviços"}
          </Text>
        </View>
        <View style={styles.summaryGrid}>
          {(
            [
              { key: "agendado", label: "Agendado", valueStyle: styles.summaryValueBlue },
              { key: "confirmado", label: "Confirmado", valueStyle: styles.summaryValueYellow },
              { key: "concluido", label: "Concluído", valueStyle: styles.summaryValueGreen },
              { key: "cancelado", label: "Cancelado", valueStyle: styles.summaryValueGray },
            ] as const
          ).map(({ key, label, valueStyle }) => (
            <View key={key} style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={valueStyle}>{loading ? "—" : String(statusSummary[key])}</Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>
      </AnimatedSection>
    </View>
  );
}
