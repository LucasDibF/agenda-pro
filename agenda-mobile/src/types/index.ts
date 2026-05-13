// ─── Tipos de domínio do app mobile ──────────────────────────────────────────

export type AppointmentStatus = "agendado" | "confirmado" | "cancelado" | "concluido";

export type AppTab = "dashboard" | "services" | "agenda" | "availability" | "blocked";

export type ThemeMode = "light" | "dark";

export type ThemeTokens = {
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

export type ParticleDepth = "near" | "mid" | "far";

// ─── Linhas do banco de dados ─────────────────────────────────────────────────

export type AppointmentRow = {
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

// Supabase retorna joins como array ou objeto — este tipo cobre os dois formatos
export type AppointmentSelectRow = Omit<AppointmentRow, "service"> & {
  service: Array<{ name: string }> | { name: string } | null;
};

export type UpcomingAppointmentRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  status: AppointmentStatus;
  customer_name: string;
  service: { name: string } | null;
};

export type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export type AvailabilityRow = {
  id: string;
  weekday: number; // 0 = Domingo … 6 = Sábado
  start_time: string;
  end_time: string;
  slot_interval_minutes: number;
  is_active: boolean;
};

export type BlockedTimeRow = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

// ─── Tipos específicos do Dashboard ──────────────────────────────────────────

export type DashboardAppointmentRow = {
  id: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  service: { name: string; price: number } | null;
};

export type DashboardAppointmentSelectRow = {
  id: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  service: Array<{ name: string; price: number }> | { name: string; price: number } | null;
};

// ─── Tipos de slot (Agenda / Reagendamento) ───────────────────────────────────

export type SlotOption = {
  startTime: string;
  endTime: string;
};

export type BookedRange = {
  start_time: string;
  end_time: string;
};
