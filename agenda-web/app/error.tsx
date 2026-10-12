"use client";

// ─── Boundary de erro global ──────────────────────────────────────────────────
//
// Captura erros não tratados em Server e Client Components durante a renderização.
// O botão "Tentar novamente" chama reset() que re-renderiza a árvore do segmento.

import { useEffect } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { FadeIn, PopIn } from "@/components/motion/primitives";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <main className="page-shell flex flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <FadeIn>
        <BrandMark size="sm" />
      </FadeIn>
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500">
          Algo deu errado
        </p>
      </FadeIn>
      <PopIn delay={0.06}>
        <h1 className="title-display text-3xl text-[var(--ink-strong)]">
          Erro inesperado
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-body-secondary">
          {error.message || "Ocorreu um erro ao carregar esta página."}
        </p>
      </PopIn>
      <FadeIn delay={0.16}>
        <button
          onClick={reset}
          className="btn-primary px-5 py-2.5 text-sm"
        >
          Tentar novamente
        </button>
      </FadeIn>
    </main>
  );
}
