// ─── Constantes de tema, layout e configuração ───────────────────────────────

import type { AppTab, AppointmentStatus, ParticleDepth, ThemeMode, ThemeTokens } from "../types";
import { normalizeBookingPublicSlug } from "../utils/booking-link";

// ─── Versão do app ────────────────────────────────────────────────────────────

export const APP_VERSION = "1.0.11";

// ─── URL base para links públicos `/booking/[slug]` ───────────────────────────
// Alinhado com `NEXT_PUBLIC_BOOKING_APP_URL` + `PUBLIC_BOOKING_APP_FALLBACK` em web.
// Prioridade em app: EXPO_PUBLIC_BOOKING_APP_URL → EXPO_PUBLIC_WEB_APP_URL → plum embutido.

const BOOKING_WORKING_SITE_URL = "https://agendaonline-plum.vercel.app";

const LEGACY_BOOKING_HOSTS = new Set([
  "lash-agenda-plum.vercel.app",
  "lash-agenda.vercel.app",
  "lash-agenda-k66ipli1j-lucas-freitas-dibs-projects.vercel.app",
]);

function normalizeHttpsOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const { protocol, hostname, host } = new URL(withScheme);
    if (LEGACY_BOOKING_HOSTS.has(hostname)) return BOOKING_WORKING_SITE_URL.replace(/\/+$/, "");
    return `${protocol}//${host}`.replace(/\/+$/, "");
  } catch {
    return BOOKING_WORKING_SITE_URL.replace(/\/+$/, "");
  }
}

function resolveWebAppBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();
  if (fromEnv?.length) return normalizeHttpsOrigin(fromEnv);
  return BOOKING_WORKING_SITE_URL.replace(/\/+$/, "");
}

function resolveBookingAppBaseUrl(): string {
  const bookingEnv = process.env.EXPO_PUBLIC_BOOKING_APP_URL?.trim();
  if (bookingEnv?.length) return normalizeHttpsOrigin(bookingEnv);
  return resolveWebAppBaseUrl();
}

/** Base do site (área logada, etc.); hoje costuma ser a mesma do deploy. */
export const webAppBaseUrl = resolveWebAppBaseUrl();

/** Base usada só para montar links de agendamento público. */
export const bookingAppBaseUrl = resolveBookingAppBaseUrl();

export function publicBookingPageUrl(bookingSlug: string): string {
  const trimmed = normalizeBookingPublicSlug(bookingSlug);
  const base = bookingAppBaseUrl.replace(/\/+$/, "");
  if (!trimmed.length) return `${base}/booking/`;
  return `${base}/booking/${encodeURIComponent(trimmed)}`;
}

// ─── Temas (dark / light) ────────────────────────────────────────────────────

export const APP_THEMES: Record<ThemeMode, ThemeTokens> = {
  dark: {
    background: "#100A1F",
    card: "#1A1330",
    border: "#2D2349",
    textPrimary: "#F0EAFF",
    textSecondary: "#C4B8E0",
    accent: "#C084FC",
    accentSoft: "#2A1F47",
    buttonPrimary: "#A855F7",
    buttonPrimaryText: "#FFFFFF",
    tabBg: "#1A1330",
    tabText: "#C4B8E0",
    tabSelectedBg: "#A855F7",
    tabSelectedText: "#FFFFFF",
  },
  light: {
    background: "#FBF9FF",
    card: "#FFFFFF",
    border: "#ECE6F7",
    textPrimary: "#0F0A1A",
    textSecondary: "#5B4F72",
    accent: "#7C3AED",
    accentSoft: "#F3E8FF",
    buttonPrimary: "#7C3AED",
    buttonPrimaryText: "#FFFFFF",
    tabBg: "#FFFFFF",
    tabText: "#5B4F72",
    tabSelectedBg: "#7C3AED",
    tabSelectedText: "#FFFFFF",
  },
};

// ─── Partículas animadas do fundo ────────────────────────────────────────────

const PARTICLE_COUNT = 100;

export const PARTICLE_LAYOUT: {
  top: number;
  left: number;
  size: number;
  depth: ParticleDepth;
}[] = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const depth: ParticleDepth = index % 3 === 0 ? "near" : index % 3 === 1 ? "mid" : "far";
  const size = 3 + (index % 4);
  const top = 4 + ((index * 37) % 92);
  const left = 4 + ((index * 53) % 92);
  return { top, left, size, depth };
});

// ─── Tabs de navegação ────────────────────────────────────────────────────────

export const tabs: { value: AppTab; label: string }[] = [
  { value: "dashboard", label: "Painel" },
  { value: "services", label: "Serviços" },
  { value: "agenda", label: "Agenda" },
  { value: "availability", label: "Disponibilidade" },
  { value: "blocked", label: "Bloqueios" },
];

// ─── Opções de status do agendamento ─────────────────────────────────────────

export const statusOptions: { value: AppointmentStatus; label: string }[] = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "concluido", label: "Concluido" },
];

// ─── Opções de dia da semana ──────────────────────────────────────────────────

export const weekdayOptions: { value: number; label: string }[] = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];
