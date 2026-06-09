// ─── Cliente Supabase para Client Components ─────────────────────────────────
//
// Usa @supabase/ssr para gerenciar tokens via cookies, garantindo compatibilidade
// com o middleware de autenticação e com Server Components.

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variaveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY sao obrigatorias."
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
