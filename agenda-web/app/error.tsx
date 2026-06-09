"use client";

// ─── Boundary de erro global ──────────────────────────────────────────────────
//
// Captura erros não tratados em Server e Client Components durante a renderização.
// O botão "Tentar novamente" chama reset() que re-renderiza a árvore do segmento.

import { useEffect } from "react";

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
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500">
        Algo deu errado
      </p>
      <h1 className="title-display text-3xl font-bold text-[var(--ink-strong)]">
        Erro inesperado
      </h1>
      <p className="max-w-sm text-sm text-[#6E7380]">
        {error.message || "Ocorreu um erro ao carregar esta página."}
      </p>
      <button
        onClick={reset}
        className="btn-primary px-5 py-2.5 text-sm"
      >
        Tentar novamente
      </button>
    </main>
  );
}
