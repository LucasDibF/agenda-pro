// ─── Hook: dados do dashboard ─────────────────────────────────────────────────
//
// Busca em paralelo: agendamentos de hoje, contagem de serviços ativos e
// próximos agendamentos. Resultado cacheado — navegar entre páginas e voltar
// ao dashboard é instantâneo.

import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
import type { UpcomingAppointmentRow, UpcomingAppointmentSelectRow } from "@/types/domain";
import { toLocalDateInput } from "@/lib/utils/date";

type DashboardData = {
  todayCount: number;
  activeServicesCount: number;
  upcomingAppointments: UpcomingAppointmentRow[];
};

const fetcher = async ([, professionalId]: [string, string]): Promise<DashboardData> => {
  const today = toLocalDateInput(new Date());

  const [todayRes, servicesRes, upcomingRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", professionalId)
      .eq("appointment_date", today),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", professionalId)
      .eq("is_active", true),
    supabase
      .from("appointments")
      .select("id, appointment_date, start_time, status, customer_name, service:services(name)")
      .eq("professional_id", professionalId)
      .gte("appointment_date", today)
      .in("status", ["agendado", "confirmado"])
      .order("appointment_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(5),
  ]);

  if (todayRes.error) throw todayRes.error;
  if (servicesRes.error) throw servicesRes.error;
  if (upcomingRes.error) throw upcomingRes.error;

  return {
    todayCount: todayRes.count ?? 0,
    activeServicesCount: servicesRes.count ?? 0,
    upcomingAppointments: ((upcomingRes.data ?? []) as UpcomingAppointmentSelectRow[]).map(
      (row) => ({
        ...row,
        service: Array.isArray(row.service) ? (row.service[0] ?? null) : row.service,
      })
    ),
  };
};

export const dashboardKey = (professionalId: string | null) =>
  professionalId ? (["dashboard", professionalId] as const) : null;

export const useDashboard = (professionalId: string | null) =>
  useSWR(dashboardKey(professionalId), fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
  });
