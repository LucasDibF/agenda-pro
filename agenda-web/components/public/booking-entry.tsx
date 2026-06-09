"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { fetchBookingPublicSegment } from "@/lib/utils/profile-booking";

export function BookingEntry() {
  const router = useRouter();
  const [professionalIdInput, setProfessionalIdInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        const segment = await fetchBookingPublicSegment(supabase, user.id);

        router.replace(`/booking/${encodeURIComponent(segment)}`);
        return;
      }

      setLoading(false);
    };

    loadCurrentUser();
  }, [router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!professionalIdInput.trim()) return;

    router.push(`/booking/${encodeURIComponent(professionalIdInput.trim())}`);
  };

  if (loading) {
    return (
      <main className="page-shell">
        <section className="mx-auto max-w-3xl space-y-4 px-6 py-12">
          <h1 className="title-display text-3xl font-bold">Agendar horario</h1>
          <p className="text-body-secondary">Carregando...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <h1 className="title-display text-3xl font-bold">Agendar horario</h1>

        <form onSubmit={handleSubmit} className="elevated-card space-y-4 p-5">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-[var(--ink-strong)]">Profissional</span>
            <input
              type="text"
              value={professionalIdInput}
              onChange={(event) => setProfessionalIdInput(event.target.value)}
              className="input-shell"
              placeholder="Ex: maria-silva"
            />
          </label>

          <button type="submit" className="btn-primary w-full">
            Abrir
          </button>
        </form>

        <Link href="/professional" className="text-link-accent text-sm font-semibold">
          Painel da profissional
        </Link>
      </section>
    </main>
  );
}
