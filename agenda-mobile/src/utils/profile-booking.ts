import type { SupabaseClient } from "@supabase/supabase-js";

function pickSegment(data: {
  booking_slug?: string | null;
  booking_code?: string | null;
}): string | null {
  const slug = data.booking_slug;
  if (typeof slug === "string" && slug.trim().length > 0) return slug.trim();
  const code = data.booking_code;
  if (typeof code === "string" && code.length > 0) return code;
  return null;
}

/** Slug legível → código → UUID. Fallback legado só se coluna `booking_slug` não existir. */
export async function fetchBookingPublicSegment(
  client: SupabaseClient,
  userId: string,
): Promise<string> {
  const primary = await client
    .from("profiles")
    .select("booking_slug, booking_code")
    .eq("id", userId)
    .maybeSingle();

  if (!primary.error && primary.data) {
    return pickSegment(primary.data) ?? userId;
  }

  const missingSlugColumn =
    primary.error?.message?.includes("booking_slug") ||
    primary.error?.code === "42703";

  if (missingSlugColumn) {
    const legacy = await client
      .from("profiles")
      .select("booking_code")
      .eq("id", userId)
      .maybeSingle();

    if (!legacy.error && legacy.data?.booking_code && typeof legacy.data.booking_code === "string") {
      return legacy.data.booking_code;
    }
  }

  return userId;
}
