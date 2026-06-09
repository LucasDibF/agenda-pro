import { createClient } from "@supabase/supabase-js";

const expoPushTimeoutMs = 6500;

export async function sendBookingPushNotification(appointmentId: string): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from("appointments")
    .select("professional_id, customer_name, appointment_date, start_time")
    .eq("id", appointmentId)
    .single();

  if (appointmentError || !appointment) return;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("push_token")
    .eq("id", appointment.professional_id)
    .single();

  if (!profile?.push_token) return;

  const [year, month, day] = appointment.appointment_date.split("-");
  const dateBr = `${day}/${month}/${year}`;
  const hour = appointment.start_time.slice(0, 5);

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    signal: AbortSignal.timeout(expoPushTimeoutMs),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: profile.push_token,
      title: "Novo agendamento",
      body: `${appointment.customer_name} marcou para ${dateBr} as ${hour}.`,
      sound: "default",
    }),
  });
}
