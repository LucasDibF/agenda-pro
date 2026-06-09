import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";

function readQueryParam(
  params: Linking.QueryParams | null | undefined,
  key: string,
): string | null {
  const value = params?.[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

async function setSessionFromHash(url: string): Promise<boolean> {
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return false;

  const hash = url.slice(hashIndex + 1);
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const type = params.get("type");

  if (type !== "recovery" || !accessToken || !refreshToken) return false;

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return !error;
}

/** Processa link do email (PKCE ou hash) e devolve se entrou em fluxo de recuperacao. */
export async function handleAuthDeepLink(url: string): Promise<boolean> {
  const parsed = Linking.parse(url);
  const code = readQueryParam(parsed.queryParams, "code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }

  if (url.includes("type=recovery")) {
    return setSessionFromHash(url);
  }

  return false;
}
