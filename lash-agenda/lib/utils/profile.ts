// ─── Utilitário de perfil da profissional ────────────────────────────────────
//
// Todos os managers do painel precisam garantir que o perfil existe antes de
// qualquer operação. Esta função centraliza essa lógica.

import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/**
 * Cria ou atualiza o perfil da profissional logada.
 * Chamada no mount de cada manager para garantir consistência.
 * Retorna o erro do Supabase, ou null em caso de sucesso.
 */
export async function ensureProfessionalProfile(user: User) {
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;
  const phone =
    typeof user.user_metadata?.phone === "string" ? user.user_metadata.phone : null;

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    phone,
    role: "professional",
  });

  return error;
}
