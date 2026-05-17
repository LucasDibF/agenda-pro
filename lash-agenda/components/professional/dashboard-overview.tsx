"use client";

import Link from "next/link";
import { useSWRConfig } from "swr";
import type { AppointmentStatus } from "@/types/domain";
import { formatDateBr } from "@/lib/utils/date";
import { useCurrentProfessional } from "@/lib/hooks/useCurrentProfessional";
import { useDashboard, dashboardKey } from "@/lib/hooks/useDashboard";
import { BookingLinkCard } from "@/components/professional/booking-link-card";

const getStatusChip = (status: AppointmentStatus): string => {
  if (status === "confirmado") return "bg-[#EDE8FF] text-[#5B3CC4]";
  if (status === "agendado") return "bg-[#F3F0FF] text-[#6C47DE]";
  if (status === "concluido") return "bg-[#EEF0F7] text-[#4C5568]";
  return "bg-[#F8EAF2] text-[#944A70]";
};

export function DashboardOverview() {
  const { data: user, error: userError } = useCurrentProfessional();
  const professionalId = user?.id ?? null;

  const {
    data,
    isLoading,
    error: dashboardError,
    mutate,
  } = useDashboard(professionalId);

  const { mutate: globalMutate } = useSWRConfig();

  const errorMessage = userError?.message ?? dashboardError?.message ?? "";
  const systemStatus = isLoading ? "Carregando..." : errorMessage ? "Atencao: verificar dados" : "Base pronta";

  const handleReload = () => {
    // Invalida todos os caches deste profissional
    globalMutate(
      (key: unknown) =>
        Array.isArray(key) &&
        (key[0] === "appointments" || key[0] === "dashboard") &&
        key[1] === professionalId
    );
    mutate();
  };

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
              Acompanhe agendamentos e servicos.
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
        <p className="mt-2 text-3xl font-bold text-[#1F2430]">
          {isLoading ? "—" : data?.todayCount ?? 0}
        </p>
      </article>

      <article className="elevated-card p-4 md:col-span-2">
        <h2 className="text-sm font-medium text-[#6E7380]">Serviços ativos</h2>
        <p className="mt-2 text-3xl font-bold text-[#1F2430]">
          {isLoading ? "—" : data?.activeServicesCount ?? 0}
        </p>
      </article>

      <article className="elevated-card p-4 md:col-span-2">
        <h2 className="text-sm font-medium text-[#6E7380]">Status do sistema</h2>
        <p className={`mt-2 text-base font-semibold ${
          isLoading ? "text-neutral-400" : errorMessage ? "text-amber-700" : "text-green-700"
        }`}>
          {systemStatus}
        </p>
        {errorMessage ? (
          <button
            type="button"
            onClick={handleReload}
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
        ) : isLoading ? (
          <p className="mt-3 text-sm text-[#6E7380]">Carregando dados...</p>
        ) : !data?.upcomingAppointments.length ? (
          <div className="muted-card mt-3 px-4 py-3 text-sm text-[#6E7380]">
            Nenhum proximo agendamento.
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {data.upcomingAppointments.map((appointment) => (
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
