import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBookingPushNotification } from "@/lib/notifications/send-booking-push";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 10;

type NotifyBody = {
  appointmentId?: string;
};

function isAuthorized(request: Request): boolean {
  const secret = process.env.NOTIFY_BOOKING_SECRET;
  if (!secret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const headerSecret = request.headers.get("x-notify-booking-secret");
  return headerSecret === secret;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`notify-booking:${ip}`, 10, 60_000);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Muitas requisicoes. Tente novamente em breve." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: NotifyBody;
  try {
    body = (await request.json()) as NotifyBody;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const { appointmentId } = body;
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId obrigatorio." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Configuracao do servidor incompleta." }, { status: 500 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("appointments")
    .select("id, created_at")
    .eq("id", appointmentId)
    .single();

  if (appointmentError || !appointment) {
    return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });
  }

  const createdAt = new Date(appointment.created_at as string).getTime();
  const maxAgeMs = 5 * 60_000;
  if (Number.isNaN(createdAt) || Date.now() - createdAt > maxAgeMs) {
    return NextResponse.json({ error: "Agendamento expirado para notificacao." }, { status: 403 });
  }

  try {
    await sendBookingPushNotification(appointmentId);
  } catch {
    return NextResponse.json({ error: "Falha ao enviar notificacao." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
