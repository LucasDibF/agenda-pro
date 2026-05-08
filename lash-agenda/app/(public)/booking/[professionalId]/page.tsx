import { BookingFlow } from "@/components/public/booking-flow";

type BookingPageProps = {
  params: Promise<{
    professionalId: string;
  }>;
};

export default async function PublicBookingPage({ params }: BookingPageProps) {
  const { professionalId } = await params;

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <h1 className="title-display text-3xl font-bold">Agendar horario</h1>

        <p className="text-[#6c5953]">
          Escolha o serviço, a data e o melhor horário para você.
        </p>

        <BookingFlow professionalIdentifier={professionalId} />
      </section>
    </main>
  );
}
