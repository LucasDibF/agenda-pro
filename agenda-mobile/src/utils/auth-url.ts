import { makeRedirectUri } from "expo-auth-session";

/** Deep link registrado no Supabase (Authentication → Redirect URLs). */
export function getPasswordResetRedirectUrl(): string {
  return makeRedirectUri({
    scheme: "agenda-mobile",
    path: "auth/callback",
  });
}
