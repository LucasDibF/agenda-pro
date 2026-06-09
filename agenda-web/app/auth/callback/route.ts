import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sanitizeInternalPath } from "@/lib/utils/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = sanitizeInternalPath(searchParams.get("next"), "/professional");

  if (!code) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("notice", "auth-callback-error");
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("notice", "auth-callback-error");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(nextPath, origin));
}
