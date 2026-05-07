import { ServicesManager } from "@/components/professional/services-manager";

export default function ProfessionalServicesPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Serviços</h1>
        <p className="text-neutral-600">
          Cadastre e gerencie os serviços que serao exibidos para suas clientes.
        </p>
      </div>
      <ServicesManager />
    </section>
  );
}
