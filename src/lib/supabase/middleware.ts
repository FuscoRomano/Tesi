import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
 * Aggiorna la sessione Supabase nel middleware.
 *
 * Deve essere chiamata su ogni request per rinnovare i token prima che scadano.
 * Restituisce { supabaseResponse, user }:
 * - supabaseResponse: la NextResponse con i cookie di sessione aggiornati (da ritornare sempre)
 * - user: l'utente autenticato, o null se non loggato
 *
 * ATTENZIONE: non inserire logica tra createServerClient e getUser().
 * getUser() valida il token con una chiamata al server Supabase: è l'unico
 * modo affidabile per verificare l'autenticazione nel middleware.
 */
export async function updateSession(request: NextRequest) {
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
          // Aggiorna i cookie sia sulla request (per lettura nello stesso ciclo)
          // che sulla response (per l'invio al browser).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
