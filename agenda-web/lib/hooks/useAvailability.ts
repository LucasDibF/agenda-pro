import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
import type { AvailabilityRow } from "@/types/domain";

export type DailyBreakState = {
  breakStart: string;
  breakEnd: string;
};

type AvailabilityData = {
  rows: AvailabilityRow[];
  dailyBreak: DailyBreakState;
};

const fetchAvailabilityData = async ([, professionalId]: [string, string]): Promise<AvailabilityData> => {
  const [availabilityRes, profileRes] = await Promise.all([
    supabase
      .from("availability")
      .select("id, weekday, start_time, end_time, slot_interval_minutes, is_active")
      .eq("professional_id", professionalId)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("profiles")
      .select("break_start_time, break_end_time")
      .eq("id", professionalId)
      .maybeSingle(),
  ]);

  if (availabilityRes.error) throw availabilityRes.error;

  const dailyBreak: DailyBreakState = { breakStart: "", breakEnd: "" };
  if (!profileRes.error && profileRes.data?.break_start_time && profileRes.data?.break_end_time) {
    dailyBreak.breakStart = String(profileRes.data.break_start_time).slice(0, 5);
    dailyBreak.breakEnd = String(profileRes.data.break_end_time).slice(0, 5);
  }

  return {
    rows: (availabilityRes.data ?? []) as AvailabilityRow[],
    dailyBreak,
  };
};

export const availabilityKey = (professionalId: string | null) =>
  professionalId ? (["availability", professionalId] as const) : null;

export const useAvailability = (professionalId: string | null) =>
  useSWR(availabilityKey(professionalId), fetchAvailabilityData, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
  });
