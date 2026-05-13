"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { AppointmentStatus, UpcomingAppointmentRow, UpcomingAppointmentSelectRow } from "@/types/domain";
import { toLocalDateInput, formatDateBr } from "@/lib/utils/date";
import { ensureProfessionalProfile } from "@/lib/utils/profile";
import { BookingLinkCard } from "@/components/professional/booking-link-card";

const getStatusChip = (status: AppointmentStatus): string => {
  if (status === "confirmado") return "bg-[#EDE8FF] text-[#5B3CC4]";
  if (status === "agendado") return "bg-[#F3F0FF] text-[#6C47DE]";
  if (status === "concluido") return "bg-[#EEF0F7] text-[#4C5568]";
  return "bg-[#F8EAF2] text-[#944A70]";
};

export function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [todayAppointmentsCount, setTodayAppointmentsCount] = useState(0);
  const [activeServicesCount, setActiveServicesCount] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointmentRow[]>([]);

  const systemStatus = useMemo(() => {
    if (loading) return "Carregando...";
    if (errorMessage) return "Atencao: verificar dados";
    return "Base pronta";
  }, [loading, errorMessage]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setErrorMessage("Nao foi possivel carregar o usuario logado.");
      setLoading(false);
      return;
    }

    const profileError = await ensureProfessionalProfile(user);
    if (profileError) { setErrorMessage(profileError.message); setLoading(false); return; }

    const today = toLocalDateInput(new Date());

    const [todayRes, servicesRes, upcomingRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", user.id)
        .eq("appointment_date", today),
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("professional_id", user.id)
        .eq("is_active", true),
      supabase
        .from("appointments")
        .select("id, appointment_date, start_time, status, customer_name, service:services(name)")
        .eq("professional_id", user.id)
        .gte("appointment_date", today)
        .in("status", ["agendado", "confirmado"])
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(5),
    ]);

    if (todayRes.error || servicesRes.error || upcomingRes.error) {
      setErrorMessage(
        todayRes.error?.message ?? servicesRes.error?.message ?? upcomingRes.error?.message ?? "Erro ao carregar dashboard."
      );
      setLoading(false);
      return;
    }

    setTodayAppointmentsCount(todayRes.count ?? 0);
    setActiveServicesCount(servicesRes.count ?? 0);
    setUpcomingAppointments(
      ((upcomingRes.data ?? []) as UpcomingAppointmentSelectRow[]).map((row) => ({
        ...row,
        service: Array.isArray(row.service) ? (row.service[0] ?? null) : row.service,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  return (
    <div className="grid gap-4 md:grid-cols-6">
      <article className="hero-shell md:col-span-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8B5CF6]">
          Painel da profissional
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="title-display text-2xl font-bold">Visao geral do seu dia</h2>
            <p className="mt-1 text-sm text-[#6E7380]">
              Acompanhe agendamentos, serviços e compartilhe seu link de booking.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/professional/services" className="btn-soft px-4 py-2 text-xs">
              Gerenciar serviços
            </Link>
            <Link href="/professional/calendar" className="btn-primary px-4 py-2 text-xs">
              Abrir agenda
            </Link>
          </div>
        </div>
      </article>

      <article className="elevated-card p-4 md:col-span-2">
        <h2 className="text-sm font-medium text-[#6E7380]">Agendamentos hoje</h2>
        <p className="mt-2 text-3xl font-bold text-[#1F2430]">{loading ? "—" : todayAppointmentsCount}</p>
      </article>

      <article className="elevated-card p-4 md:col-span-2">
        <h2 className="text-sm font-medium text-[#6E7380]">Serviços ativos</h2>
        <p className="mt-2 text-3xl font-bold text-[#1F2430]">{loading ? "—" : activeServicesCount}</p>
      </article>

      <article className="elevated-card p-4 md:col-span-2">
        <h2 className="text-sm font-medium text-[#6E7380]">Status do sistema</h2>
        <p className={`mt-2 text-base font-semibold ${
          loading ? "text-neutral-400" : errorMessage ? "text-amber-700" : "text-green-700"
        }`}>
          {systemStatus}
        </p>
        {errorMessage ? (
          <button
            type="button"
            onClick={loadDashboard}
            className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
          >
            Recarregar dados
          </button>
        ) : null}
      </article>

      <article className="elevated-card p-4 md:col-span-6">
        <h2 className="text-sm font-medium text-[#6E7380]">Proximos agendamentos</h2>

        {errorMessage ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{errorMessage}</p>
        ) : loading ? (
          <p className="mt-3 text-sm text-[#6E7380]">Carregando dados...</p>
        ) : upcomingAppointments.length === 0 ? (
          <div className="muted-card mt-3 px-4 py-3 text-sm text-[#6E7380]">
            Nenhum proximo agendamento.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {upcomingAppointments.map((appointment) => (
              <div key={appointment.id} className="muted-card px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#1F2430]">
                      {formatDateBr(appointment.appointment_date)} {appointment.start_time.slice(0, 5)}
                    </p>
                    <p className="text-[#6E7380]">
                      {appointment.customer_name} • {appointment.service?.name ?? "Servico"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusChip(appointment.status)}`}>
                    {appointment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <BookingLinkCard />
    </div>
  );
}
