/**
 * Normaliza o identificador público em `/booking/[slug]` (booking_slug com nome amigável,
 * booking_code legado ou UUID).
 * Remove caracteres invisíveis e, se o usuário colou a URL inteira no perfil, extrai só o slug.
 */
export function normalizeBookingPublicSlug(raw: string): string {
  let s = raw.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      const match = u.pathname.match(/\/booking\/([^/]+)\/?$/);
      if (match?.[1]) {
        try {
          s = decodeURIComponent(match[1]);
        } catch {
          s = match[1];
        }
      }
    } catch {
      /* mantém s */
    }
  }
  return s.trim();
}
