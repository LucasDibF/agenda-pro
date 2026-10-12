import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { RealtimeMount } from "@/components/auth/realtime-mount";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandMark } from "@/components/brand/brand-mark";
import { FadeIn } from "@/components/motion/primitives";
import { ProfessionalNav } from "@/components/professional/professional-nav";
import { createServerSupabase } from "@/lib/supabase/server";

// ─── Layout do painel da profissional ────────────────────────────────────────
//
// Server Component: a validação de autenticação é feita duas vezes:
//   1. No middleware (edge) — barreira principal, antes de renderizar.
//   2. Aqui (defense-in-depth) — garante que qualquer bypass acidental do
//      matcher não exponha as páginas do painel.
//
// Nada de checagem client-side + redirect: isso causava loop server↔client
// quando o cliente Supabase enfrentava flicker de sessão.

type ProfessionalLayoutProps = {
  children: ReactNode;
};

export default async function ProfessionalLayout({
  children,
}: ProfessionalLayoutProps) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/professional");
  }

  return (
    <div className="page-shell">
      {/* Canal Realtime ativo enquanto o painel está aberto — sem auth check */}
      <RealtimeMount professionalId={user.id} />

      <header className="border-b border-[var(--line)] bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] backdrop-blur">
        <FadeIn className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandMark size="sm" />

          <div className="flex items-center gap-6">
            <ProfessionalNav />
            <SignOutButton />
          </div>
        </FadeIn>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
