"use client";

import { useMemo, useState } from "react";

type BookingCalendarProps = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

type CalendarDay = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isPast: boolean;
};

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);

export function BookingCalendar({ selectedDate, onSelectDate }: BookingCalendarProps) {
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) return new Date(`${selectedDate}T00:00:00`);
    return new Date();
  });

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstWeekday);

    const generatedDays: CalendarDay[] = [];

    for (let i = 0; i < 42; i += 1) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      generatedDays.push({
        date,
        dateKey: toDateKey(date),
        isCurrentMonth: date.getMonth() === month,
        isPast: dateOnly < today,
      });
    }

    return generatedDays;
  }, [today, viewDate]);

  const monthLabel = getMonthLabel(viewDate);

  return (
    <div className="elevated-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
          }
          className="btn-soft px-3 py-1.5 text-xs"
        >
          Anterior
        </button>

        <p className="text-sm font-semibold capitalize text-[var(--ink-strong)]">{monthLabel}</p>

        <button
          type="button"
          onClick={() =>
            setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
          }
          className="btn-soft px-3 py-1.5 text-xs"
        >
          Proximo
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[var(--foreground)]/75">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const isSelected = selectedDate === day.dateKey;

          return (
            <button
              key={day.dateKey}
              type="button"
              disabled={day.isPast}
              onClick={() => onSelectDate(day.dateKey)}
              className={`rounded-lg border px-2 py-2 text-sm transition ${
                isSelected
                  ? "border-[var(--accent-dark)] bg-[var(--accent)] text-white"
                  : day.isCurrentMonth
                    ? "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-strong)] hover:bg-[var(--surface-soft)]"
                    : "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--foreground)]/55"
              } ${day.isPast ? "cursor-not-allowed opacity-40" : ""}`}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
