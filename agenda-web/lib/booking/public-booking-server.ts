import { createClient } from "@supabase/supabase-js";
import type { AvailabilityRow, ProfileBranding, ServiceRow } from "@/types/domain";

const UUID_STRICT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_LOOSE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decodeRouteIdentifier(raw: string): string {
  const t = raw.trim();
  if (!t.includes("%")) return t;
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

function looksLikeUuid(trimmed: string): boolean {
  return UUID_STRICT.test(trimmed) || UUID_LOOSE.test(trimmed);
}

function createPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase public env vars missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function resolveProfessionalIdOnServer(identifier: string): Promise<string | null> {
  const trimmed = decodeRouteIdentifier(identifier);
  if (!trimmed) return null;

  const supabase = createPublicSupabase();
  const { data, error } = await supabase.rpc("resolve_professional_id", {
    p_identifier: trimmed,
  });

  if (!error && data) return data as string;
  if (looksLikeUuid(trimmed)) return trimmed;
  return null;
}

export async function fetchPublicServices(professionalId: string): Promise<ServiceRow[]> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price, description, image_url, is_active, created_at")
    .eq("professional_id", professionalId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ServiceRow[];
}

export async function fetchPublicAvailability(professionalId: string): Promise<AvailabilityRow[]> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("availability")
    .select("id, weekday, start_time, end_time, slot_interval_minutes, is_active")
    .eq("professional_id", professionalId)
    .eq("is_active", true)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return [];
  return (data ?? []) as AvailabilityRow[];
}

/**
 * Lê branding público da profissional (logo, nome da empresa, nome completo).
 * Usa RPC `get_public_profile_branding` (security definer) — não requer
 * SELECT direto em `profiles`.
 */
export async function fetchPublicBranding(
  professionalId: string,
): Promise<ProfileBranding> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase.rpc("get_public_profile_branding", {
    p_professional_id: professionalId,
  });

  if (error || !Array.isArray(data) || data.length === 0) {
    return { logoUrl: null, businessName: null, displayName: null };
  }

  const row = data[0] as {
    logo_url: string | null;
    business_name: string | null;
    full_name: string | null;
  };

  return {
    logoUrl: row.logo_url ?? null,
    businessName: row.business_name ?? null,
    displayName: row.full_name ?? null,
  };
}
