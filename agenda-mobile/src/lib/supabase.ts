// ─── Cliente Supabase para o app mobile ──────────────────────────────────────
//
// persistSession: true + AsyncStorage garante que a sessão sobrevive ao app
// ser fechado e reaberto — sem isso o usuário precisaria logar toda vez.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Detalhes técnicos só no console; a profissional não deve ver nomes de variáveis.
  console.error(
    "[Supabase] Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY (build / EAS)."
  );
  throw new Error("Não foi possível iniciar o aplicativo. Tente atualizar ou reinstalar.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    storage: AsyncStorage,
  },
});
