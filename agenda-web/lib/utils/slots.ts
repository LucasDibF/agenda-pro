// ─── Geração de slots de horário disponíveis ──────────────────────────────────

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

/** Janela de intervalo diário (almoco/pausa); aplicada em todos os dias com disponibilidade. */
export type DailyBreakWindow = {
  startTime: string;
  endTime: string;
};

type MinuteInterval = [start: number, end: number];

function dayStartMs(selectedDate: string): number {
  return combineDateAndTime(selectedDate, "00:00").getTime();
}

function toMinuteInterval(selectedDate: string, start: Date, end: Date): MinuteInterval | null {
  const dayStart = dayStartMs(selectedDate);
  const dayEnd = dayStart + 24 * 60 * 60_000;
  const clipStart = Math.max(start.getTime(), dayStart);
  const clipEnd = Math.min(end.getTime(), dayEnd);
  if (clipStart >= clipEnd) return null;
  return [
    Math.floor((clipStart - dayStart) / 60_000),
    Math.ceil((clipEnd - dayStart) / 60_000),
  ];
}

function intervalOverlaps(a: MinuteInterval, b: MinuteInterval): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

function buildBlockedIntervals(selectedDate: string, blockedRows: BlockedTimeRow[]): MinuteInterval[] {
  return blockedRows
    .map((blocked) => toMinuteInterval(selectedDate, new Date(blocked.start_at), new Date(blocked.end_at)))
    .filter((interval): interval is MinuteInterval => interval !== null);
}

function buildBookedIntervals(selectedDate: string, bookedSlots: BookedSlotRow[]): MinuteInterval[] {
  return bookedSlots.map((booked) =>
    toMinuteInterval(
      selectedDate,
      combineDateAndTime(selectedDate, booked.start_time),
      combineDateAndTime(selectedDate, booked.end_time),
    ),
  ).filter((interval): interval is MinuteInterval => interval !== null);
}

function buildDailyBreakInterval(
  selectedDate: string,
  dailyBreak: DailyBreakWindow | null | undefined,
): MinuteInterval | null {
  if (!dailyBreak?.startTime || !dailyBreak?.endTime) return null;
  return toMinuteInterval(
    selectedDate,
    combineDateAndTime(selectedDate, dailyBreak.startTime),
    combineDateAndTime(selectedDate, dailyBreak.endTime),
  );
}

function slotOverlapsAny(slot: MinuteInterval, intervals: MinuteInterval[]): boolean {
  for (const interval of intervals) {
    if (intervalOverlaps(slot, interval)) return true;
  }
  return false;
}

type GenerateSlotsParams = {
  selectedDate: string;
  serviceDurationMinutes: number;
  availabilityRows: AvailabilityRow[];
  blockedRows: BlockedTimeRow[];
  bookedSlots: BookedSlotRow[];
  dailyBreak?: DailyBreakWindow | null;
};

export function generateSlots({
  selectedDate,
  serviceDurationMinutes,
  availabilityRows,
  blockedRows,
  bookedSlots,
  dailyBreak,
}: GenerateSlotsParams): SlotOption[] {
  const weekday = new Date(`${selectedDate}T00:00:00`).getDay();
  const dayAvailability = availabilityRows.filter((row) => row.weekday === weekday);
  if (dayAvailability.length === 0) return [];

  const blockedIntervals = buildBlockedIntervals(selectedDate, blockedRows);
  const bookedIntervals = buildBookedIntervals(selectedDate, bookedSlots);
  const breakInterval = buildDailyBreakInterval(selectedDate, dailyBreak);
  const conflictIntervals = breakInterval
    ? [...blockedIntervals, ...bookedIntervals, breakInterval]
    : [...blockedIntervals, ...bookedIntervals];

  const now = new Date();
  const isToday = selectedDate === toLocalDateInput(now);
  const dayStart = dayStartMs(selectedDate);
  const slots: SlotOption[] = [];

  for (const row of dayAvailability) {
    const startWindow = combineDateAndTime(selectedDate, row.start_time);
    const endWindow = combineDateAndTime(selectedDate, row.end_time);
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

      const slotInterval: MinuteInterval = [
        Math.floor((slotStart.getTime() - dayStart) / 60_000),
        Math.ceil((slotEnd.getTime() - dayStart) / 60_000),
      ];

      if (!slotOverlapsAny(slotInterval, conflictIntervals)) {
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
