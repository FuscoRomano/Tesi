"use server";

import { createClient } from "@/lib/supabase/server";

/*
 * Server Actions per la pagina profilo.
 *
 * Anagrafica (nome, cognome, telefono) -> tabella public.profiles, protetta da
 * RLS (l'utente può aggiornare solo la riga con id = auth.uid()).
 * Email e password -> Supabase Auth (auth.users) via supabase.auth.updateUser().
 * Il cambio email richiede conferma via link inviato al nuovo indirizzo.
 */

export type RisultatoAzione = { ok?: true; error?: string; avviso?: string };

/**
 * Aggiorna i dati anagrafici e, se cambiata, l'email dell'utente.
 */
export async function aggiornaProfilo(input: {
  nome: string;
  cognome: string;
  telefono: string;
  email: string;
}): Promise<RisultatoAzione> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessione non valida. Effettua di nuovo l'accesso." };
  }

  // 1. Anagrafica su profiles (stringhe vuote salvate come NULL).
  const { error: erroreProfilo } = await supabase
    .from("profiles")
    .update({
      nome: input.nome.trim() || null,
      cognome: input.cognome.trim() || null,
      telefono: input.telefono.trim() || null,
    })
    .eq("id", user.id);

  if (erroreProfilo) {
    return { error: `Impossibile salvare i dati: ${erroreProfilo.message}` };
  }

  // 2. Email (solo se modificata): innesca l'invio del link di conferma.
  const nuovaEmail = input.email.trim();
  if (nuovaEmail && nuovaEmail !== user.email) {
    const { error: erroreEmail } = await supabase.auth.updateUser({
      email: nuovaEmail,
    });
    if (erroreEmail) {
      return {
        error: `Dati anagrafici salvati, ma email non aggiornata: ${erroreEmail.message}`,
      };
    }
    return {
      ok: true,
      avviso: `Ti abbiamo inviato un link a ${nuovaEmail}: confermalo per completare il cambio email.`,
    };
  }

  return { ok: true };
}

/**
 * Cambia la password dell'utente autenticato.
 */
export async function aggiornaPassword(
  password: string,
): Promise<RisultatoAzione> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessione non valida. Effettua di nuovo l'accesso." };
  }

  if (password.length < 6) {
    return { error: "La password deve essere di almeno 6 caratteri." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: `Impossibile cambiare la password: ${error.message}` };
  }

  return { ok: true };
}
