// ─── Middleware de autenticação (Edge) ───────────────────────────────────────
//
// Protege todas as rotas sob /professional/** no nível do edge, antes que
// qualquer React Server Component seja renderizado.
// Rotas públicas (/login, /register, /booking/**, /api/**) passam sem verificação.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // supabaseResponse é reconstruído sempre que o middleware atualiza cookies,
  // garantindo que o token seja propagado corretamente para o próximo request.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() valida o token contra o servidor Supabase — mais seguro que getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  // Aplica o middleware somente nas rotas do painel da profissional
  matcher: ["/professional/:path*"],
};
