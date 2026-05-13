// ─── Geração de slots de horário disponíveis ──────────────────────────────────
//
// Algoritmo central do booking: dados a disponibilidade semanal da profissional,
// os bloqueios e os horários já ocupados, retorna os slots livres para um serviço
// específico em uma data específica.

import type { AvailabilityRow, BlockedTimeRow, BookedSlotRow, SlotOption } from "@/types/domain";
import { toLocalDateInput } from "@/lib/utils/date";

/** "HH:mm:ss" ou qualquer string de tempo → "HH:mm" */
export const normalizeTime = (timeInput: string): string => timeInput.slice(0, 5);

/** Une data "YYYY-MM-DD" + hora "HH:mm" num objeto Date */
export const combineDateAndTime = (dateInput: string, timeInput: string): Date =>
  new Date(`${dateInput}T${normalizeTime(timeInput)}:00`);

/** Verifica sobreposição entre dois intervalos semi-abertos [aStart, aEnd) */
export const hasOverlap = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean =>
  aStart < bEnd && bStart < aEnd;

type GenerateSlotsParams = {
  selectedDate: string;
  serviceDurationMinutes: number;
  availabilityRows: AvailabilityRow[];
  blockedRows: BlockedTimeRow[];
  bookedSlots: BookedSlotRow[];
};

/**
 * Retorna todos os slots disponíveis para uma data, serviço e disponibilidade dados.
 * Exclui slots passados (para o dia de hoje), slots sobrepostos com bloqueios
 * e slots já ocupados por agendamentos confirmados/agendados.
 */
export function generateSlots({
  selectedDate,
  serviceDurationMinutes,
  availabilityRows,
  blockedRows,
  bookedSlots,
}: GenerateSlotsParams): SlotOption[] {
  const weekday = new Date(`${selectedDate}T00:00:00`).getDay();
  const dayAvailability = availabilityRows.filter((row) => row.weekday === weekday);
  if (dayAvailability.length === 0) return [];

  const now = new Date();
  const isToday = selectedDate === toLocalDateInput(now);
  const slots: SlotOption[] = [];

  for (const row of dayAvailability) {
    const startWindow = combineDateAndTime(selectedDate, row.start_time);
    const endWindow = combineDateAndTime(selectedDate, row.end_time);
    // O passo é a duração do serviço + intervalo entre atendimentos
    const stepMs = Math.max(serviceDurationMinutes + row.slot_interval_minutes, 1) * 60_000;

    let cursor = new Date(startWindow);
    while (true) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(slotStart.getTime() + serviceDurationMinutes * 60_000);

      if (slotEnd > endWindow) break;

      if (isToday && slotStart <= now) {
        cursor = new Date(cursor.getTime() + stepMs);
        continue;
      }

      const overlapsBlocked = blockedRows.some((blocked) =>
        hasOverlap(slotStart, slotEnd, new Date(blocked.start_at), new Date(blocked.end_at))
      );
      const overlapsBooked = bookedSlots.some((booked) =>
        hasOverlap(
          slotStart,
          slotEnd,
          combineDateAndTime(selectedDate, booked.start_time),
          combineDateAndTime(selectedDate, booked.end_time)
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
