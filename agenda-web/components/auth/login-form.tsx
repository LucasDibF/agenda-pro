"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type LoginFormProps = {
  nextPath: string;
  notice?: string;
};

export function LoginForm({ nextPath, notice }: LoginFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");
    setNeedsEmailConfirmation(false);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const isEmailNotConfirmed =
        error.message.toLowerCase().includes("email not confirmed") ||
        error.message.toLowerCase().includes("email_not_confirmed");

      if (isEmailNotConfirmed) {
        setErrorMessage(
          "Seu email ainda nao foi confirmado. Abra sua caixa de entrada e confirme o cadastro."
        );
        setNeedsEmailConfirmation(true);
      } else {
        setErrorMessage(error.message);
      }
      setLoading(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setErrorMessage("Digite seu email para reenviar a confirmacao.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setInfoMessage("");

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setInfoMessage("Email de confirmacao reenviado. Verifique sua caixa de entrada.");
    setLoading(false);
  };

  return (
    <main className="page-shell">
      <section className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <div className="space-y-2">
          <h1 className="title-display text-3xl font-bold">Entrar no painel</h1>
          <p className="text-sm text-[#6E7380]">
            Use seu email e senha da profissional para acessar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="elevated-card space-y-4 p-5">
          {notice === "check-email" ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Conta criada. Confirme seu email para liberar o login por senha.
            </p>
          ) : null}

          {notice === "password-reset" ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Senha atualizada com sucesso. Faca login com a nova senha.
            </p>
          ) : null}

          {notice === "auth-callback-error" ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Link invalido ou expirado. Solicite um novo link de recuperacao.
            </p>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#6E7380]">Email</span>
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
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#6E7380]">Senha</span>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#8B5CF6] hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="input-shell"
              placeholder="********"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {infoMessage ? (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {infoMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {needsEmailConfirmation ? (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={loading}
              className="btn-soft w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              Reenviar email de confirmacao
            </button>
          ) : null}
        </form>

        <p className="text-sm text-[#6E7380]">
          Ainda nao tem conta?{" "}
          <Link href="/register" className="font-medium text-[#8B5CF6] hover:underline">
            Criar acesso da profissional
          </Link>
        </p>
      </section>
    </main>
  );
}
