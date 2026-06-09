// ─── Hook: branding da profissional (logo + nome da empresa) ────────────────

import useSWR from "swr";
import { supabase } from "../lib/supabase";

export type BrandingRow = {
  logo_url: string | null;
  business_name: string | null;
};

const fetcher = async ([, id]: [string, string]): Promise<BrandingRow> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("logo_url, business_name")
    .eq("id", id)
    .single();
  if (error) throw error;
  return (data ?? { logo_url: null, business_name: null }) as BrandingRow;
};

export const brandingKey = (professionalId: string) => ["branding", professionalId] as const;

export const useBranding = (professionalId: string) =>
  useSWR(brandingKey(professionalId), fetcher, {
    dedupingInterval: 30_000,
  });
