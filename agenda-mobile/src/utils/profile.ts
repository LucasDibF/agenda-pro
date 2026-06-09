// ─── Utilitário de perfil da profissional (mobile) ───────────────────────────
//
// Mantém paridade com agenda-web/lib/utils/profile.ts.
// Chamado no shell autenticado para garantir que a linha em `profiles`
// existe antes dos managers (services, agenda, etc.) usarem o id da sessão.

import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export async function ensureProfessionalProfile(user: User) {
  const fullName =
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
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
