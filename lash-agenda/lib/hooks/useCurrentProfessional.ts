// ─── Hook: usuário autenticado atual ─────────────────────────────────────────
//
// Chama getUser() uma única vez e mantém em cache via SWR.
// Todos os componentes que precisam do professionalId compartilham a mesma
// entrada de cache — sem múltiplas chamadas à rede.

import useSWR from "swr";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { ensureProfessionalProfile } from "@/lib/utils/profile";

const fetchCurrentUser = async (): Promise<User> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Nao autenticado");
  await ensureProfessionalProfile(user);
  return user;
};

export const useCurrentProfessional = () =>
  useSWR("current-user", fetchCurrentUser, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60_000, // getUser() é caro — reutiliza por 1 minuto
  });
