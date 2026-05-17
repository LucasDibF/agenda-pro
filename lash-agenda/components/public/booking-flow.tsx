"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
import { generateSlots, normalizeTime } from "@/lib/utils/slots";
import { BookingCalendar } from "@/components/public/booking-calendar";

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
  const [form, setForm] = useState<BookingFormState>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedDateRef = useRef(selectedDate);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  // Exibe mensagem de sucesso e limpa automaticamente após 6s
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 6000);
  };

  // ── 1) Resolve identificador da profissional ──────────────────────────────

  useEffect(() => {
    const resolveProfessional = async () => {
      setLoading(true);
      setErrorMessage("");

      const trimmed = professionalIdentifier.trim();
      if (!trimmed) {
        setErrorMessage("Codigo da profissional invalido.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("resolve_professional_id", {
        p_identifier: trimmed,
      });

      if (error) {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);
        if (isUuid) {
          setProfessionalId(trimmed);
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

  // ── 2) Carrega serviços e disponibilidade ─────────────────────────────────

  useEffect(() => {
    if (!professionalId) return;

    const loadInitialData = async () => {
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

      if (servicesRes.error) { setErrorMessage(servicesRes.error.message); setLoading(false); return; }
      if (availabilityRes.error) { setErrorMessage(availabilityRes.error.message); setLoading(false); return; }

      const fetchedServices = (servicesRes.data ?? []) as ServiceRow[];
      setServices(fetchedServices);
      setAvailabilityRows((availabilityRes.data ?? []) as AvailabilityRow[]);
      if (fetchedServices.length > 0) setSelectedServiceId(fetchedServices[0].id);

      setLoading(false);
    };

    loadInitialData();
  }, [professionalId]);

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

      if (blockedRes.error) { setErrorMessage(blockedRes.error.message); return; }
      if (bookedRes.error) { setErrorMessage(bookedRes.error.message); return; }

      setBlockedRows((blockedRes.data ?? []) as BlockedTimeRow[]);
      setBookedSlots((bookedRes.data ?? []) as BookedSlotRow[]);
      setSelectedStartTime("");
    };

    loadDateData();
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
    });
  }, [availabilityRows, blockedRows, bookedSlots, selectedDate, selectedService]);

  // Verifica se todos os campos para confirmar estão preenchidos
  const isReadyToConfirm =
    !!selectedService && !!selectedDate && !!selectedStartTime &&
    form.customerName.trim() !== "" && form.customerPhone.trim() !== "";

  // ── 5) Submissão ──────────────────────────────────────────────────────────

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!professionalId) {
      setErrorMessage("Profissional nao identificada. Recarregue a pagina.");
      return;
    }
    if (!selectedService) {
      setErrorMessage("Selecione um servico para continuar.");
      return;
    }
    if (!selectedDate || !selectedStartTime) {
      setErrorMessage("Selecione uma data e um horario disponivel.");
      return;
    }
    if (!form.customerName.trim() || !form.customerPhone.trim()) {
      setErrorMessage("Informe seu nome e telefone para confirmar.");
      return;
    }

    const selectedSlot = slotOptions.find((slot) => slot.startTime === selectedStartTime);
    if (!selectedSlot) {
      setErrorMessage("Horario selecionado nao esta mais disponivel. Escolha outro.");
      return;
    }

    setSubmitting(true);

    const { data: inserted, error } = await supabase
      .from("appointments")
      .insert({
        professional_id: professionalId,
        service_id: selectedService.id,
        customer_name: form.customerName.trim(),
        customer_phone: form.customerPhone.trim(),
        customer_email: null,
        appointment_date: selectedDate,
        start_time: selectedSlot.startTime,
        end_time: selectedSlot.endTime,
        notes: form.notes.trim() || null,
        status: "agendado",
      })
      .select("id")
      .single();

    if (error) {
      // Traduz o erro de sobreposição do banco para mensagem amigável
      if (error.message.includes("appointments_no_overlap") || error.message.includes("exclusion")) {
        setErrorMessage("Este horario foi reservado por outra pessoa agora mesmo. Escolha outro horario.");
      } else {
        setErrorMessage(error.message);
      }
      setSubmitting(false);
      return;
    }

    // Limpa só os dados do cliente e o horário; mantém data e serviço selecionados
    setForm(emptyForm);
    setSelectedStartTime("");

    // Atualização otimista da grade; RPC só confirma em background
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

    showSuccess(
      `Agendamento confirmado! ${selectedService.name} em ${formatDateBr(selectedDate)}. Aguardamos voce!`
    );

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

    // Notifica a profissional (fire-and-forget)
    if (inserted?.id) {
      fetch("/api/notify-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: inserted.id }),
      }).catch(() => {});
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="elevated-card p-6">
        <p className="text-body-secondary text-sm">Carregando disponibilidade...</p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {services.length === 0 ? (
        <p className="callout-warning">
          Esta URL nao possui servicos ativos. Confirme se voce abriu o link correto da profissional.
        </p>
      ) : null}

      {availabilityRows.length === 0 ? (
        <p className="callout-warning">
          Esta profissional ainda nao configurou horarios de atendimento.
        </p>
      ) : null}

      {/* ── Passo 1: Serviço ─────────────────────────────────────────────── */}
      <div className="elevated-card p-5">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">1) Escolha o servico</h2>
        <div className="mt-3 grid gap-3">
          {services.map((service) => (
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
              <p className="text-body-secondary text-sm">
                {service.duration_minutes} min — {formatCurrencyBRL(service.price)}
              </p>
              {service.description ? (
                <p className="text-body-muted mt-1 text-sm">{service.description}</p>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* ── Passo 2: Data e horário ──────────────────────────────────────── */}
      <div className="elevated-card p-5">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">2) Escolha data e horario</h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <BookingCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          <label className="space-y-1">
            <span className="text-sm font-medium text-[var(--foreground)]">Horario disponivel</span>
            <select
              value={selectedStartTime}
              onChange={(e) => setSelectedStartTime(e.target.value)}
              className="input-shell"
            >
              <option value="">Selecione um horario</option>
              {slotOptions.map((slot) => (
                <option key={slot.startTime} value={slot.startTime}>
                  {slot.startTime} — {slot.endTime}
                </option>
              ))}
            </select>
            <p className="text-body-secondary text-xs">
              Data selecionada:{" "}
              <span className="font-semibold text-[var(--ink-strong)]">
                {new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(
                  new Date(`${selectedDate}T00:00:00`)
                )}
              </span>
            </p>
            {slotOptions.length === 0 ? (
              <p className="text-body-muted text-xs">
                Nenhum horario disponivel para esta data.
              </p>
            ) : null}
          </label>
        </div>
      </div>

      {/* ── Passo 3: Dados do cliente ────────────────────────────────────── */}
      <div className="elevated-card p-5">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">3) Seus dados</h2>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium text-[var(--foreground)]">Nome</span>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
              required
              className="input-shell"
              placeholder="Seu nome completo"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-[var(--foreground)]">Telefone / WhatsApp</span>
            <input
              type="tel"
              value={form.customerPhone}
              onChange={(e) => setForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
              required
              className="input-shell"
              placeholder="(11) 99999-9999"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-[var(--foreground)]">Observacoes (opcional)</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="input-shell"
              placeholder="Alguma informacao adicional para a profissional..."
            />
          </label>

          {/* ── Resumo antes de confirmar ───────────────────────────────── */}
          {isReadyToConfirm ? (
            <div className="rounded-xl border border-[var(--accent)]/35 bg-[var(--surface-soft)] px-4 py-3 md:col-span-2">
              <p className="text-[var(--accent-dark)] text-xs font-semibold uppercase tracking-widest">
                Resumo do agendamento
              </p>
              <div className="mt-2 space-y-0.5 text-sm text-[var(--foreground)]">
                <p>
                  <span className="text-body-muted">Servico:</span>{" "}
                  <span className="font-semibold text-[var(--ink-strong)]">{selectedService?.name}</span>
                </p>
                <p>
                  <span className="text-body-muted">Data e hora:</span>{" "}
                  <span className="font-semibold text-[var(--ink-strong)]">
                    {formatDateBr(selectedDate)} as {selectedStartTime}
                  </span>
                </p>
                <p>
                  <span className="text-body-muted">Cliente:</span>{" "}
                  <span className="font-semibold text-[var(--ink-strong)]">
                    {form.customerName} • {form.customerPhone}
                  </span>
                </p>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <p className="callout-danger md:col-span-2">{errorMessage}</p>
          ) : null}

          {successMessage ? (
            <p className="callout-success md:col-span-2">{successMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !isReadyToConfirm}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
          >
            {submitting ? "Confirmando..." : "Confirmar agendamento"}
          </button>
        </form>
      </div>
    </section>
  );
}
