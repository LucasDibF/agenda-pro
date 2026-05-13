"use client";

// ─── Guarda client-side ───────────────────────────────────────────────────────
//
// Segunda camada de proteção (a primeira é o middleware.ts no edge).
// Redireciona para /login se a sessão expirar enquanto o usuário está na página.
// Usa getUser() que valida o token contra o servidor — mais seguro que getSession().

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error || !data.user) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/professional")}`);
        setLoading(false);
        return;
      }

      setUser(data.user);
      setLoading(false);
    };

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (!session) {
        setUser(null);
        router.replace(`/login?next=${encodeURIComponent(pathname || "/professional")}`);
        return;
      }

      setUser(session.user);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-sm text-neutral-600">Carregando area da profissional...</p>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
