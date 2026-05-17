// ─── Dashboard — KPIs, agendamento do dia e link de booking ──────────────────

import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { ThemeTokens } from "../types";
import { webAppBaseUrl } from "../constants/theme";
import { toIsoDate, formatHour, formatMoneyBr, combineDateAndTime } from "../utils";
import { styles } from "../styles";
import { AnimatedSection } from "../components/AnimatedSection";
import { useDashboard } from "../hooks/useDashboard";

type DashboardScreenProps = {
  professionalId: string;
  /** Slug público igual à web (`booking_code` ou UUID). */
  bookingPublicSlug: string;
  onOpenAgenda: () => void;
  theme: ThemeTokens;
  displayName: string;
  refreshSignal: number;
};

export function DashboardScreen({
  professionalId,
  bookingPublicSlug,
  onOpenAgenda,
  theme,
  displayName,
  refreshSignal,
}: DashboardScreenProps) {
  const { data, isLoading, error, mutate } = useDashboard(professionalId);
  const [copyFeedback, setCopyFeedback] = useState("");

  // refreshSignal do botão "↻ Atualizar" força revalidação manual
  useMemo(() => {
    if (refreshSignal > 0) mutate();
  }, [refreshSignal]);

  const bookingCode = bookingPublicSlug;
  const bookingLink = `${webAppBaseUrl}/booking/${bookingPublicSlug}`;

  const firstAppointment = useMemo(
    () =>
      (data?.todayAppointments ?? []).find((a) => {
        const active = a.status === "agendado" || a.status === "confirmado";
        if (!active) return false;
        return combineDateAndTime(toIsoDate(), a.end_time) > new Date();
      }) ?? null,
    [data?.todayAppointments]
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia!";
    if (h < 18) return "Boa tarde!";
    return "Boa noite!";
  })();

  const longDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());

  const showCopyFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(""), 2000);
  };

  return (
    <View style={styles.sectionContainer}>
      <AnimatedSection
        delay={40}
        style={[styles.dashboardFeatureCard, { borderColor: theme.border, backgroundColor: theme.accent }]}
      >
        <Text style={[styles.dashboardFeatureGreeting, { color: "#f8f8f8" }]}>{greeting}</Text>
        <Text style={[styles.dashboardFeatureTitle, { color: "#f8f8f8" }]}>{displayName}</Text>
        <Text style={[styles.dashboardDate, { color: "#e8f0f3" }]}>{longDate}</Text>
      </AnimatedSection>

      {error ? <Text style={styles.errorBanner}>{error.message}</Text> : null}

      {/* ── Código e link ──────────────────────────────────────────────── */}
      <AnimatedSection delay={90} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Código de Agendamento</Text>
          <Text style={[styles.cardSubtitleSmall, { color: theme.textSecondary }]}>Copie quando precisar</Text>
        </View>
        <Text style={[styles.bookingCodeValue, { color: theme.textPrimary }]}>{bookingCode}</Text>
        <Text style={[styles.bookingLinkValue, { color: theme.textSecondary }]}>{bookingLink}</Text>
        <View style={styles.actionRow}>
          <Pressable onPress={async () => { await Clipboard.setStringAsync(bookingCode); showCopyFeedback("Código copiado."); }} style={[styles.smallButton, { borderColor: theme.border }]}>
            <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Copiar código</Text>
          </Pressable>
          <Pressable onPress={async () => { await Clipboard.setStringAsync(bookingLink); showCopyFeedback("Link copiado."); }} style={[styles.smallButton, { borderColor: theme.border }]}>
            <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Copiar link</Text>
          </Pressable>
        </View>
        {copyFeedback ? <Text style={styles.successBanner}>{copyFeedback}</Text> : null}
      </AnimatedSection>

      {/* ── Próximo agendamento ────────────────────────────────────────── */}
      <AnimatedSection delay={140} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Agenda de Hoje</Text>
          <Pressable onPress={onOpenAgenda}>
            <Text style={[styles.sectionLink, { color: theme.accent }]}>Ver tudo</Text>
          </Pressable>
        </View>

        {isLoading ? (
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

      {/* ── Resumo de status ──────────────────────────────────────────── */}
      <AnimatedSection delay={190} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Visão Geral</Text>
          <Text style={[styles.cardSubtitleSmall, { color: theme.textSecondary }]}>
            {data?.activeServicesCount ?? "—"} {(data?.activeServicesCount ?? 0) === 1 ? "serviço" : "serviços"}
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
              <Text style={valueStyle}>
                {isLoading ? "—" : String(data?.statusSummary[key] ?? 0)}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>
      </AnimatedSection>
    </View>
  );
}
