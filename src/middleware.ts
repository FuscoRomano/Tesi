import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/*
 * Middleware principale dell'applicazione.
 *
 * 1. Aggiorna la sessione Supabase su ogni request (refresh token)
 * 2. Rotte protette (/dashboard, /pazienti, /simulazioni):
 *    redirect a /auth/login per utenti non autenticati
 * 3. Rotte auth (/auth/*):
 *    redirect a /dashboard per utenti già autenticati
 *
 * CRITICO: ritornare sempre supabaseResponse (non NextResponse.next() grezzo)
 * affinché i cookie di sessione aggiornati vengano propagati al browser.
 */
export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Rotte che richiedono autenticazione
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/pazienti") ||
    pathname.startsWith("/simulazioni") ||
    pathname.startsWith("/profilo");

  // Rotte accessibili solo agli utenti non autenticati
  const isAuthRoute = pathname.startsWith("/auth");

  // Eccezioni: rotte /auth che DEVONO restare accessibili anche da autenticato.
  // - /auth/aggiorna-password: il reset password crea una sessione di "recovery",
  //   quindi l'utente risulta autenticato ma deve comunque poter impostare la
  //   nuova password. Senza questa eccezione verrebbe rimandato alla dashboard.
  // - /auth/callback: route handler che esegue lo scambio del code di sessione.
  const isAuthException =
    pathname.startsWith("/auth/aggiorna-password") ||
    pathname.startsWith("/auth/callback");

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user && !isAuthException) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("redirectTo");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

/*
 * Matcher: il middleware gira su tutte le rotte eccetto asset statici.
 * Esclusi: _next/static, _next/image, favicon.ico, file con estensione.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
