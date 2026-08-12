"use client";

// ─── Monta o canal Supabase Realtime para a profissional ────────────────────
//
// Componente client isolado. Não re-valida autenticação: assume que o
// middleware (edge) + layout (server component) já garantiram a sessão.
// Isso evita o loop de redirect que existia quando duas camadas faziam
// getUser() em paralelo e reagiam a flickers transitórios de sessão.

import { useRealtimeAppointments } from "@/lib/hooks/useRealtime";

type RealtimeMountProps = {
  professionalId: string;
};

export function RealtimeMount({ professionalId }: RealtimeMountProps) {
  useRealtimeAppointments(professionalId);
  return null;
}
