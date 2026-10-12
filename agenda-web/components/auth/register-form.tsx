"use client";

// ─── Formulário de cadastro da profissional ───────────────────────────────────

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthMotion } from "@/components/motion/auth-motion";
import { MotionAlert } from "@/components/motion/primitives";
import { BrandMark } from "@/components/brand/brand-mark";
import { supabase } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/utils/password";

export function RegisterForm() {
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

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      setLoading(false);
      return;
    }

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
        <AuthMotion
          header={
            <>
              <BrandMark size="sm" />
              <h1 className="title-display text-3xl">Criar conta da profissional</h1>
              <p className="text-sm text-body-secondary">
                Primeiro acesso do painel administrativo.
              </p>
            </>
          }
          card={
            <form onSubmit={handleSubmit} className="elevated-card space-y-4 p-5">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-body-secondary">Nome completo</span>
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
            <span className="text-sm font-medium text-body-secondary">Telefone</span>
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
            <span className="text-sm font-medium text-body-secondary">Email</span>
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
            <span className="text-sm font-medium text-body-secondary">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="input-shell"
              placeholder="Minimo 8 caracteres, maiuscula, minuscula e numero"
            />
          </label>

          {errorMessage ? (
            <MotionAlert className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </MotionAlert>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
            </form>
          }
          footer={
            <p className="text-sm text-body-secondary">
              Ja tem conta?{" "}
              <Link href="/login" className="text-link-accent font-medium">
                Fazer login
              </Link>
            </p>
          }
        />
      </section>
    </main>
  );
}
