"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone,
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorMessage("Nao foi possivel criar o usuario.");
      setLoading(false);
      return;
    }

    if (data.session) {
      setLoading(false);
      router.replace("/professional");
      return;
    }

    setLoading(false);
    router.replace("/login?notice=check-email");
  };

  return (
    <main className="page-shell">
      <section className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <div className="space-y-2">
          <h1 className="title-display text-3xl font-bold">Criar conta da profissional</h1>
          <p className="text-sm text-[#6c5953]">
            Primeiro acesso do painel administrativo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="elevated-card space-y-4 p-5">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#4f403b]">Nome completo</span>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className="input-shell"
              placeholder="Seu nome"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#4f403b]">Telefone</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
              className="input-shell"
              placeholder="(11) 99999-9999"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#4f403b]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="input-shell"
              placeholder="voce@exemplo.com"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#4f403b]">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="input-shell"
              placeholder="Minimo 6 caracteres"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="text-sm text-[#6c5953]">
          Ja tem conta?{" "}
          <Link href="/login" className="font-medium text-pink-700 hover:underline">
            Fazer login
          </Link>
        </p>
      </section>
    </main>
  );
}
