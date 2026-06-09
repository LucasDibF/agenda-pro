// ─── Dashboard — KPIs, agendamento do dia, link de booking e marca ──────────

import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import type { ThemeTokens } from "../types";
import { publicBookingPageUrl } from "../constants/theme";
import { supabase } from "../lib/supabase";
import {
  toIsoDate,
  formatHour,
  formatMoneyBr,
  combineDateAndTime,
  pickImageFromLibrary,
  uploadImageAsset,
  removeFromPublicUrl,
} from "../utils";
import { styles } from "../styles";
import { AnimatedSection } from "../components/AnimatedSection";
import { useDashboard } from "../hooks/useDashboard";
import { useBranding } from "../hooks/useBranding";

type DashboardScreenProps = {
  professionalId: string;
  /** Segmento da URL (`booking_slug` a partir do nome, ou legado `booking_code` / UUID). */
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
  const { data: branding, mutate: mutateBranding } = useBranding(professionalId);
  const [copyFeedback, setCopyFeedback] = useState("");

  // Marca (logo + nome da empresa) — estado local
  const remoteBusinessName = branding?.business_name ?? "";
  const [businessNameDraft, setBusinessNameDraft] = useState(remoteBusinessName);
  const [lastSyncedBusinessName, setLastSyncedBusinessName] = useState(remoteBusinessName);
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [brandFeedback, setBrandFeedback] = useState("");
  const [brandError, setBrandError] = useState("");

  // Sincroniza valor remoto -> draft quando muda (padrão recomendado em React 19)
  if (remoteBusinessName !== lastSyncedBusinessName) {
    setLastSyncedBusinessName(remoteBusinessName);
    setBusinessNameDraft(remoteBusinessName);
  }

  const showBrandMsg = (m: string) => {
    setBrandFeedback(m);
    setTimeout(() => setBrandFeedback(""), 3500);
  };
  const showBrandErr = (m: string) => {
    setBrandError(m);
    setTimeout(() => setBrandError(""), 5000);
  };

  const handlePickLogo = async () => {
    setBrandError("");
    const asset = await pickImageFromLibrary();
    if (!asset) return;
    setUploadingLogo(true);
    const result = await uploadImageAsset("logo", asset, professionalId, "logo");
    if (!result.ok) {
      showBrandErr(result.error);
      setUploadingLogo(false);
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ logo_url: result.publicUrl })
      .eq("id", professionalId);
    if (updateError) {
      showBrandErr(updateError.message);
      setUploadingLogo(false);
      return;
    }
    await mutateBranding({ business_name: remoteBusinessName, logo_url: result.publicUrl }, false);
    setUploadingLogo(false);
    showBrandMsg("Logo atualizada.");
  };

  const handleRemoveLogo = async () => {
    if (!branding?.logo_url) return;
    setBrandError("");
    setUploadingLogo(true);
    await removeFromPublicUrl("logo", branding.logo_url);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ logo_url: null })
      .eq("id", professionalId);
    if (updateError) {
      showBrandErr(updateError.message);
      setUploadingLogo(false);
      return;
    }
    await mutateBranding({ business_name: remoteBusinessName, logo_url: null }, false);
    setUploadingLogo(false);
    showBrandMsg("Logo removida.");
  };

  const handleSaveBusinessName = async () => {
    setBrandError("");
    setSavingBrand(true);
    const trimmed = businessNameDraft.trim() || null;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ business_name: trimmed })
      .eq("id", professionalId);
    if (updateError) {
      showBrandErr(updateError.message);
      setSavingBrand(false);
      return;
    }
    await mutateBranding(
      { business_name: trimmed, logo_url: branding?.logo_url ?? null },
      false,
    );
    setSavingBrand(false);
    showBrandMsg("Nome da empresa salvo.");
  };

  // refreshSignal do botão "↻ Atualizar" força revalidação manual
  useEffect(() => {
    if (refreshSignal > 0) {
      void mutate();
      void mutateBranding();
    }
  }, [refreshSignal, mutate, mutateBranding]);

  const bookingCode = bookingPublicSlug;
  const bookingLink = useMemo(() => publicBookingPageUrl(bookingPublicSlug), [bookingPublicSlug]);

  const showCopyFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(""), 3200);
  };

  const openBookingInBrowser = async () => {
    const url = bookingLink;
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      try {
        await Linking.openURL(url);
      } catch {
        showCopyFeedback("Não foi possível abrir o navegador. Copie o link e abra manualmente.");
      }
    }
  };

  const firstAppointment = useMemo(
    () =>
      (data?.todayAppointments ?? []).find((a) => {
        const active = a.status === "agendado" || a.status === "confirmado";
        if (!active) return false;
        return combineDateAndTime(toIsoDate(), a.end_time) > new Date();
      }) ?? null,
    [data?.todayAppointments],
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia!";
    if (h < 18) return "Boa tarde!";
    return "Boa noite!";
  })();

  const longDateRaw = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const longDate = longDateRaw.charAt(0).toUpperCase() + longDateRaw.slice(1);

  return (
    <View style={styles.sectionContainer}>
      <AnimatedSection
        delay={40}
        style={[styles.dashboardFeatureCard, { borderColor: theme.border, backgroundColor: theme.accent }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={styles.brandLogo}>
            {branding?.logo_url ? (
              <Image source={{ uri: branding.logo_url }} style={styles.brandLogoImage} />
            ) : (
              <Text style={styles.brandLogoPlaceholderText}>
                {((branding?.business_name || displayName || "A")[0] ?? "A").toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dashboardFeatureGreeting, { color: "rgba(255,255,255,0.85)" }]}>
              {greeting}
            </Text>
            <Text style={[styles.dashboardFeatureTitle, { color: "#ffffff" }]}>
              {branding?.business_name?.trim() || displayName}
            </Text>
            <Text style={[styles.dashboardDate, { color: "rgba(255,255,255,0.78)" }]}>{longDate}</Text>
          </View>
        </View>
      </AnimatedSection>

      {error ? <Text style={styles.errorBanner}>{error.message}</Text> : null}

      {/* ── Visão Geral ───────────────────────────────────────────────── */}
      <AnimatedSection delay={90} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
            <View key={key} style={[styles.summaryCard, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
              <Text style={valueStyle}>
                {isLoading ? "—" : String(data?.statusSummary[key] ?? 0)}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>
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

      {/* ── Link público ───────────────────────────────────────────── */}
      <AnimatedSection delay={190} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Link de agendamento</Text>
        <Text style={[styles.cardSubtitleSmall, { color: theme.textSecondary, marginTop: 4 }]}>
          Compartilhe com seus clientes — eles verão sua marca no topo da página.
        </Text>

        {/* Mini-preview do hero da página pública */}
        <View style={[styles.bookingLinkPreview, { backgroundColor: theme.accent }]}>
          <View style={[styles.bookingLinkPreviewLogo]}>
            {branding?.logo_url ? (
              <Image source={{ uri: branding.logo_url }} style={styles.serviceThumbImage} />
            ) : (
              <Text style={styles.bookingLinkPreviewLogoText}>
                {((branding?.business_name || displayName || "A")[0] ?? "A").toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.bookingLinkPreviewKicker}>Reservar horário</Text>
            <Text style={styles.bookingLinkPreviewTitle} numberOfLines={1}>
              {branding?.business_name?.trim() || displayName}
            </Text>
            <Text style={styles.bookingLinkPreviewDomain} numberOfLines={1}>
              agendaonline-plum.vercel.app
            </Text>
          </View>
        </View>

        <Text
          selectable
          style={[styles.bookingLinkHero, { color: theme.textPrimary, marginTop: 12 }]}
          accessibilityRole="link"
        >
          {bookingLink}
        </Text>
        <View style={[styles.actionRow, { flexWrap: "wrap", marginTop: 12 }]}>
          <Pressable onPress={async () => { await Clipboard.setStringAsync(bookingLink); showCopyFeedback("Link copiado."); }} style={[styles.smallButton, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Copiar link</Text>
          </Pressable>
          <Pressable onPress={openBookingInBrowser} style={[styles.smallButton, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Abrir link</Text>
          </Pressable>
        </View>

        <Text selectable style={[styles.bookingCodeValue, { color: theme.textPrimary, marginTop: 16 }]}>{bookingCode}</Text>
        <View style={[styles.actionRow, { flexWrap: "wrap", marginTop: 8 }]}>
          <Pressable onPress={async () => { await Clipboard.setStringAsync(bookingCode); showCopyFeedback("Código copiado."); }} style={[styles.smallButton, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.smallButtonText, { color: theme.textSecondary }]}>Copiar código</Text>
          </Pressable>
        </View>
        {copyFeedback ? <Text style={styles.successBanner}>{copyFeedback}</Text> : null}
      </AnimatedSection>

      {/* ── Marca da empresa ───────────────────────────────────────── */}
      <AnimatedSection delay={230} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Marca da empresa</Text>
        <Text style={[styles.cardSubtitleSmall, { color: theme.textSecondary, marginTop: 4 }]}>
          A logo e o nome aparecem no topo do seu link de agendamento.
        </Text>

        <View style={[styles.serviceRowWithThumb, { marginTop: 12 }]}>
          <View style={[styles.serviceThumb, { width: 72, height: 72, borderRadius: 20 }]}>
            {branding?.logo_url ? (
              <Image source={{ uri: branding.logo_url }} style={styles.serviceThumbImage} />
            ) : (
              <Text style={[styles.serviceThumbPlaceholder, { fontSize: 24 }]}>
                {((branding?.business_name || displayName || "A")[0] ?? "A").toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.serviceThumbActions}>
              <Pressable
                onPress={handlePickLogo}
                disabled={uploadingLogo}
                style={styles.imagePickerBtn}
              >
                <Text style={styles.imagePickerBtnText}>
                  {uploadingLogo ? "…" : branding?.logo_url ? "Trocar logo" : "Enviar logo"}
                </Text>
              </Pressable>
              {branding?.logo_url ? (
                <Pressable
                  onPress={handleRemoveLogo}
                  disabled={uploadingLogo}
                  style={styles.imagePickerDangerBtn}
                >
                  <Text style={styles.imagePickerDangerBtnText}>Remover</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.appointmentMeta,
            { color: theme.textSecondary, marginTop: 14, marginBottom: 6 },
          ]}
        >
          Nome da sua empresa
        </Text>
        <TextInput
          value={businessNameDraft}
          onChangeText={setBusinessNameDraft}
          placeholder="Ex: Studio Aurora Beauty"
          placeholderTextColor={theme.textSecondary}
          maxLength={80}
          style={[
            styles.input,
            { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
          ]}
        />
        <Pressable
          onPress={handleSaveBusinessName}
          disabled={savingBrand}
          style={[
            styles.button,
            styles.refreshButton,
            { backgroundColor: theme.buttonPrimary, marginTop: 8 },
            savingBrand && styles.buttonDisabled,
          ]}
        >
          <Text style={[styles.buttonText, { color: theme.buttonPrimaryText }]}>
            {savingBrand ? "Salvando…" : "Salvar nome"}
          </Text>
        </Pressable>

        {brandError ? <Text style={styles.errorBanner}>{brandError}</Text> : null}
        {brandFeedback ? <Text style={styles.successBanner}>{brandFeedback}</Text> : null}
      </AnimatedSection>
    </View>
  );
}
