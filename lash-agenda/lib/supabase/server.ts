// ─── Cliente Supabase para Server Components ─────────────────────────────────
//
// Usa @supabase/ssr para ler e escrever cookies via next/headers.
// Deve ser instanciado dentro de funções async (não no escopo do módulo)
// pois cookies() é uma chamada assíncrona.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Em Server Components o cookie não pode ser escrito aqui — ignorar.
          }
        },
      },
    }
  );
}
