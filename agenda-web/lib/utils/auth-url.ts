/** Origem do site para redirects de auth (cliente ou env). */
export function getSiteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_BOOKING_APP_URL ??
    "http://localhost:3000"
  );
}

/** URL de retorno após clicar no link de recuperação de senha no email. */
export function getPasswordResetRedirectUrl(): string {
  const next = encodeURIComponent("/reset-password");
  return `${getSiteOrigin()}/auth/callback?next=${next}`;
}
