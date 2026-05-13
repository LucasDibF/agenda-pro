// ─── Utilitários do app mobile ────────────────────────────────────────────────

import type { User } from "@supabase/supabase-js";
import type { AppointmentRow, AvailabilityRow, SlotOption } from "../types";
import { supabase } from "../lib/supabase";

// ─── Data e hora ──────────────────────────────────────────────────────────────

/** Date → "YYYY-MM-DD" */
export const toIsoDate = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** "YYYY-MM-DD" → "DD/MM/YYYY" */
export const formatDateBr = (dateInput: string): string => {
  const [year, month, day] = dateInput.split("-");
  return `${day}/${month}/${year}`;
};

/** "HH:mm:ss" ou qualquer string de tempo → "HH:mm" */
export const formatHour = (time: string): string => time.slice(0, 5);

/** ISO 8601 → "dd/mm/aaaa HH:mm" (pt-BR) */
export const formatDateTimeBr = (isoDateString: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDateString));

/** Date → { date: "YYYY-MM-DD", time: "HH:mm" } */
export const toDateAndTimeInput = (date: Date): { date: string; time: string } => {
  const datePart = toIsoDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return { date: datePart, time: `${hours}:${minutes}` };
};

/** Valida e monta uma Date a partir de strings de data e hora. Retorna null se inválido. */
export const parseDateTimeInput = (dateInput: string, timeInput: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return null;
  if (!/^\d{2}:\d{2}$/.test(timeInput)) return null;
  const parsed = new Date(`${dateInput}T${timeInput}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

// ─── Formatação monetária ─────────────────────────────────────────────────────

/** Número → "0,00" (sem símbolo de moeda) */
export const formatMoneyBr = (value: number): string => Number(value).toFixed(2).replace(".", ",");

// ─── Slots de horário ─────────────────────────────────────────────────────────

/** Extrai "HH:mm" de qualquer string de tempo */
export const normalizeTime = (timeInput: string): string => timeInput.slice(0, 5);

/** Une data "YYYY-MM-DD" + hora em um objeto Date */
export const combineDateAndTime = (dateInput: string, timeInput: string): Date =>
  new Date(`${dateInput}T${normalizeTime(timeInput)}:00`);

/** Detecta sobreposição entre dois intervalos semi-abertos [start, end) */
export const hasOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean =>
  aStart < bEnd && bStart < aEnd;

/** Calcula a duração em minutos entre dois horários "HH:mm" */
export const getDurationMinutes = (startTime: string, endTime: string): number => {
  const [startHour, startMinute] = normalizeTime(startTime).split(":").map(Number);
  const [endHour, endMinute] = normalizeTime(endTime).split(":").map(Number);
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  return Math.max(endTotal - startTotal, 1);
};

/**
 * Gera os slots disponíveis para reagendamento de um agendamento.
 * Exclui slots passados, bloqueados e já ocupados.
 */
export function generateRescheduleSlots(params: {
  rescheduleDate: string;
  durationMinutes: number;
  availabilityRows: AvailabilityRow[];
  blockedRows: Array<{ start_at: string; end_at: string }>;
  bookedRows: Array<{ start_time: string; end_time: string }>;
  excludeAppointmentId: string;
}): SlotOption[] {
  const { rescheduleDate, durationMinutes, availabilityRows, blockedRows, bookedRows } = params;
  const now = new Date();
  const isToday = rescheduleDate === toIsoDate();
  const slots: SlotOption[] = [];

  for (const row of availabilityRows) {
    const startWindow = combineDateAndTime(rescheduleDate, row.start_time);
    const endWindow = combineDateAndTime(rescheduleDate, row.end_time);
    const stepMs = Math.max(durationMinutes + row.slot_interval_minutes, 1) * 60_000;
    let cursor = new Date(startWindow);

    while (true) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);
      if (slotEnd > endWindow) break;
      if (isToday && slotStart <= now) {
        cursor = new Date(cursor.getTime() + stepMs);
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
        slots.push({
          startTime: normalizeTime(slotStart.toTimeString()),
          endTime: normalizeTime(slotEnd.toTimeString()),
        });
      }

      cursor = new Date(cursor.getTime() + stepMs);
    }
  }

  return slots;
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

/** Remove máscara e adiciona +55. Retorna null se número inválido. */
export const normalizePhoneForWhatsapp = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
};

/** Monta URL wa.me com mensagem de confirmação do agendamento. */
export const buildWhatsappUrlForAppointment = (appointment: AppointmentRow): string | null => {
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

// ─── Perfil ───────────────────────────────────────────────────────────────────

/** Cria ou atualiza o perfil da profissional logada. Retorna erro ou null. */
export const ensureProfessionalProfile = async (user: User) => {
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
