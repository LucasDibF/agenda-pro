"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { getPasswordResetRedirectUrl } from "@/lib/utils/auth-url";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage("Informe seu email.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: getPasswordResetRedirectUrl(),
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setInfoMessage(
      "Se existir uma conta com este email, enviamos um link para redefinir a senha. Verifique a caixa de entrada e o spam.",
    );
    setLoading(false);
  };

  return (
    <main className="page-shell">
      <section className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <div className="space-y-2">
          <h1 className="title-display text-3xl font-bold">Esqueci minha senha</h1>
          <p className="text-sm text-[#6E7380]">
            Informe o email da profissional. Enviaremos um link para criar uma nova senha.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="elevated-card space-y-4 p-5">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#6E7380]">Email</span>
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              className="input-shell"
              placeholder="voce@exemplo.com"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
          ) : null}

          {infoMessage ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{infoMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Enviando..." : "Enviar link de recuperacao"}
          </button>
        </form>

        <p className="text-sm text-[#6E7380]">
          Lembrou a senha?{" "}
          <Link href="/login" className="font-medium text-[#8B5CF6] hover:underline">
            Voltar ao login
          </Link>
        </p>
      </section>
    </main>
  );
}
