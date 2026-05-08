import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-14">
        <div className="hero-shell grid gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <span className="w-fit rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs font-semibold tracking-wide text-[#7c4d42]">
              AGENDA • MVP
            </span>

            <h1 className="title-display text-4xl font-bold sm:text-5xl">
              Elegancia no visual.
              <br />
              Simplicidade no agendamento.
            </h1>

            <p className="max-w-xl text-sm text-[#5f4b45] sm:text-base">
              Uma experiencia premium para profissionais: clientes agendam online em
              poucos cliques e voce acompanha tudo em um painel organizado.
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

          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/50 bg-white/55 p-8">
            <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full bg-[#c98f82]/30 blur-2xl" />
            <div className="absolute -bottom-16 -left-8 h-52 w-52 rounded-full bg-[#fff1ea] blur-3xl" />
            <div className="relative space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#846057]">
                Booking Preview
              </p>
              <div className="elevated-card p-4">
                <p className="text-sm font-semibold text-[#2a201d]">Volume Brasileiro</p>
                <p className="mt-1 text-xs text-[#6f5a54]">90 min • R$ 180,00</p>
              </div>
              <div className="elevated-card p-4">
                <p className="text-sm font-semibold text-[#2a201d]">Data: 12/05</p>
                <p className="mt-1 text-xs text-[#6f5a54]">Horarios livres: 09:00, 11:00, 14:30</p>
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
