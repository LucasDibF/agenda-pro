import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Segmento público `/booking/[slug]`: usa `booking_slug` quando existir no banco,
 * senão `booking_code`, senão `userId`.
 * Compatível com projetos que ainda não rodaram `mvp_profiles_booking_slug.sql`.
 */
export async function fetchBookingPublicSegment(
  client: SupabaseClient,
  userId: string,
): Promise<string> {
  const withSlug = await client
    .from("profiles")
    .select("booking_slug, booking_code")
    .eq("id", userId)
    .maybeSingle();

  if (!withSlug.error && withSlug.data) {
    const slug = withSlug.data.booking_slug;
    if (typeof slug === "string" && slug.trim().length > 0) return slug.trim();
    const code = withSlug.data.booking_code;
    if (typeof code === "string" && code.length > 0) return code;
    return userId;
  }

  const legacy = await client.from("profiles").select("booking_code").eq("id", userId).maybeSingle();

  if (!legacy.error && legacy.data?.booking_code && typeof legacy.data.booking_code === "string") {
    return legacy.data.booking_code;
  }

  return userId;
}
