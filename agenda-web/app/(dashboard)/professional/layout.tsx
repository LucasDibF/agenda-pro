import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { RealtimeMount } from "@/components/auth/realtime-mount";
import { SignOutButton } from "@/components/auth/sign-out-button";
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

      <header className="border-b border-[#E5E7EE] bg-[#FFFFFF]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="brand-word text-2xl leading-none">
            Agenda
          </Link>

          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/professional"
                className="text-[#6E7380] hover:text-[#8B5CF6] hover:underline"
              >
                Dashboard
              </Link>
              <Link
                href="/professional/services"
                className="text-[#6E7380] hover:text-[#8B5CF6] hover:underline"
              >
                Serviços
              </Link>
              <Link
                href="/professional/calendar"
                className="text-[#6E7380] hover:text-[#8B5CF6] hover:underline"
              >
                Agenda
              </Link>
            </nav>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
