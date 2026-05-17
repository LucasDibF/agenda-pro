/**
 * Deploy na Vercel onde `/booking` responde (`curl -I …/booking/x` → 200).
 * `lash-agenda.vercel.app` ainda pode retornar 404 até estar ligado a este projeto.
 *
 * Origem copiável no painel: defina `NEXT_PUBLIC_BOOKING_APP_URL` (ver `.env.example`).
 */
export const PUBLIC_BOOKING_APP_FALLBACK = "https://lash-agenda-plum.vercel.app";

/** Hosts que não servem esta app no deploy atual — links copiados usam o FALLBACK plum. */
const KNOWN_LEGACY_HOSTS = new Set([
  "lash-agenda.vercel.app",
  "lash-agenda-k66ipli1j-lucas-freitas-dibs-projects.vercel.app",
]);

function normalizeOrigin(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (KNOWN_LEGACY_HOSTS.has(url.hostname)) return PUBLIC_BOOKING_APP_FALLBACK;
    return `${url.protocol}//${url.host}`;
  } catch {
    return PUBLIC_BOOKING_APP_FALLBACK;
  }
}

/**
 * Origem para montar `/booking/[código]` no material copiado do painel.
 *
 * Ordem:
 * 1. `NEXT_PUBLIC_BOOKING_APP_URL` (ideal na Vercel = domínio em que `/booking` responde 200)
 * 2. `browserOrigin` (localhost em desenvolvimento)
 * 3. Fallback Plum até `lash-agenda.vercel.app` servir este app
 */
export function getPublicBookingSiteBase(browserOrigin?: string | null): string {
  const fromEnv = process.env.NEXT_PUBLIC_BOOKING_APP_URL;
  if (fromEnv?.trim()) return normalizeOrigin(fromEnv);
  if (browserOrigin?.trim()) return normalizeOrigin(browserOrigin);
  return PUBLIC_BOOKING_APP_FALLBACK;
}

export function publicBookingUrl(bookingSlug: string, browserOrigin?: string | null): string {
  const slug = encodeURIComponent(bookingSlug);
  return `${getPublicBookingSiteBase(browserOrigin)}/booking/${slug}`;
}
