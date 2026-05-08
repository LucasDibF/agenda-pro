import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-14">
        <div className="hero-shell grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <span className="w-fit rounded-full border border-[#E5E7EE] bg-[#FFFFFF] px-3 py-1 text-xs font-semibold tracking-wide text-[#8B5CF6]">
              AGENDA • MVP
            </span>

            <h1 className="title-display text-4xl font-bold sm:text-5xl">
              Seu estúdio,{" "}
              <span className="italic text-[#7C4DFF]">sua potência.</span>
            </h1>

            <p className="max-w-xl text-sm text-[#6E7380] sm:text-base">
              O Agenda foi desenhado para profissionais que querem atender com
              excelência: agenda online, clientes e rotina organizados em uma única
              plataforma elegante.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary">
                Login
              </Link>
              <Link href="/register" className="btn-soft">
                Criar conta
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[1.75rem] border border-[#E5E7EE] bg-[#FFFFFF] p-8">
            <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full bg-[#DED6FF]/35 blur-2xl" />
            <div className="absolute -bottom-16 -left-8 h-52 w-52 rounded-full bg-[#A78BFA]/28 blur-3xl" />
            <div className="relative space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8B5CF6]">
                Booking Preview
              </p>
              <div className="elevated-card p-4">
                <p className="text-sm font-semibold text-[#1F2430]">Volume Brasileiro</p>
                <p className="mt-1 text-xs text-[#6E7380]">90 min • R$ 180,00</p>
              </div>
              <div className="elevated-card p-4">
                <p className="text-sm font-semibold text-[#1F2430]">Data: 12/05</p>
                <p className="mt-1 text-xs text-[#6E7380]">Horarios livres: 09:00, 11:00, 14:30</p>
              </div>
              <Link href="/booking" className="btn-primary inline-flex">
                Ver pagina publica de agendamento
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
