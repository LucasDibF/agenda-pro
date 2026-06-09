import { BookingFlow } from "@/components/public/booking-flow";
import {
  fetchPublicAvailability,
  fetchPublicBranding,
  fetchPublicServices,
  resolveProfessionalIdOnServer,
} from "@/lib/booking/public-booking-server";

export const revalidate = 300;

type BookingPageProps = {
  params: Promise<{
    professionalId: string;
  }>;
};

export default async function PublicBookingPage({ params }: BookingPageProps) {
  const { professionalId: identifier } = await params;
  const resolvedId = await resolveProfessionalIdOnServer(identifier);

  const [initialServices, initialAvailability, branding] = resolvedId
    ? await Promise.all([
        fetchPublicServices(resolvedId),
        fetchPublicAvailability(resolvedId),
        fetchPublicBranding(resolvedId),
      ])
    : [[], [], { logoUrl: null, businessName: null, displayName: null }];

  const heroTitle =
    branding.businessName?.trim() ||
    branding.displayName?.trim() ||
    "Vamos marcar seu horário";
  const heroSubtitle =
    branding.businessName && branding.displayName
      ? `com ${branding.displayName}`
      : "Escolha serviço, dia e horário em poucos cliques.";

  return (
    <main
      className="page-shell pb-32 sm:pb-24"
      style={{ background: "var(--background)" }}
    >
      {/* ── Hero topbar (gradiente roxo) ─────────────────────────────── */}
      <header
        className="relative isolate overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-grad-from) 0%, var(--accent-grad-to) 100%)",
        }}
      >
        {/* Blobs decorativos */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-32 -z-10 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "rgba(255,255,255,0.18)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 left-1/4 -z-10 h-56 w-56 rounded-full blur-3xl"
          style={{ background: "rgba(255,255,255,0.14)" }}
        />

        <div className="relative z-10 mx-auto flex min-h-[260px] max-w-2xl flex-col justify-between gap-6 px-5 pb-10 pt-8 sm:min-h-[280px] sm:px-6 sm:pb-12 sm:pt-10">
          {/* Topo: brand + status */}
          <div className="flex items-center justify-between text-white">
            <span className="text-base font-semibold tracking-tight sm:text-lg">
              Agenda Online
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wider ring-1 ring-white/25 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Online
            </span>
          </div>

          {/* Bloco principal: logo + título */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/30 bg-white/15 shadow-lg shadow-black/15 backdrop-blur-sm sm:h-20 sm:w-20">
              {branding.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={branding.logoUrl}
                  alt={branding.businessName ?? branding.displayName ?? "Logo"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-white sm:text-3xl">
                  {(heroTitle[0] ?? "A").toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 text-white">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/85 sm:text-xs">
                Reservar horário
              </p>
              <h1
                className="mt-1 text-2xl font-bold leading-tight text-white sm:text-3xl"
                style={{
                  fontFamily: "var(--font-brand), 'Times New Roman', serif",
                  letterSpacing: "-0.02em",
                }}
              >
                {heroTitle}
              </h1>
              <p className="mt-1 truncate text-xs text-white/85 sm:text-sm">
                {heroSubtitle}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Card principal ─────────────────────────────────────────── */}
      <section className="mx-auto mt-6 max-w-2xl px-4 sm:px-6">
        <BookingFlow
          professionalIdentifier={identifier}
          initialProfessionalId={resolvedId}
          initialServices={initialServices}
          initialAvailability={initialAvailability}
        />
      </section>
    </main>
  );
}
