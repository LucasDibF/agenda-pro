import { FadeIn } from "@/components/motion/primitives";
import { DashboardOverview } from "@/components/professional/dashboard-overview";

export default function ProfessionalDashboardPage() {
  return (
    <section className="space-y-6">
      <FadeIn>
        <h1 className="title-display text-2xl">
          Dashboard da profissional
        </h1>
      </FadeIn>
      <DashboardOverview />
    </section>
  );
}
