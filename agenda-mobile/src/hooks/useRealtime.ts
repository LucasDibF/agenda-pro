// ─── Hook: Supabase Realtime (mobile) ────────────────────────────────────────
//
// Um único canal WebSocket por sessão. Quando qualquer agendamento muda,
// invalida os caches de appointments e dashboard — todas as telas atualizam
// instantaneamente sem ação manual da usuária.

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { supabase } from "../lib/supabase";

export const useRealtimeAppointments = (professionalId: string) => {
  const { mutate } = useSWRConfig();

  useEffect(() => {
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
