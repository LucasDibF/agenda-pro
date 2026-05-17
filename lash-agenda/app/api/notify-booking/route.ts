import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** Teto da função (Vercel free costuma truncar perto de 10s; alinhar com expoPushTimeoutMs). */
export const maxDuration = 10;

type NotifyBody = {
  appointmentId?: string;
};

export async function POST(request: Request) {
  const { appointmentId } = (await request.json()) as NotifyBody;
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId obrigatorio." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Variaveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorias." },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("appointments")
    .select("professional_id, customer_name, appointment_date, start_time")
    .eq("id", appointmentId)
    .single();

  if (appointmentError || !appointment) {
    return NextResponse.json({ error: "Agendamento nao encontrado." }, { status: 404 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("push_token")
    .eq("id", appointment.professional_id)
    .single();

  if (profileError || !profile?.push_token) {
    return NextResponse.json({ ok: true, skipped: "professional-without-push-token" });
  }

  const [year, month, day] = appointment.appointment_date.split("-");
  const dateBr = `${day}/${month}/${year}`;
  const hour = appointment.start_time.slice(0, 5);

  /** Menor que `maxDuration` da rota menos os round-trips Supabase típicos. */
  const expoPushTimeoutMs = 6500;

  try {
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      signal: AbortSignal.timeout(expoPushTimeoutMs),
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: profile.push_token,
        title: "Novo agendamento",
        body: `${appointment.customer_name} marcou para ${dateBr} as ${hour}.`,
        sound: "default",
      }),
    });

    if (!expoResponse.ok) {
      return NextResponse.json({ error: "Falha ao enviar push para Expo." }, { status: 502 });
    }
  } catch (err: unknown) {
    const errorName =
      err instanceof Error
        ? err.name
        : err && typeof err === "object" && "name" in err && typeof (err as { name: unknown }).name === "string"
          ? (err as { name: string }).name
          : "";
    if (errorName === "AbortError" || errorName === "TimeoutError") {
      return NextResponse.json(
        { error: "Timeout ao contatar servidor de push. Tente novamente ou verifique Expo." },
        { status: 504 }
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
