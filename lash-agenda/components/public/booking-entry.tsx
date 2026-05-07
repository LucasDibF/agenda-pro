"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

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
        router.replace(`/booking/${user.id}`);
        return;
      }

      setLoading(false);
    };

    loadCurrentUser();
  }, [router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!professionalIdInput.trim()) return;

    router.push(`/booking/${professionalIdInput.trim()}`);
  };

  if (loading) {
    return (
      <main className="page-shell">
        <section className="mx-auto max-w-3xl space-y-4 px-6 py-12">
          <h1 className="title-display text-3xl font-bold">Agendar horario</h1>
          <p className="text-[#6c5953]">Carregando link de agendamento...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-3xl space-y-6 px-6 py-12">
        <h1 className="title-display text-3xl font-bold">Agendar horario</h1>
        <p className="text-[#6c5953]">
          Entre com o codigo da profissional para abrir a pagina publica.
        </p>

        <form onSubmit={handleSubmit} className="elevated-card space-y-4 p-5">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#4f403b]">
              Codigo da profissional (UUID)
            </span>
            <input
              type="text"
              value={professionalIdInput}
              onChange={(event) => setProfessionalIdInput(event.target.value)}
              className="input-shell"
              placeholder="Ex: 3f6f...-...."
            />
          </label>

          <button type="submit" className="btn-primary w-full">
            Abrir pagina de agendamento
          </button>
        </form>

        <p className="text-sm text-[#6c5953]">
          Voce e a profissional?{" "}
          <Link href="/professional" className="font-medium text-pink-700 hover:underline">
            Abra o painel
          </Link>{" "}
          para pegar seu link de agendamento.
        </p>
      </section>
    </main>
  );
}
