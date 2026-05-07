import { AvailabilityManager } from "@/components/professional/availability-manager";
import { BlockedTimesManager } from "@/components/professional/blocked-times-manager";
import { AppointmentsManager } from "@/components/professional/appointments-manager";

export default function ProfessionalCalendarPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Agenda</h1>
        <p className="text-neutral-600">
          Configure os horarios de atendimento e prepare a base da sua agenda.
        </p>
      </div>
      <AppointmentsManager />
      <AvailabilityManager />
      <BlockedTimesManager />
    </section>
  );
}
