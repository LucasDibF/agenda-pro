import Link from "next/link";

// ─── Página 404 ───────────────────────────────────────────────────────────────

export default function NotFound() {
  return (
    <main className="page-shell flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8B5CF6]">
        Erro 404
      </p>
      <h1 className="title-display text-4xl font-bold text-[var(--ink-strong)]">
        Página não encontrada
      </h1>
      <p className="max-w-sm text-sm text-[#6E7380]">
        O endereço que você acessou não existe ou foi removido.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="btn-primary px-5 py-2.5 text-sm">
          Ir para o início
        </Link>
        <Link href="/professional" className="btn-soft px-5 py-2.5 text-sm">
          Abrir painel
        </Link>
      </div>
    </main>
  );
}
