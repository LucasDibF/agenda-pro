import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { FadeIn, PopIn } from "@/components/motion/primitives";

// ─── Página 404 ───────────────────────────────────────────────────────────────

export default function NotFound() {
  return (
    <main className="page-shell flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <FadeIn>
        <BrandMark size="sm" />
      </FadeIn>
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-dark)]">
          Erro 404
        </p>
      </FadeIn>
      <PopIn delay={0.06}>
        <h1 className="title-display text-4xl text-[var(--ink-strong)]">
          Página não encontrada
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-body-secondary">
          O endereço que você acessou não existe ou foi removido.
        </p>
      </PopIn>
      <FadeIn delay={0.16}>
        <div className="flex gap-3">
          <Link href="/" className="btn-primary px-5 py-2.5 text-sm">
            Ir para o início
          </Link>
          <Link href="/professional" className="btn-soft px-5 py-2.5 text-sm">
            Abrir painel
          </Link>
        </div>
      </FadeIn>
    </main>
  );
}
