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
          <div className="booking-wave-layer" aria-hidden="true">
            <svg className="booking-wave-svg booking-wave-a" viewBox="0 0 1200 140" preserveAspectRatio="none">
              <path
                className="booking-wave-line"
                d="M-40 68 C 120 22, 260 114, 420 68 C 580 22, 720 114, 880 68 C 1040 22, 1180 114, 1340 68"
              />
              <path
                className="booking-wave-line soft"
                d="M-40 86 C 120 44, 260 128, 420 86 C 580 44, 720 128, 880 86 C 1040 44, 1180 128, 1340 86"
              />
            </svg>
            <svg className="booking-wave-svg booking-wave-b" viewBox="0 0 1200 140" preserveAspectRatio="none">
              <path
                className="booking-wave-line"
                d="M-40 62 C 120 12, 260 108, 420 62 C 580 12, 720 108, 880 62 C 1040 12, 1180 108, 1340 62"
              />
              <path
                className="booking-wave-line soft"
                d="M-40 96 C 120 56, 260 134, 420 96 C 580 56, 720 134, 880 96 C 1040 56, 1180 134, 1340 96"
              />
            </svg>
            <svg className="booking-wave-svg booking-wave-c" viewBox="0 0 1200 140" preserveAspectRatio="none">
              <path
                className="booking-wave-line"
                d="M-40 72 C 120 24, 260 116, 420 72 C 580 24, 720 116, 880 72 C 1040 24, 1180 116, 1340 72"
              />
              <path
                className="booking-wave-line soft"
                d="M-40 104 C 120 64, 260 136, 420 104 C 580 64, 720 136, 880 104 C 1040 64, 1180 136, 1340 104"
              />
            </svg>
          </div>
          <div className="booking-blob booking-blob-one" />
          <div className="booking-blob booking-blob-two" />
          <div className="booking-blob booking-blob-three" />

          <div className="booking-content-layer space-y-6">
            <div className="space-y-2">
              <h1 className="title-display text-3xl font-bold sm:text-4xl">Agenda Online</h1>
              <p className="text-body-secondary text-sm sm:text-base">
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
