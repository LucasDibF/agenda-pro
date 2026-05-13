// ─── Hook: dados do dashboard (mobile) ────────────────────────────────────────

import useSWR from "swr";
import { supabase } from "../lib/supabase";
import type { DashboardAppointmentRow, DashboardAppointmentSelectRow } from "../types";
import { toIsoDate } from "../utils";

type DashboardData = {
  activeServicesCount: number;
  todayAppointments: DashboardAppointmentRow[];
  statusSummary: { agendado: number; confirmado: number; concluido: number; cancelado: number };
};

const fetcher = async ([, id]: [string, string]): Promise<DashboardData> => {
  const today = toIsoDate();

  const [servicesRes, todayRes] = await Promise.all([
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", id)
      .eq("is_active", true),
    supabase
      .from("appointments")
      .select("id, customer_name, start_time, end_time, status, service:services(name, price)")
      .eq("professional_id", id)
      .eq("appointment_date", today)
      .order("start_time", { ascending: true })
      .limit(30),
  ]);

  if (servicesRes.error) throw servicesRes.error;
  if (todayRes.error) throw todayRes.error;

  const normalized = ((todayRes.data ?? []) as DashboardAppointmentSelectRow[]).map((row) => ({
    ...row,
    service: Array.isArray(row.service) ? (row.service[0] ?? null) : row.service,
  }));

  return {
    activeServicesCount: servicesRes.count ?? 0,
    todayAppointments: normalized,
    statusSummary: normalized.reduce(
      (acc, item) => { acc[item.status] += 1; return acc; },
      { agendado: 0, confirmado: 0, concluido: 0, cancelado: 0 }
    ),
  };
};

export const dashboardKey = (professionalId: string) =>
  ["dashboard", professionalId] as const;

export const useDashboard = (professionalId: string) =>
  useSWR(dashboardKey(professionalId), fetcher, {
    dedupingInterval: 5_000,
  });
