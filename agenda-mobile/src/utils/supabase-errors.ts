/**
 * Mensagens do cliente Supabase / RN nem sempre são claras.
 */
export function friendlySupabaseMessage(message: string): string {
  const m = message.trim();
  const lower = m.toLowerCase();

  if (
    lower === "request error" ||
    lower.includes("network request failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("load failed")
  ) {
    return "Sem resposta do servidor. Verifique sua conexão e tente de novo.";
  }

  return m;
}
