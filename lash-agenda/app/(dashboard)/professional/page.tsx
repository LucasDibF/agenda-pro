import { DashboardOverview } from "@/components/professional/dashboard-overview";

export default function ProfessionalDashboardPage() {
  return (
    <section className="space-y-6">
      <h1 className="title-display text-2xl font-bold">
        Dashboard da profissional
      </h1>
      <DashboardOverview />
    </section>
  );
}
