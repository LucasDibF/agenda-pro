"use client";

import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { supabase } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Limpa o cache SWR do usuário atual para que o próximo login
    // não herde os dados de sessão da usuária anterior.
    await mutate(() => true, undefined, { revalidate: false });
    router.replace("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="btn-soft px-3 py-2 text-xs"
    >
      Sair
    </button>
  );
}
