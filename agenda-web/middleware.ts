// ─── Middleware de autenticação (Edge) ───────────────────────────────────────
//
// Protege todas as rotas sob /professional/** no nível do edge, antes que
// qualquer React Server Component seja renderizado.
// Rotas públicas (/login, /register, /booking/**, /api/**) passam sem verificação.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Validação eager das envs — evita crash silencioso por non-null assertion
// em produção e produz mensagem de erro clara no build/edge.
const SUPABASE_URL: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "middleware: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY sao obrigatorias.",
  );
}

export async function middleware(request: NextRequest) {
  // supabaseResponse é reconstruído sempre que o middleware atualiza cookies,
  // garantindo que o token seja propagado corretamente para o próximo request.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() valida o token contra o servidor Supabase — mais seguro que getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);

    // IMPORTANTE: preservar cookies que o Supabase possa ter atualizado (ex.:
    // limpeza de refresh token expirado). Sem isso, o browser fica com estado
    // inconsistente e o próximo request pode ficar em loop de redirect.
    // Copiar o objeto de cookie inteiro para não perder HttpOnly/Secure/
    // SameSite/Path/expires ao propagar para a resposta de redirect.
    const redirectResponse = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  // Aplica o middleware somente nas rotas do painel da profissional
  matcher: ["/professional/:path*"],
};
