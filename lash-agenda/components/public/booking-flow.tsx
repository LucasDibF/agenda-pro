"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type {
  ServiceRow,
  AvailabilityRow,
  BlockedTimeRow,
  BookedSlotRow,
  SlotOption,
} from "@/types/domain";
import { toLocalDateInput } from "@/lib/utils/date";
import { formatCurrencyBRL } from "@/lib/utils/format";
import { generateSlots } from "@/lib/utils/slots";
import { BookingCalendar } from "@/components/public/booking-calendar";

// ─── Estado do formulário do cliente ─────────────────────────────────────────

type BookingFormState = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
};

// ─── Componente ───────────────────────────────────────────────────────────────

type BookingFlowProps = {
  professionalIdentifier: string;
};

export function BookingFlow({ professionalIdentifier }: BookingFlowProps) {
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [availabilityRows, setAvailabilityRows] = useState<AvailabilityRow[]>([]);
  const [blockedRows, setBlockedRows] = useState<BlockedTimeRow[]>([]);
  const [bookedSlots, setBookedSlots] = useState<BookedSlotRow[]>([]);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(toLocalDateInput(new Date()));
  const [selectedStartTime, setSelectedStartTime] = useState("");

  const [form, setForm] = useState<BookingFormState>({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    notes: "",
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  // ── 1) Resolve identificador da profissional (UUID ou booking_code) ──────────

  useEffect(() => {
    const resolveProfessional = async () => {
      setLoading(true);
      setErrorMessage("");

      const trimmedIdentifier = professionalIdentifier.trim();
      if (!trimmedIdentifier) {
        setErrorMessage("Codigo da profissional invalido.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("resolve_professional_id", {
        p_identifier: trimmedIdentifier,
      });

      if (error) {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            trimmedIdentifier
          );

        if (isUuid) {
          setProfessionalId(trimmedIdentifier);
          return;
        }

        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setErrorMessage("Codigo da profissional nao encontrado.");
        setLoading(false);
        return;
      }

      setProfessionalId(data as string);
    };

    resolveProfessional();
  }, [professionalIdentifier]);

  // ── 2) Carrega serviços e disponibilidade ao resolver o ID ───────────────────

  useEffect(() => {
    const loadInitialData = async () => {
      if (!professionalId) return;
      setLoading(true);
      setErrorMessage("");

      const [servicesRes, availabilityRes] = await Promise.all([
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
      ]);

      if (servicesRes.error) {
        setErrorMessage(servicesRes.error.message);
        setLoading(false);
        return;
      }

      if (availabilityRes.error) {
        setErrorMessage(availabilityRes.error.message);
        setLoading(false);
        return;
      }

      const fetchedServices = (servicesRes.data ?? []) as ServiceRow[];
      setServices(fetchedServices);
      setAvailabilityRows((availabilityRes.data ?? []) as AvailabilityRow[]);

      if (fetchedServices.length > 0) {
        setSelectedServiceId(fetchedServices[0].id);
      }

      setLoading(false);
    };

    loadInitialData();
  }, [professionalId]);

  // ── 3) Atualiza bloqueios e slots ocupados ao mudar a data ───────────────────

  useEffect(() => {
    const loadDateData = async () => {
      if (!professionalId || !selectedDate) return;

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

    loadDateData();
  }, [professionalId, selectedDate]);

  // ── 4) Gera os slots disponíveis para a data e serviço selecionados ──────────

  const slotOptions: SlotOption[] = useMemo(() => {
    if (!selectedDate || !selectedService) return [];
    return generateSlots({
      selectedDate,
      serviceDurationMinutes: selectedService.duration_minutes,
      availabilityRows,
      blockedRows,
      bookedSlots,
    });
  }, [availabilityRows, blockedRows, bookedSlots, selectedDate, selectedService]);

  // ── 5) Submissão do agendamento ───────────────────────────────────────────────

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!professionalId || !selectedService || !selectedDate || !selectedStartTime) {
      setErrorMessage("Selecione servico, data e horario.");
      return;
    }

    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.customerEmail.trim()) {
      setErrorMessage("Preencha nome, telefone e email.");
      return;
    }

    const selectedSlot = slotOptions.find((slot) => slot.startTime === selectedStartTime);
    if (!selectedSlot) {
      setErrorMessage("Horario selecionado invalido. Escolha outro horario.");
      return;
    }

    setSubmitting(true);

    const { data: insertedAppointment, error } = await supabase
      .from("appointments")
      .insert({
        professional_id: professionalId,
        service_id: selectedService.id,
        customer_name: form.customerName.trim(),
        customer_phone: form.customerPhone.trim(),
        customer_email: form.customerEmail.trim(),
        appointment_date: selectedDate,
        start_time: selectedSlot.startTime,
        end_time: selectedSlot.endTime,
        notes: form.notes.trim() || null,
        status: "agendado",
      })
      .select("id")
      .single();

    if (error) {
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    setSuccessMessage("Agendamento confirmado com sucesso!");
    setForm({ customerName: "", customerPhone: "", customerEmail: "", notes: "" });
    setSelectedStartTime("");

    if (insertedAppointment?.id) {
      fetch("/api/notify-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: insertedAppointment.id }),
      }).catch(() => {
        // Notificação não bloqueia a confirmação do agendamento.
      });
    }

    const { data: refreshedBooked } = await supabase.rpc("get_booked_slots", {
      p_professional_id: professionalId,
      p_date: selectedDate,
    });
    setBookedSlots((refreshedBooked ?? []) as BookedSlotRow[]);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="elevated-card p-6">
        <p className="text-sm text-[var(--foreground)]/75">Carregando disponibilidade...</p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {services.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50/85 px-3 py-2 text-sm text-amber-800">
          Esta URL nao possui servicos ativos. Confirme se voce abriu o link correto da profissional.
        </p>
      ) : null}

      {availabilityRows.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50/85 px-3 py-2 text-sm text-amber-800">
          Esta profissional ainda nao configurou horarios de atendimento.
        </p>
      ) : null}

      {/* ── Passo 1: Serviço ────────────────────────────────────────────────── */}
      <div className="elevated-card p-5">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">1) Escolha o servico</h2>
        <div className="mt-3 grid gap-3">
          {services.length === 0 ? (
            <p className="text-sm text-[var(--foreground)]/75">
              Esta profissional ainda nao possui servicos ativos.
            </p>
          ) : (
            services.map((service) => (
              <button
                key={service.id}
                type="button"
                onClick={() => setSelectedServiceId(service.id)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  selectedServiceId === service.id
                    ? "border-[var(--accent)] bg-[var(--surface-soft)]"
                    : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]"
                }`}
              >
                <p className="font-semibold text-[var(--ink-strong)]">{service.name}</p>
                <p className="text-sm text-[var(--foreground)]/75">
                  {service.duration_minutes} min - {formatCurrencyBRL(service.price)}
                </p>
                {service.description ? (
                  <p className="mt-1 text-sm text-[var(--foreground)]/70">{service.description}</p>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Passo 2: Data e horário ─────────────────────────────────────────── */}
      <div className="elevated-card p-5">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">2) Escolha data e horario</h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <BookingCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          <label className="space-y-1">
            <span className="text-sm font-medium text-[var(--foreground)]">Horario disponivel</span>
            <select
              value={selectedStartTime}
              onChange={(event) => setSelectedStartTime(event.target.value)}
              className="input-shell"
            >
              <option value="">Selecione um horario</option>
              {slotOptions.map((slot) => (
                <option key={slot.startTime} value={slot.startTime}>
                  {slot.startTime} - {slot.endTime}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--foreground)]/75">
              Data selecionada:{" "}
              <span className="font-semibold text-[var(--ink-strong)]">
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(
                  new Date(`${selectedDate}T00:00:00`)
                )}
              </span>
            </p>
          </label>
        </div>

        {slotOptions.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--foreground)]/75">
            Nenhum horario disponivel para esta data.
          </p>
        ) : null}
      </div>

      {/* ── Passo 3: Dados do cliente ───────────────────────────────────────── */}
      <div className="elevated-card p-5">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">3) Seus dados</h2>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-[var(--foreground)]">Nome</span>
            <input
              type="text"
              value={form.customerName}
              onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
              required
              className="input-shell"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-[var(--foreground)]">Telefone</span>
            <input
              type="tel"
              value={form.customerPhone}
              onChange={(event) => setForm((prev) => ({ ...prev, customerPhone: event.target.value }))}
              required
              className="input-shell"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Email</span>
            <input
              type="email"
              value={form.customerEmail}
              onChange={(event) => setForm((prev) => ({ ...prev, customerEmail: event.target.value }))}
              required
              className="input-shell"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Observacoes (opcional)</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              className="input-shell"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 md:col-span-2">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !selectedServiceId || !selectedStartTime}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
          >
            {submitting ? "Confirmando..." : "Confirmar agendamento"}
          </button>
        </form>
      </div>
    </section>
  );
}
