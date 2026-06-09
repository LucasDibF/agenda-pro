"use client";

import { useMemo, useState } from "react";

type BookingCalendarProps = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

type WeekDay = {
  date: Date;
  dateKey: string;
  isToday: boolean;
  isPast: boolean;
};

const weekdayShort = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const monthShort = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Domingo da semana que contém `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function BookingCalendar({ selectedDate, onSelectDate }: BookingCalendarProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const base = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
    return getWeekStart(base);
  });

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const days = useMemo<WeekDay[]>(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return {
        date: d,
        dateKey: toDateKey(d),
        isToday: toDateKey(d) === toDateKey(today),
        isPast: d < today,
      };
    });
  }, [weekStart, today]);

  const rangeLabel = useMemo(() => {
    const first = days[0]?.date;
    const last = days[6]?.date;
    if (!first || !last) return "";
    if (first.getMonth() === last.getMonth()) {
      return `${first.getDate()} - ${last.getDate()} ${monthShort[first.getMonth()]}`;
    }
    return `${first.getDate()} ${monthShort[first.getMonth()]} - ${last.getDate()} ${
      monthShort[last.getMonth()]
    }`;
  }, [days]);

  const goPrevWeek = () => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() - 7);
    setWeekStart(next);
  };

  const goNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + 7);
    setWeekStart(next);
  };

  const prevDisabled = days[6]?.date && days[6].date < today;

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrevWeek}
          disabled={prevDisabled}
          aria-label="Semana anterior"
          className="flex h-9 w-9 items-center justify-center rounded-full border text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-softer)] hover:text-[var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ borderColor: "var(--line)" }}
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path
              d="M10 12L6 8l4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <p className="text-sm font-semibold text-[var(--ink-strong)]">{rangeLabel}</p>

        <button
          type="button"
          onClick={goNextWeek}
          aria-label="Próxima semana"
          className="flex h-9 w-9 items-center justify-center rounded-full border text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-softer)] hover:text-[var(--accent-dark)]"
          style={{ borderColor: "var(--line)" }}
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const isSelected = selectedDate === day.dateKey;
          const isDisabled = day.isPast;

          let cls =
            "relative flex flex-col items-center justify-center gap-1 rounded-2xl py-3 text-center transition-all duration-150";

          if (isDisabled) {
            cls += " cursor-not-allowed opacity-35 text-[var(--text-muted)]";
          } else if (isSelected) {
            cls += " text-white";
          } else {
            cls += " text-[var(--text-secondary)] hover:bg-[var(--accent-softer)] hover:text-[var(--accent-dark)]";
          }

          const style = isSelected
            ? {
                background:
                  "linear-gradient(135deg, var(--accent-grad-from), var(--accent-grad-to))",
                boxShadow: "0 6px 16px -4px rgba(124, 58, 237, 0.5)",
              }
            : undefined;

          return (
            <button
              key={day.dateKey}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectDate(day.dateKey)}
              className={cls}
              style={style}
            >
              <span
                className={`text-[0.65rem] font-semibold uppercase tracking-wide ${
                  isSelected ? "text-white/85" : "text-[var(--text-muted)]"
                }`}
              >
                {weekdayShort[day.date.getDay()]}
              </span>
              <span
                className={`text-base font-bold ${
                  isSelected ? "text-white" : "text-[var(--ink-strong)]"
                }`}
              >
                {day.date.getDate()}
              </span>
              {day.isToday && !isSelected ? (
                <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-[var(--accent)]" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
