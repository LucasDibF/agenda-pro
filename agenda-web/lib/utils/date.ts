// ─── Formatação de datas e horas ─────────────────────────────────────────────

/** Date → "YYYY-MM-DD" (sem conversão de timezone) */
export const toLocalDateInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** "YYYY-MM-DD" → "DD/MM/YYYY" */
export const formatDateBr = (dateInput: string): string => {
  const [year, month, day] = dateInput.split("-");
  return `${day}/${month}/${year}`;
};

/** Date → "YYYY-MM-DDTHH:mm" (usado em inputs datetime-local) */
export const toDatetimeLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/** ISO 8601 → formato pt-BR curto com hora ("dd/mm/aaaa HH:mm") */
export const formatDateTime = (isoDateString: string): string =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoDateString));
