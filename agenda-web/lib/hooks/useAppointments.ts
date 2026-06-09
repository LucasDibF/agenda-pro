// ─── Hook: agendamentos por data ──────────────────────────────────────────────
//
// Cacheado por [professionalId, date]. Trocar de data e voltar = dados
// instantâneos (sem loading) enquanto SWR revalida em segundo plano.

import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
import type { AppointmentRow, AppointmentSelectRow } from "@/types/domain";

const fetcher = async ([, id, date]: [string, string, string]): Promise<AppointmentRow[]> => {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, customer_name, customer_phone, customer_email, appointment_date, start_time, end_time, status, notes, service:services(name)"
    )
    .eq("professional_id", id)
    .eq("appointment_date", date)
    .order("start_time", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as AppointmentSelectRow[]).map((row) => ({
    ...row,
    service: Array.isArray(row.service) ? (row.service[0] ?? null) : row.service,
  }));
};

export const appointmentsKey = (professionalId: string | null, date: string) =>
  professionalId ? (["appointments", professionalId, date] as const) : null;

export const useAppointments = (professionalId: string | null, date: string) =>
  useSWR(appointmentsKey(professionalId, date), fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 3_000,
  });
