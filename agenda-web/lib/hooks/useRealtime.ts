// ─── Hook: Supabase Realtime para agendamentos ────────────────────────────────
//
// Mantém um único canal WebSocket por sessão de profissional.
// Se WebSocket falhar (HTTP não-localhost, rede, CSP), o painel continua
// funcionando — só perde atualização automática em tempo real.

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { supabase } from "@/lib/supabase/client";

export const useRealtimeAppointments = (professionalId: string | null) => {
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (!professionalId) return;

    if (typeof window !== "undefined" && !window.isSecureContext) {
      console.warn(
        "[Realtime] WebSocket indisponivel neste contexto (use HTTPS ou localhost).",
      );
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
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
                key[1] === professionalId,
            );
          },
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn("[Realtime] Falha na inscricao:", err.message);
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[Realtime] Canal indisponivel:", status);
          }
        });
    } catch (err) {
      console.warn("[Realtime] Nao foi possivel iniciar WebSocket:", err);
      return;
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [professionalId, mutate]);
};
