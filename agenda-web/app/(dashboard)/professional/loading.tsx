// ─── Skeleton de loading do painel ───────────────────────────────────────────
//
// Exibido automaticamente pelo Next.js enquanto o segmento /professional
// (ou suas sub-rotas) ainda está carregando dados assíncronos.

import { FadeIn } from "@/components/motion/primitives";

export default function ProfessionalLoading() {
  return (
    <FadeIn>
      <div className="grid animate-pulse gap-4 md:grid-cols-6">
        <div className="hero-shell md:col-span-6 h-32 bg-[var(--surface-soft)]" />
        <div className="elevated-card h-24 md:col-span-2 bg-[var(--surface-soft)]" />
        <div className="elevated-card h-24 md:col-span-2 bg-[var(--surface-soft)]" />
        <div className="elevated-card h-24 md:col-span-2 bg-[var(--surface-soft)]" />
        <div className="elevated-card h-48 md:col-span-6 bg-[var(--surface-soft)]" />
      </div>
    </FadeIn>
  );
}
