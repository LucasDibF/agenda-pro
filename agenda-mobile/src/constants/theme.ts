// ─── Constantes de tema, layout e configuração ───────────────────────────────

import type { AppTab, AppointmentStatus, ParticleDepth, ThemeMode, ThemeTokens } from "../types";

// ─── Versão do app ────────────────────────────────────────────────────────────

export const APP_VERSION = "1.0.1";

// ─── URL base do web app (para links de booking) ─────────────────────────────
// Produção padrão: lash-agenda.vercel.app (override via EXPO_PUBLIC_WEB_APP_URL / EAS).

const resolvedWebUrl =
  process.env.EXPO_PUBLIC_WEB_APP_URL?.trim() || "https://lash-agenda.vercel.app";

export const webAppBaseUrl = resolvedWebUrl.replace(/\/+$/, "");

// ─── Temas (dark / light) ────────────────────────────────────────────────────

export const APP_THEMES: Record<ThemeMode, ThemeTokens> = {
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

// ─── Partículas animadas do fundo ────────────────────────────────────────────

const PARTICLE_COUNT = 100;

export const PARTICLE_LAYOUT: Array<{
  top: number;
  left: number;
  size: number;
  depth: ParticleDepth;
}> = Array.from({ length: PARTICLE_COUNT }, (_, index) => {
  const depth: ParticleDepth = index % 3 === 0 ? "near" : index % 3 === 1 ? "mid" : "far";
  const size = 3 + (index % 4);
  const top = 4 + ((index * 37) % 92);
  const left = 4 + ((index * 53) % 92);
  return { top, left, size, depth };
});

// ─── Tabs de navegação ────────────────────────────────────────────────────────

export const tabs: Array<{ value: AppTab; label: string }> = [
  { value: "dashboard", label: "Dashboard" },
  { value: "services", label: "Serviços" },
  { value: "agenda", label: "Agenda" },
  { value: "availability", label: "Disponibilidade" },
  { value: "blocked", label: "Bloqueios" },
];

// ─── Opções de status do agendamento ─────────────────────────────────────────

export const statusOptions: Array<{ value: AppointmentStatus; label: string }> = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "concluido", label: "Concluido" },
];

// ─── Opções de dia da semana ──────────────────────────────────────────────────

export const weekdayOptions: Array<{ value: number; label: string }> = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];
