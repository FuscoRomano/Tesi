import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/*
 * Factory function per il client Supabase lato browser (Client Components).
 *
 * Usa @supabase/ssr/createBrowserClient che gestisce automaticamente la
 * persistenza della sessione tramite cookie, coordinandosi con il middleware.
 *
 * Si crea una nuova istanza ad ogni chiamata (non singleton) affinché vengano
 * sempre letti i cookie aggiornati.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
