import { createClient } from "@supabase/supabase-js";

import { configuracao } from "@/lib/configuracao";

export const supabase = createClient(
  configuracao.supabaseUrl || "https://placeholder.supabase.co",
  configuracao.supabaseAnonKey || "placeholder",
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      persistSession: true
    }
  }
);

