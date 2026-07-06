import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/*
 * Factory function per il client Supabase lato server.
 * Usato in Server Components, Server Actions e Route Handlers.
 *
 * Legge e scrive la sessione tramite cookie HTTP (API next/headers).
 * setAll può fallire nei Server Components read-only: il middleware
 * si occupa del refresh dei token in quel caso.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignorato nei Server Components: il middleware gestisce il refresh.
          }
        },
      },
    }
  );
}
