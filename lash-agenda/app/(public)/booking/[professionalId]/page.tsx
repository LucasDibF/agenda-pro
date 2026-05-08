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
      <section className="mx-auto max-w-4xl px-6 py-10">
        <div className="booking-animated-shell">
          <div className="booking-blob booking-blob-one" />
          <div className="booking-blob booking-blob-two" />
          <div className="booking-blob booking-blob-three" />

          <div className="booking-content-layer space-y-6">
            <div className="space-y-2">
              <h1 className="title-display text-3xl font-bold sm:text-4xl">Agenda Online</h1>
              <p className="text-sm text-[var(--foreground)]/75 sm:text-base">
                Escolha o serviço, a data e o melhor horário para confirmar seu agendamento.
              </p>
            </div>

            <BookingFlow professionalIdentifier={professionalId} />
          </div>
        </div>
      </section>
    </main>
  );
}
