"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import type {
  ServiceRow,
  AvailabilityRow,
  BlockedTimeRow,
  BookedSlotRow,
  SlotOption,
} from "@/types/domain";
import { toLocalDateInput, formatDateBr } from "@/lib/utils/date";
import { formatCurrencyBRL } from "@/lib/utils/format";
import { generateSlots, normalizeTime, type DailyBreakWindow } from "@/lib/utils/slots";
import { BookingCalendar } from "@/components/public/booking-calendar";
import { submitPublicBooking } from "@/app/(public)/booking/actions";

/** Alinhado ao `resolve_professional_id` no Postgres (variante típica). */
const IDENTIFIER_UUID_STRICT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Se o RPC falhar (rede/cache), aceita formato UUID RFC comum. */
const IDENTIFIER_UUID_LOOSE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeRouteIdentifier(raw: string): string {
  const t = raw.trim();
  if (!t.includes("%")) return t;
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

function looksLikeUuidForBooking(trimmed: string): boolean {
  return IDENTIFIER_UUID_STRICT.test(trimmed) || IDENTIFIER_UUID_LOOSE.test(trimmed);
}

// ─── Estado do formulário do cliente ─────────────────────────────────────────

type BookingFormState = {
  customerName: string;
  customerPhone: string;
  notes: string;
};

const emptyForm: BookingFormState = {
  customerName: "",
  customerPhone: "",
  notes: "",
};

function slotOptionToBookedSlotRow(slot: SlotOption): BookedSlotRow {
  return {
    start_time: /^\d{2}:\d{2}$/.test(slot.startTime) ? `${slot.startTime}:00` : slot.startTime,
    end_time: /^\d{2}:\d{2}$/.test(slot.endTime) ? `${slot.endTime}:00` : slot.endTime,
  };
}

function parseDailyBreakRpc(payload: unknown): DailyBreakWindow | null {
  if (payload == null || typeof payload !== "object") return null;
  const o = payload as Record<string, unknown>;
  const s = o.break_start_time;
  const e = o.break_end_time;
  if (s == null || e == null) return null;
  const st = typeof s === "string" ? s : String(s);
  const et = typeof e === "string" ? e : String(e);
  return { startTime: normalizeTime(st), endTime: normalizeTime(et) };
}

type BookingFlowProps = {
  professionalIdentifier: string;
  initialProfessionalId?: string | null;
  initialServices?: ServiceRow[];
  initialAvailability?: AvailabilityRow[];
};

type StepKey = "service" | "datetime" | "details" | "done";

// ─── Ícones SVG inline ───────────────────────────────────────────────────────

function IconClock({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5V8l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCheck({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronLeft({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChevronRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={`${className} animate-spin`}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSparkle({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <path
        d="M8 2v3M8 11v3M2 8h3M11 8h3M4 4l2 2M10 10l2 2M12 4l-2 2M6 10l-2 2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getServiceInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Gera um gradient determinístico baseado no nome (para o avatar do serviço).
 * Sempre na faixa lavanda/roxo — combina com o resto do app.
 */
function getServiceAvatarStyle(name: string): React.CSSProperties {
  const hash = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hue = 260 + (hash % 40); // 260–300 (violet → fuchsia)
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 80%, 75%) 0%, hsl(${hue - 20}, 70%, 55%) 100%)`,
  };
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  const bar = "rounded-2xl bg-[var(--surface-soft)]";
  return (
    <div className="elevated-card p-6 sm:p-8" aria-label="Carregando">
      <div className="space-y-4">
        <div className={`${bar} h-10 w-full`} />
        <div className={`${bar} h-20 w-full`} />
        <div className={`${bar} h-20 w-full`} />
        <div className={`${bar} h-20 w-full`} />
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export function BookingFlow({
  professionalIdentifier,
  initialProfessionalId = null,
  initialServices,
  initialAvailability,
}: BookingFlowProps) {
  const hasServerBootstrap =
    initialProfessionalId != null &&
    initialServices !== undefined &&
    initialAvailability !== undefined;

  const [professionalId, setProfessionalId] = useState<string | null>(initialProfessionalId);
  const [services, setServices] = useState<ServiceRow[]>(initialServices ?? []);
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityRow[]>(initialAvailability ?? []);
  const [blockedRows, setBlockedRows] = useState<BlockedTimeRow[]>([]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlotRow[]>([]);
  const [dailyBreakLoaded, setDailyBreakLoaded] = useState<{
    professionalId: string;
    window: DailyBreakWindow | null;
  } | null>(null);

  const dailyBreak =
    professionalId && dailyBreakLoaded?.professionalId === professionalId
      ? dailyBreakLoaded.window
      : null;

  const [selectedServiceId, setSelectedServiceId] = useState(initialServices?.[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = useState(toLocalDateInput(new Date()));
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [form, setForm] = useState<BookingFormState>(emptyForm);
  const [step, setStep] = useState<StepKey>("service");

  const [loading, setLoading] = useState(!hasServerBootstrap);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmation, setConfirmation] = useState<{
    serviceName: string;
    dateLabel: string;
    time: string;
    customer: string;
  } | null>(null);

  const selectedDateRef = useRef(selectedDate);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  // ── 1) Resolve identificador da profissional ──────────────────────────────

  useEffect(() => {
    if (hasServerBootstrap || professionalId) return;

    const resolveProfessional = async () => {
      setLoading(true);
      setErrorMessage("");

      const trimmed = decodeRouteIdentifier(professionalIdentifier);
      if (!trimmed) {
        setErrorMessage("Código da profissional inválido.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("resolve_professional_id", {
        p_identifier: trimmed,
      });

      if (error) {
        if (looksLikeUuidForBooking(trimmed)) {
          setProfessionalId(trimmed);
          return;
        }
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        if (looksLikeUuidForBooking(trimmed)) {
          setProfessionalId(trimmed);
          return;
        }
        setErrorMessage("Código da profissional não encontrado.");
        setLoading(false);
        return;
      }

      setProfessionalId(data as string);
    };

    resolveProfessional();
  }, [professionalIdentifier, hasServerBootstrap, professionalId]);

  useEffect(() => {
    if (!professionalId) return;

    let cancelled = false;

    const loadBootstrapData = async () => {
      if (!hasServerBootstrap) {
        setLoading(true);
        setErrorMessage("");
      }

      try {
        if (hasServerBootstrap) {
          const { data, error } = await supabase.rpc("get_professional_daily_break", {
            p_professional_id: professionalId,
          });
          if (cancelled) return;
          const window = error ? null : parseDailyBreakRpc(data);
          setDailyBreakLoaded({ professionalId, window });
          return;
        }

        const [servicesRes, availabilityRes, dailyBreakRes] = await Promise.all([
          supabase
            .from("services")
            .select("id, name, duration_minutes, price, description, is_active, created_at")
            .eq("professional_id", professionalId)
            .eq("is_active", true)
            .order("created_at", { ascending: false }),
          supabase
            .from("availability")
            .select("id, weekday, start_time, end_time, slot_interval_minutes, is_active")
            .eq("professional_id", professionalId)
            .eq("is_active", true)
            .order("weekday", { ascending: true })
            .order("start_time", { ascending: true }),
          supabase.rpc("get_professional_daily_break", {
            p_professional_id: professionalId,
          }),
        ]);

        if (cancelled) return;

        if (servicesRes.error) {
          setErrorMessage(servicesRes.error.message);
          return;
        }
        if (availabilityRes.error) {
          setErrorMessage(availabilityRes.error.message);
          return;
        }

        const fetchedServices = (servicesRes.data ?? []) as ServiceRow[];
        setServices(fetchedServices);
        setAvailabilityRows((availabilityRes.data ?? []) as AvailabilityRow[]);
        if (fetchedServices.length > 0) setSelectedServiceId(fetchedServices[0].id);

        const window = dailyBreakRes.error ? null : parseDailyBreakRpc(dailyBreakRes.data);
        setDailyBreakLoaded({ professionalId, window });
      } finally {
        if (!cancelled && !hasServerBootstrap) setLoading(false);
      }
    };

    void loadBootstrapData();
    return () => {
      cancelled = true;
    };
  }, [professionalId, hasServerBootstrap]);

  // ── 3) Atualiza bloqueios e slots ao mudar data ───────────────────────────

  useEffect(() => {
    if (!professionalId || !selectedDate) return;

    const loadDateData = async () => {
      setErrorMessage("");
      const dayStartIso = new Date(`${selectedDate}T00:00:00`).toISOString();
      const dayEndIso = new Date(`${selectedDate}T23:59:59`).toISOString();

      const [blockedRes, bookedRes] = await Promise.all([
        supabase
          .from("blocked_times")
          .select("id, start_at, end_at, reason")
          .eq("professional_id", professionalId)
          .lt("start_at", dayEndIso)
          .gt("end_at", dayStartIso),
        supabase.rpc("get_booked_slots", {
          p_professional_id: professionalId,
          p_date: selectedDate,
        }),
      ]);

      if (blockedRes.error) {
        setErrorMessage(blockedRes.error.message);
        return;
      }
      if (bookedRes.error) {
        setErrorMessage(bookedRes.error.message);
        return;
      }

      setBlockedRows((blockedRes.data ?? []) as BlockedTimeRow[]);
      setBookedSlots((bookedRes.data ?? []) as BookedSlotRow[]);
      setSelectedStartTime("");
    };

    void loadDateData();
  }, [professionalId, selectedDate]);

  // ── 4) Slots disponíveis ──────────────────────────────────────────────────

  const slotOptions: SlotOption[] = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    return generateSlots({
      selectedDate,
      serviceDurationMinutes: selectedService.duration_minutes,
      availabilityRows,
      blockedRows,
      bookedSlots,
      dailyBreak,
    });
  }, [availabilityRows, blockedRows, bookedSlots, dailyBreak, selectedDate, selectedService]);

  // ── Submissão ─────────────────────────────────────────────────────────────

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!professionalId) {
      setErrorMessage("Profissional não identificada. Recarregue a página.");
      return;
    }
    if (!selectedService) {
      setErrorMessage("Selecione um serviço para continuar.");
      return;
    }
    if (!selectedDate || !selectedStartTime) {
      setErrorMessage("Selecione uma data e um horário disponível.");
      return;
    }
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      setErrorMessage("Informe seu nome e telefone para confirmar.");
      return;
    }

    const selectedSlot = slotOptions.find((slot) => slot.startTime === selectedStartTime);
    if (!selectedSlot) {
      setErrorMessage("Horário selecionado não está mais disponível. Escolha outro.");
      return;
    }

    setSubmitting(true);

    const result = await submitPublicBooking({
      professionalId,
      serviceId: selectedService.id,
      appointmentDate: selectedDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      customerName: form.customerName.trim(),
      customerPhone: form.customerPhone.trim(),
      notes: form.notes.trim() || undefined,
    });

    if (!result.ok) {
      setErrorMessage(result.error);
      setSubmitting(false);
      return;
    }

    const bookedSnapshot = slotOptionToBookedSlotRow(selectedSlot);
    setBookedSlots((prev) => {
      if (
        prev.some(
          (b) =>
            normalizeTime(b.start_time) === normalizeTime(bookedSnapshot.start_time) &&
            normalizeTime(b.end_time) === normalizeTime(bookedSnapshot.end_time),
        )
      ) {
        return prev;
      }
      return [...prev, bookedSnapshot].sort((a, b) =>
        normalizeTime(a.start_time).localeCompare(normalizeTime(b.start_time)),
      );
    });

    setConfirmation({
      serviceName: selectedService.name,
      dateLabel: formatDateBr(selectedDate),
      time: selectedStartTime,
      customer: `${form.customerName} · ${form.customerPhone}`,
    });
    setStep("done");
    setSubmitting(false);

    const snapshotDate = selectedDate;
    void supabase
      .rpc("get_booked_slots", {
        p_professional_id: professionalId,
        p_date: snapshotDate,
      })
      .then(({ data, error }) => {
        if (error || data == null) return;
        if (selectedDateRef.current !== snapshotDate) return;
        setBookedSlots(data as BookedSlotRow[]);
      });
  };

  const resetForNewBooking = () => {
    setForm(emptyForm);
    setSelectedStartTime("");
    setConfirmation(null);
    setStep("service");
  };

  // ── Helpers de navegação entre steps ─────────────────────────────────────

  const canGoToStep = (target: StepKey): boolean => {
    if (target === "service") return true;
    if (target === "datetime") return !!selectedService;
    if (target === "details") return !!selectedService && !!selectedStartTime;
    return false;
  };

  const handleStepClick = (target: StepKey) => {
    if (canGoToStep(target)) setStep(target);
  };

  const goNext = () => {
    if (step === "service" && selectedService) setStep("datetime");
    else if (step === "datetime" && selectedStartTime) setStep("details");
  };

  const goBack = () => {
    if (step === "datetime") setStep("service");
    else if (step === "details") setStep("datetime");
  };

  const footerCta = useMemo(() => {
    if (step === "service") {
      return { label: "Continuar", action: goNext, disabled: !selectedService };
    }
    if (step === "datetime") {
      return { label: "Continuar", action: goNext, disabled: !selectedStartTime };
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedService, selectedStartTime]);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <LoadingSkeleton />;

  // Confirmação — tela final
  if (step === "done" && confirmation) {
    return (
      <div className="elevated-card anim-pop overflow-hidden p-8 text-center sm:p-10">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-grad-from), var(--accent-grad-to))",
            boxShadow: "0 12px 30px -8px rgba(124, 58, 237, 0.5)",
          }}
        >
          <IconCheck className="h-8 w-8" />
        </div>
        <h2 className="title-display mt-5 text-2xl">Agendamento confirmado!</h2>
        <p className="text-body-secondary mt-2 text-sm">
          Anote os detalhes abaixo. A profissional foi notificada.
        </p>

        <dl
          className="mt-6 grid gap-3 rounded-2xl p-5 text-left text-sm"
          style={{ background: "var(--surface-soft)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <dt className="text-body-muted">Serviço</dt>
            <dd className="font-semibold text-[var(--ink-strong)]">{confirmation.serviceName}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-body-muted">Data e hora</dt>
            <dd className="font-semibold text-[var(--ink-strong)]">
              {confirmation.dateLabel} · {confirmation.time}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-body-muted">Cliente</dt>
            <dd className="font-semibold text-[var(--ink-strong)]">{confirmation.customer}</dd>
          </div>
        </dl>

        <button type="button" onClick={resetForNewBooking} className="btn-soft mt-6">
          Fazer outro agendamento
        </button>
      </div>
    );
  }

  // Avisos de configuração faltando
  if (services.length === 0 || availabilityRows.length === 0) {
    return (
      <div className="elevated-card p-8 text-center sm:p-10">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[var(--accent-dark)]"
          style={{ background: "var(--accent-soft)" }}
        >
          <IconSparkle className="h-6 w-6" />
        </div>
        <p className="title-display mt-4 text-xl">Agenda não configurada</p>
        <p className="text-body-secondary mt-2 text-sm">
          {services.length === 0
            ? "Esta profissional ainda não cadastrou serviços ativos."
            : "Esta profissional ainda não configurou horários de atendimento."}
        </p>
      </div>
    );
  }

  // ─── Layout principal ────────────────────────────────────────────────────

  const tabs: { key: StepKey; label: string }[] = [
    { key: "service", label: "Serviço" },
    { key: "datetime", label: "Data e hora" },
    { key: "details", label: "Seus dados" },
  ];

  return (
    <>
      <div className="elevated-card overflow-hidden">
        {/* Tabs pills */}
        <nav
          className="flex items-center gap-2 overflow-x-auto px-5 pt-5 sm:px-6"
          aria-label="Etapas do agendamento"
        >
          {tabs.map((t) => {
            const isActive = step === t.key;
            const enabled = canGoToStep(t.key);
            return (
              <button
                key={t.key}
                type="button"
                disabled={!enabled}
                onClick={() => handleStepClick(t.key)}
                className={`pill ${isActive ? "is-active" : ""}`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>

        {errorMessage ? (
          <div className="px-5 pt-4 sm:px-6">
            <p className="callout-danger">{errorMessage}</p>
          </div>
        ) : null}

        {/* ── STEP 1: Serviço ─────────────────────────────────────────── */}
        {step === "service" ? (
          <div className="anim-step px-5 py-6 sm:px-6">
            <header className="mb-5">
              <h2 className="title-display text-xl sm:text-2xl">Selecione o serviço</h2>
              <p className="text-body-secondary mt-1 text-sm">
                Toque no serviço que você deseja agendar.
              </p>
            </header>

            <ul className="space-y-3">
              {services.map((service) => {
                const isSelected = selectedServiceId === service.id;
                return (
                  <li key={service.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedServiceId(service.id)}
                      aria-pressed={isSelected}
                      className="group flex w-full items-center gap-4 rounded-3xl border p-3 text-left transition-all duration-150 sm:p-4"
                      style={{
                        borderColor: isSelected ? "var(--accent)" : "var(--line)",
                        background: isSelected ? "var(--accent-softer)" : "var(--surface)",
                        boxShadow: isSelected
                          ? "0 8px 24px -10px rgba(124, 58, 237, 0.35)"
                          : "none",
                      }}
                    >
                      {service.image_url ? (
                        <span className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border border-white/40 shadow-md">
                          <Image
                            src={service.image_url}
                            alt={service.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                            unoptimized
                          />
                        </span>
                      ) : (
                        <span
                          className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white shadow-md"
                          style={getServiceAvatarStyle(service.name)}
                        >
                          {getServiceInitial(service.name)}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--ink-strong)] sm:text-base">
                          {service.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <IconClock className="h-3 w-3" />
                          <span>{service.duration_minutes} min</span>
                          {service.description ? (
                            <>
                              <span className="text-[var(--text-muted)]">·</span>
                              <span className="line-clamp-1 text-[var(--text-muted)]">
                                {service.description}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <span
                        className={`flex-shrink-0 rounded-full px-3.5 py-2 text-xs font-bold ${
                          isSelected ? "text-white" : "text-[var(--accent-dark)]"
                        }`}
                        style={
                          isSelected
                            ? {
                                background:
                                  "linear-gradient(135deg, var(--accent-grad-from), var(--accent-grad-to))",
                              }
                            : { background: "var(--accent-soft)" }
                        }
                      >
                        {formatCurrencyBRL(service.price)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {/* ── STEP 2: Data + horário ──────────────────────────────────── */}
        {step === "datetime" ? (
          <div className="anim-step px-5 py-6 sm:px-6">
            <header className="mb-5">
              <h2 className="title-display text-xl sm:text-2xl">Escolha data e horário</h2>
              <p className="text-body-secondary mt-1 text-sm">
                Selecione um dia e depois um horário disponível.
              </p>
            </header>

            <BookingCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

            <div className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Horários disponíveis
                </p>
                {slotOptions.length > 0 ? (
                  <span className="text-[0.7rem] font-semibold text-[var(--accent-dark)]">
                    {slotOptions.length} {slotOptions.length === 1 ? "livre" : "livres"}
                  </span>
                ) : null}
              </div>

              {slotOptions.length === 0 ? (
                <div
                  className="flex items-center justify-center rounded-3xl px-6 py-10 text-center text-sm"
                  style={{ background: "var(--surface-soft)" }}
                >
                  <p className="text-body-muted">
                    Sem horários livres neste dia. Escolha outro.
                  </p>
                </div>
              ) : (
                <div
                  key={selectedDate}
                  className="anim-step grid grid-cols-3 gap-2 sm:grid-cols-4"
                  role="radiogroup"
                  aria-label="Horários disponíveis"
                >
                  {slotOptions.map((slot) => {
                    const isSelected = selectedStartTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedStartTime(slot.startTime)}
                        className="rounded-full py-2.5 text-sm font-semibold transition-all duration-150"
                        style={
                          isSelected
                            ? {
                                background:
                                  "linear-gradient(135deg, var(--accent-grad-from), var(--accent-grad-to))",
                                color: "#fff",
                                boxShadow: "0 6px 16px -4px rgba(124, 58, 237, 0.4)",
                              }
                            : {
                                background: "var(--accent-soft)",
                                color: "var(--accent-dark)",
                              }
                        }
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* ── STEP 3: Dados ───────────────────────────────────────────── */}
        {step === "details" ? (
          <form
            onSubmit={handleSubmit}
            className="anim-step px-5 py-6 sm:px-6"
            id="booking-details-form"
          >
            <header className="mb-5">
              <h2 className="title-display text-xl sm:text-2xl">Seus dados</h2>
              <p className="text-body-secondary mt-1 text-sm">
                Para finalizar, informe seu contato.
              </p>
            </header>

            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Nome completo
                </span>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                  required
                  className="input-shell"
                  placeholder="Seu nome"
                  autoComplete="name"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Telefone / WhatsApp
                </span>
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                  required
                  className="input-shell"
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Observações <span className="text-body-muted font-normal normal-case">(opcional)</span>
                </span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="input-shell resize-none"
                  placeholder="Algo que a profissional precise saber?"
                />
              </label>
            </div>
          </form>
        ) : null}
      </div>

      {/* ── Footer fixo: resumo + CTA ───────────────────────────────────── */}
      <div className="sticky bottom-0 left-0 right-0 z-20 mt-6 pb-4 pt-2">
        <div
          className="elevated-card mx-auto flex items-center justify-between gap-3 px-4 py-3 backdrop-blur-md sm:px-5"
          style={{ background: "color-mix(in oklab, var(--surface) 92%, transparent)" }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {selectedService ? "Total" : "Selecione um serviço"}
            </p>
            <p className="truncate text-base font-bold text-[var(--ink-strong)] sm:text-lg">
              {selectedService ? formatCurrencyBRL(selectedService.price) : "—"}
              {selectedStartTime && step !== "service" ? (
                <span className="ml-2 text-xs font-medium text-[var(--text-secondary)]">
                  · {selectedStartTime}
                </span>
              ) : null}
            </p>
          </div>

          {step !== "service" ? (
            <button
              type="button"
              onClick={goBack}
              className="btn-soft hidden sm:inline-flex"
            >
              <IconChevronLeft />
              Voltar
            </button>
          ) : null}

          {step === "details" ? (
            <button
              type="submit"
              form="booking-details-form"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <IconSpinner />
                  Confirmando…
                </>
              ) : (
                <>
                  <IconCheck />
                  Agendar
                </>
              )}
            </button>
          ) : footerCta ? (
            <button
              type="button"
              onClick={footerCta.action}
              disabled={footerCta.disabled}
              className="btn-primary"
            >
              {footerCta.label}
              <IconChevronRight />
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
