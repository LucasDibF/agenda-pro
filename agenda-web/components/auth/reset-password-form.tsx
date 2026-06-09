"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/utils/password";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const verifyRecoverySession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error || !data.session) {
        setCanReset(false);
        setCheckingSession(false);
        return;
      }

      setCanReset(true);
      setCheckingSession(false);
    };

    void verifyRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setCanReset(true);
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("As senhas nao coincidem.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?notice=password-reset");
  };

  if (checkingSession) {
    return (
      <main className="page-shell flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[#6E7380]">Validando link de recuperacao...</p>
      </main>
    );
  }

  if (!canReset) {
    return (
      <main className="page-shell">
        <section className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16 text-center">
          <h1 className="title-display text-2xl font-bold">Link invalido ou expirado</h1>
          <p className="text-sm text-[#6E7380]">
            Solicite um novo link de recuperacao de senha.
          </p>
          <Link href="/forgot-password" className="btn-primary mx-auto px-5 py-2.5 text-sm">
            Solicitar novo link
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <div className="space-y-2">
          <h1 className="title-display text-3xl font-bold">Nova senha</h1>
          <p className="text-sm text-[#6E7380]">
            Escolha uma senha forte para acessar o painel da profissional.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="elevated-card space-y-4 p-5">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#6E7380]">Nova senha</span>
            <input
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="input-shell"
              placeholder="Minimo 8 caracteres"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#6E7380]">Confirmar nova senha</span>
            <input
              type="password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              className="input-shell"
              placeholder="Repita a senha"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </section>
    </main>
  );
}
