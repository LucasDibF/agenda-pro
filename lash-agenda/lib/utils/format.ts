// ─── Formatação de valores e contatos ────────────────────────────────────────

/** Número → "R$ 0,00" */
export const formatCurrencyBRL = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

/**
 * Remove máscara e garante o código +55.
 * Retorna null se o número tiver menos de 10 dígitos.
 */
export const normalizePhoneForWhatsapp = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
};

type WhatsappAppointmentData = {
  customer_name: string;
  customer_phone: string;
  appointment_date: string; // "YYYY-MM-DD"
  start_time: string;       // "HH:mm" ou "HH:mm:ss"
  service: { name: string } | null;
};

/** Monta o link wa.me com mensagem de confirmação pré-preenchida. */
export const buildWhatsappUrl = (appointment: WhatsappAppointmentData): string | null => {
  const phone = normalizePhoneForWhatsapp(appointment.customer_phone);
  if (!phone) return null;

  const firstName =
    appointment.customer_name.trim().split(/\s+/).filter(Boolean)[0] || "cliente";
  const serviceName = appointment.service?.name ?? "serviço";
  const [year, month, day] = appointment.appointment_date.split("-");
  const dateBr = `${day}/${month}/${year}`;
  const hour = appointment.start_time.slice(0, 5);

  const message = [
    `Olá ${firstName}!`,
    `Seu horário foi confirmado para ${dateBr} às ${hour}.`,
    `Serviço: ${serviceName}.`,
    "Qualquer dúvida, estou à disposição.",
  ].join(" ");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};
