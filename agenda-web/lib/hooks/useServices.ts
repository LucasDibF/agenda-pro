import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
import type { ServiceRow } from "@/types/domain";

const fetchServices = async ([, professionalId]: [string, string]): Promise<ServiceRow[]> => {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, description, image_url, is_active, created_at")
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ServiceRow[];
};

export const servicesKey = (professionalId: string | null) =>
  professionalId ? (["services", professionalId] as const) : null;

export const useServices = (professionalId: string | null) =>
  useSWR(servicesKey(professionalId), fetchServices, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
  });
