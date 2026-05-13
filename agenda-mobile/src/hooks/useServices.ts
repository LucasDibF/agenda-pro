// ─── Hook: serviços da profissional (mobile) ──────────────────────────────────

import useSWR from "swr";
import { supabase } from "../lib/supabase";
import type { ServiceRow } from "../types";

const fetcher = async ([, id]: [string, string]): Promise<ServiceRow[]> => {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, description, is_active, created_at")
    .eq("professional_id", id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ServiceRow[];
};

export const servicesKey = (professionalId: string) =>
  ["services", professionalId] as const;

export const useServices = (professionalId: string) =>
  useSWR(servicesKey(professionalId), fetcher, {
    dedupingInterval: 30_000, // serviços mudam raramente
  });
