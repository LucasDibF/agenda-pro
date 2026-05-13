// ─── Agendamentos ────────────────────────────────────────────────────────────

export type AppointmentStatus = "agendado" | "confirmado" | "cancelado" | "concluido";

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

// Supabase retorna joins como array; este tipo cobre os dois formatos
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

export type UpcomingAppointmentSelectRow = Omit<UpcomingAppointmentRow, "service"> & {
  service: Array<{ name: string }> | { name: string } | null;
};

// ─── Serviços ────────────────────────────────────────────────────────────────

export type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

// ─── Disponibilidade ─────────────────────────────────────────────────────────

export type AvailabilityRow = {
  id: string;
  weekday: number; // 0 = Domingo … 6 = Sábado
  start_time: string; // "HH:mm:ss"
  end_time: string;   // "HH:mm:ss"
  slot_interval_minutes: number;
  is_active: boolean;
};

// ─── Bloqueios de horário ────────────────────────────────────────────────────

export type BlockedTimeRow = {
  id: string;
  start_at: string; // ISO 8601
  end_at: string;   // ISO 8601
  reason: string | null;
};

// ─── Booking público ─────────────────────────────────────────────────────────

export type BookedSlotRow = {
  start_time: string;
  end_time: string;
};

export type SlotOption = {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
};
