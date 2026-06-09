const ALLOWED_LOGIN_PATHS = new Set([
  "/professional",
  "/professional/calendar",
  "/professional/services",
  "/booking",
  "/reset-password",
  "/forgot-password",
]);

/** Aceita apenas paths internos relativos — bloqueia open redirect. */
export function sanitizeInternalPath(raw: string | undefined | null, fallback = "/professional"): string {
  if (!raw || typeof raw !== "string") return fallback;

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\") || trimmed.includes("@")) return fallback;

  const pathOnly = trimmed.split(/[?#]/)[0] ?? trimmed;
  if (ALLOWED_LOGIN_PATHS.has(pathOnly)) return pathOnly;
  if (pathOnly.startsWith("/professional/") || pathOnly.startsWith("/booking/")) return pathOnly;

  return fallback;
}
