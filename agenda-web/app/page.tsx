import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { ClienteSteps } from "@/components/motion/cliente-steps";
import { PopIn, Stagger, StaggerItem } from "@/components/motion/primitives";

const clienteSteps = [
  {
    title: "Serviço e valor",
    body:
      "Na sua página ficam só os serviços que você mantém ligados — com tempo de duração e preço bem explícitos, para ninguém chutar combinado.",
  },
  {
    title: "Data e horário livre",
    body:
      "Ela marca o dia e enxerga só horários livres dentro da disponibilidade que você configurou, respeitando bloqueios e o que já estiver na agenda.",
  },
  {
    title: "Confirmação rápida",
    body:
      "A cliente informa nome e contato para concluir sem criar conta.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-14">
        <div className="hero-shell grid gap-10 lg:grid-cols-2">
          <Stagger className="space-y-6">
            <StaggerItem>
              <BrandMark size="lg" />
            </StaggerItem>

            <StaggerItem>
              <span className="border-[var(--line)] bg-[var(--surface)] text-[var(--accent-dark)] inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold tracking-wide">
                Lillo — agenda online, com a sua cara
              </span>
            </StaggerItem>

            <StaggerItem>
              <h1 className="title-display text-4xl sm:text-5xl">
                Seu estúdio,{" "}
                <span className="brand-word italic">sua potência.</span>
              </h1>
            </StaggerItem>

            <StaggerItem>
              <p className="text-body-secondary max-w-xl text-sm sm:text-base">
                O Lillo foi desenhado para profissionais que querem atender com
                excelência: agenda online, clientes e rotina organizados em uma
                plataforma suave e elegante.
              </p>
            </StaggerItem>

            <StaggerItem>
              <div className="flex flex-wrap gap-3">
                <Link href="/login" className="btn-primary">
                  Login
                </Link>
                <Link href="/register" className="btn-soft">
                  Criar conta
                </Link>
              </div>
            </StaggerItem>
          </Stagger>

          <PopIn delay={0.12} className="border-[var(--line)] bg-[var(--surface)] relative overflow-hidden rounded-[1.75rem] border p-8">
            <div className="absolute -right-12 -top-14 h-48 w-48 rounded-full blur-2xl bg-[color-mix(in_oklab,var(--accent-grad-from)_32%,transparent)]" />
            <div className="absolute -bottom-16 -left-8 h-52 w-52 rounded-full blur-3xl bg-[color-mix(in_oklab,var(--accent-grad-to)_28%,transparent)]" />

            <div className="relative space-y-5">
              <p className="text-[var(--accent-dark)] text-xs font-semibold uppercase tracking-[0.18em]">
                Experiência da sua cliente
              </p>

              <ClienteSteps steps={clienteSteps} />

              <Link href="/booking" className="btn-primary inline-flex w-full justify-center">
                Ver página pública de agendamento
              </Link>
            </div>
          </PopIn>
        </div>
      </section>
    </main>
  );
}
