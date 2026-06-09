import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
import type { BlockedTimeRow } from "@/types/domain";

const fetchBlockedTimes = async ([, professionalId]: [string, string]): Promise<BlockedTimeRow[]> => {
  const { data, error } = await supabase
    .from("blocked_times")
    .select("id, start_at, end_at, reason")
    .eq("professional_id", professionalId)
    .order("start_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BlockedTimeRow[];
};

export const blockedTimesKey = (professionalId: string | null) =>
  professionalId ? (["blocked-times", professionalId] as const) : null;

export const useBlockedTimes = (professionalId: string | null) =>
  useSWR(blockedTimesKey(professionalId), fetchBlockedTimes, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
  });
