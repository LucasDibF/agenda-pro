import { FadeIn, Stagger, StaggerItem } from "@/components/motion/primitives";
import { AvailabilityManager } from "@/components/professional/availability-manager";
import { BlockedTimesManager } from "@/components/professional/blocked-times-manager";
import { AppointmentsManager } from "@/components/professional/appointments-manager";

export default function ProfessionalCalendarPage() {
  return (
    <section className="space-y-6">
      <FadeIn>
        <h1 className="title-display text-2xl">Agenda</h1>
        <p className="text-body-secondary">
          Configure os horarios de atendimento e prepare a base da sua agenda.
        </p>
      </FadeIn>
      <Stagger className="space-y-6" delay={0.06}>
        <StaggerItem>
          <AppointmentsManager />
        </StaggerItem>
        <StaggerItem>
          <AvailabilityManager />
        </StaggerItem>
        <StaggerItem>
          <BlockedTimesManager />
        </StaggerItem>
      </Stagger>
    </section>
  );
}
