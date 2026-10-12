import { FadeIn } from "@/components/motion/primitives";
import { ServicesManager } from "@/components/professional/services-manager";

export default function ProfessionalServicesPage() {
  return (
    <section className="space-y-6">
      <FadeIn>
        <h1 className="title-display text-2xl">Serviços</h1>
        <p className="text-body-secondary">
          Cadastre e gerencie os serviços que serao exibidos para suas clientes.
        </p>
      </FadeIn>
      <ServicesManager />
    </section>
  );
}
