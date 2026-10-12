"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import type { AppointmentStatus } from "@/types/domain";
import { toLocalDateInput } from "@/lib/utils/date";
import { buildWhatsappUrl } from "@/lib/utils/format";
import { supabase } from "@/lib/supabase/client";
import { useCurrentProfessional } from "@/lib/hooks/useCurrentProfessional";
import { useAppointments, appointmentsKey } from "@/lib/hooks/useAppointments";
import { dashboardKey } from "@/lib/hooks/useDashboard";

const statusOptions: Array<{ value: AppointmentStatus; label: string }> = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "concluido", label: "Concluido" },
];

export function AppointmentsManager() {
  const [selectedDate, setSelectedDate] = useState(toLocalDateInput(new Date()));
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const { data: user, error: userError } = useCurrentProfessional();
  const professionalId = user?.id ?? null;

  const {
    data: appointments = [],
    isLoading,
    error: appointmentsError,
  } = useAppointments(professionalId, selectedDate);

  const { mutate } = useSWRConfig();

  const errorMessage = userError?.message ?? appointmentsError?.message ?? "";

  const totalAppointments = appointments.length;
  const confirmedAppointments = appointments.filter((a) => a.status === "confirmado").length;

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3500);
  };

  const handleChangeStatus = async (appointmentId: string, status: AppointmentStatus) => {
    if (!professionalId) return;
    setUpdatingId(appointmentId);

    // Optimistic update — atualiza localmente antes da resposta do banco
    mutate(
      appointmentsKey(professionalId, selectedDate),
      appointments.map((a) => (a.id === appointmentId ? { ...a, status } : a)),
      false // não revalida imediatamente
    );

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId);

    if (error) {
      // Reverte o optimistic update em caso de erro
      mutate(appointmentsKey(professionalId, selectedDate));
      setUpdatingId(null);
      return;
    }

    // Invalida o dashboard também (contadores mudam)
    mutate(dashboardKey(professionalId));
    showSuccess("Status atualizado.");
    setUpdatingId(null);
  };

  return (
    <section className="space-y-6">
      <div className="elevated-card p-5">
        <h2 className="title-display text-lg">Agendamentos por dia</h2>
        <p className="mt-1 text-sm text-body-secondary">
          Visualize os agendamentos e altere o status rapidamente.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="space-y-1 md:col-span-1">
            <span className="field-label">Data</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-shell"
            />
          </label>

          <article className="muted-card p-3">
            <p className="text-xs text-body-muted">Total no dia</p>
            <p className="text-2xl font-bold text-[var(--ink-strong)]">{isLoading ? "—" : totalAppointments}</p>
          </article>

          <article className="muted-card p-3">
            <p className="text-xs text-body-muted">Confirmados</p>
            <p className="text-2xl font-bold text-[var(--ink-strong)]">{isLoading ? "—" : confirmedAppointments}</p>
          </article>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}
        {successMessage ? (
          <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p>
        ) : null}
      </div>

      <div className="elevated-card p-5">
        <h3 className="title-display text-lg">Lista do dia</h3>

        {isLoading ? (
          <p className="mt-4 text-sm text-body-secondary">Carregando agendamentos...</p>
        ) : appointments.length === 0 ? (
          <p className="mt-4 text-sm text-body-secondary">
            Nenhum agendamento encontrado para esta data.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {appointments.map((appointment) => (
              <article
                key={appointment.id}
                className="muted-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--ink-strong)]">
                      {appointment.start_time.slice(0, 5)} — {appointment.end_time.slice(0, 5)} •{" "}
                      {appointment.service?.name ?? "Servico"}
                    </p>
                    <p className="text-sm text-body-secondary">{appointment.customer_name}</p>
                    <p className="text-sm text-body-muted">
                      {appointment.customer_phone}
                      {appointment.customer_email ? ` • ${appointment.customer_email}` : ""}
                    </p>
                    {appointment.notes ? (
                      <p className="text-sm text-body-muted">Obs: {appointment.notes}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="space-y-1">
                      <span className="field-label text-xs">Status</span>
                      <select
                        value={appointment.status}
                        disabled={updatingId === appointment.id}
                        onChange={(e) =>
                          handleChangeStatus(appointment.id, e.target.value as AppointmentStatus)
                        }
                        className="input-shell disabled:opacity-70"
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>

                    {appointment.status === "confirmado" && buildWhatsappUrl(appointment) ? (
                      <a
                        href={buildWhatsappUrl(appointment) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100"
                      >
                        Enviar WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
