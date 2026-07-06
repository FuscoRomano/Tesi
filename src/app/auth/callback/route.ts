import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
 * Route Handler per il callback OAuth/Email di Supabase (PKCE flow).
 *
 * Flussi gestiti:
 * - Conferma email post-registrazione → /dashboard
 * - Magic link login → /dashboard
 * - Reset password (type=recovery) → /auth/aggiorna-password
 *
 * Supabase reindirizza qui con un parametro ?code= che viene scambiato
 * con una sessione server-side e persistito nei cookie.
 *
 * IMPORTANTE: questa cartella contiene SOLO route.ts, mai page.tsx.
 * Avere entrambi nella stessa cartella causa un crash di routing in Next.js.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/auth/aggiorna-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/auth/login?error=Collegamento+non+valido+o+scaduto`
  );
}
