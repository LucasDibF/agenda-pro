import Link from "next/link";
import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SignOutButton } from "@/components/auth/sign-out-button";

type ProfessionalLayoutProps = {
  children: ReactNode;
};

export default function ProfessionalLayout({
  children,
}: ProfessionalLayoutProps) {
  return (
    <ProtectedRoute>
      <div className="page-shell">
        <header className="border-b border-[#E5E7EE] bg-[#FFFFFF]/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="brand-word text-2xl leading-none">
              Agenda
            </Link>

            <div className="flex items-center gap-6">
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/professional" className="text-[#6E7380] hover:text-[#8B5CF6] hover:underline">
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
    </ProtectedRoute>
  );
}
