"use server";

import { headers } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { sendBookingPushNotification } from "@/lib/notifications/send-booking-push";
import { checkRateLimit, readClientIp } from "@/lib/rate-limit";

export type SubmitPublicBookingInput = {
  professionalId: string;
  serviceId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
};

export type SubmitPublicBookingResult =
  | { ok: true; appointmentId: string }
  | { ok: false; error: string };

function normalizeRpcError(error: { message: string; code?: string }): string {
  if (error.message.includes("appointments_no_overlap") || error.message.includes("exclusion")) {
    return "Este horario foi reservado por outra pessoa agora mesmo. Escolha outro horario.";
  }
  if (error.message.includes("Horario esta bloqueado")) {
    return "Este horario nao esta mais disponivel. Escolha outro.";
  }
  if (error.message.includes("Servico nao")) {
    return "Servico invalido para esta profissional. Recarregue a pagina.";
  }
  if (error.message.includes("row-level security")) {
    return "Nao foi possivel confirmar o agendamento. Execute o SQL de configuracao no Supabase.";
  }
  return error.message;
}

function bookingWaitMessage(retryAfterSec: number): string {
  if (retryAfterSec >= 60) {
    const minutes = Math.ceil(retryAfterSec / 60);
    const unit = minutes === 1 ? "minuto" : "minutos";
    return `Muitas tentativas de agendamento. Aguarde ${minutes} ${unit} e tente de novo.`;
  }
  return "Muitas tentativas de agendamento. Aguarde alguns segundos e tente de novo.";
}

async function publicBookingRateError(): Promise<string | null> {
  const headerStore = await headers();
  const ip = readClientIp(headerStore);
  const rate = checkRateLimit(`public-booking:${ip}`, {
    limit: 8,
    windowMs: 10 * 60_000,
    scope: "public-booking",
    globalLimit: 200,
  });
  if (!rate.ok) return bookingWaitMessage(rate.retryAfterSec);
  return null;
}

export async function submitPublicBooking(
  input: SubmitPublicBookingInput,
): Promise<SubmitPublicBookingResult> {
  const rateError = await publicBookingRateError();
  if (rateError) return { ok: false, error: rateError };

  const payload = {
    professional_id: input.professionalId,
    service_id: input.serviceId,
    customer_name: input.customerName.trim(),
    customer_phone: input.customerPhone.trim(),
    customer_email: null,
    appointment_date: input.appointmentDate,
    start_time: input.startTime,
    end_time: input.endTime,
    notes: input.notes?.trim() || null,
    status: "agendado" as const,
  };

  const admin = createAdminSupabase();
  if (admin) {
    const { data, error } = await admin.from("appointments").insert(payload).select("id").single();
    if (error) return { ok: false, error: normalizeRpcError(error) };
    if (data?.id) void sendBookingPushNotification(data.id).catch(() => {});
    return { ok: true, appointmentId: data.id };
  }

  const supabase = await createServerSupabase();

  const { data: rpcId, error: rpcError } = await supabase.rpc("create_public_appointment", {
    p_professional_id: input.professionalId,
    p_service_id: input.serviceId,
    p_customer_name: input.customerName.trim(),
    p_customer_phone: input.customerPhone.trim(),
    p_appointment_date: input.appointmentDate,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_notes: input.notes?.trim() || null,
  });

  if (!rpcError && typeof rpcId === "string") {
    void sendBookingPushNotification(rpcId).catch(() => {});
    return { ok: true, appointmentId: rpcId };
  }

  const rpcMissing =
    rpcError?.code === "PGRST202" ||
    rpcError?.message?.includes("create_public_appointment") ||
    rpcError?.message?.includes("Could not find the function");

  if (!rpcMissing) {
    return { ok: false, error: normalizeRpcError(rpcError ?? { message: "Erro ao agendar." }) };
  }

  const { data, error } = await supabase.from("appointments").insert(payload).select("id").single();
  if (error) return { ok: false, error: normalizeRpcError(error) };
  if (data?.id) void sendBookingPushNotification(data.id).catch(() => {});
  return { ok: true, appointmentId: data.id };
}
