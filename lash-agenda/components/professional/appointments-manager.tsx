"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AppointmentStatus, AppointmentRow, AppointmentSelectRow } from "@/types/domain";
import { toLocalDateInput } from "@/lib/utils/date";
import { buildWhatsappUrl } from "@/lib/utils/format";
import { ensureProfessionalProfile } from "@/lib/utils/profile";

const statusOptions: Array<{ value: AppointmentStatus; label: string }> = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "concluido", label: "Concluido" },
];

export function AppointmentsManager() {
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(toLocalDateInput(new Date()));
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const totalAppointments = appointments.length;
  const confirmedAppointments = useMemo(
    () => appointments.filter((a) => a.status === "confirmado").length,
    [appointments]
  );

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 3500);
  };

  const fetchAppointments = useCallback(async (userId: string, dateInput: string) => {
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, service:services(name)"
      )
      .eq("professional_id", userId)
      .eq("appointment_date", dateInput)
      .order("start_time", { ascending: true });

    if (error) { setErrorMessage(error.message); return; }

    const normalized = ((data ?? []) as AppointmentSelectRow[]).map((row) => ({
      ...row,
      service: Array.isArray(row.service) ? (row.service[0] ?? null) : row.service,
    }));
    setAppointments(normalized);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setErrorMessage("");

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setErrorMessage("Nao foi possivel carregar o usuario logado.");
        setLoading(false);
        return;
      }

      const profileError = await ensureProfessionalProfile(user);
      if (profileError) {
        setErrorMessage(profileError.message);
        setLoading(false);
        return;
      }

      setProfessionalId(user.id);
      await fetchAppointments(user.id, selectedDate);
      setLoading(false);
    };

    loadInitialData();
  }, [selectedDate, fetchAppointments]);

  const handleChangeStatus = async (appointmentId: string, status: AppointmentStatus) => {
    if (!professionalId) return;
    setErrorMessage("");
    setUpdatingId(appointmentId);

    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId);

    if (error) { setErrorMessage(error.message); setUpdatingId(null); return; }

    setAppointments((current) =>
      current.map((a) => (a.id === appointmentId ? { ...a, status } : a))
    );
    showSuccess("Status atualizado.");
    setUpdatingId(null);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-neutral-900">Agendamentos por dia</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Visualize os agendamentos e altere o status rapidamente.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="space-y-1 md:col-span-1">
            <span className="text-sm font-medium text-neutral-700">Data</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none ring-pink-300 focus:ring"
            />
          </label>

          <article className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs text-neutral-500">Total no dia</p>
            <p className="text-2xl font-bold text-neutral-900">{loading ? "—" : totalAppointments}</p>
          </article>

          <article className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs text-neutral-500">Confirmados</p>
            <p className="text-2xl font-bold text-neutral-900">{loading ? "—" : confirmedAppointments}</p>
          </article>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}

        {successMessage ? (
          <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-neutral-900">Lista do dia</h3>

        {loading ? (
          <p className="mt-4 text-sm text-neutral-600">Carregando agendamentos...</p>
        ) : appointments.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">
            Nenhum agendamento encontrado para esta data.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {appointments.map((appointment) => (
              <article
                key={appointment.id}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-neutral-900">
                      {appointment.start_time.slice(0, 5)} — {appointment.end_time.slice(0, 5)} •{" "}
                      {appointment.service?.name ?? "Servico"}
                    </p>
                    <p className="text-sm text-neutral-700">{appointment.customer_name}</p>
                    <p className="text-sm text-neutral-500">
                      {appointment.customer_phone}
                      {appointment.customer_email ? ` • ${appointment.customer_email}` : ""}
                    </p>
                    {appointment.notes ? (
                      <p className="text-sm text-neutral-500">Obs: {appointment.notes}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-neutral-600">Status</span>
                      <select
                        value={appointment.status}
                        disabled={updatingId === appointment.id}
                        onChange={(e) =>
                          handleChangeStatus(appointment.id, e.target.value as AppointmentStatus)
                        }
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-pink-300 focus:ring disabled:opacity-70"
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
