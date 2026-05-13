// ─── Hook: agendamentos por data (mobile) ─────────────────────────────────────

import useSWR from "swr";
import { supabase } from "../lib/supabase";
import type { AppointmentRow, AppointmentSelectRow } from "../types";

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

export const appointmentsKey = (professionalId: string, date: string) =>
  ["appointments", professionalId, date] as const;

export const useAppointments = (professionalId: string, date: string) =>
  useSWR(appointmentsKey(professionalId, date), fetcher, {
    dedupingInterval: 3_000,
  });
