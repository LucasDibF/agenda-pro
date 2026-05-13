// ─── Hook: Supabase Realtime para agendamentos ────────────────────────────────
//
// Mantém um único canal WebSocket por sessão de profissional.
// Quando chega qualquer mudança em `appointments` (insert/update/delete),
// invalida os caches SWR relevantes — todas as telas atualizam automaticamente
// sem polling ou refresh manual.

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { supabase } from "@/lib/supabase/client";

export const useRealtimeAppointments = (professionalId: string | null) => {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (!professionalId) return;

    const channel = supabase
      .channel(`appointments:${professionalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `professional_id=eq.${professionalId}`,
        },
        () => {
          // Invalida todos os caches de appointments e dashboard deste profissional
          mutate(
            (key: unknown) =>
              Array.isArray(key) &&
              (key[0] === "appointments" || key[0] === "dashboard") &&
              key[1] === professionalId
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [professionalId, mutate]);
};
