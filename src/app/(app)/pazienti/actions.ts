"use server";

import { createClient } from "@/lib/supabase/server";
import type { Paziente } from "@/types/database";

/*
 * Server Actions per la gestione dei pazienti del Medico.
 *
 * I pazienti sono entità dati: ogni record appartiene al medico che lo crea
 * (medico_id = auth.uid()). La Row Level Security (pazienti_*_propri) garantisce
 * che un medico veda e modifichi solo i propri pazienti.
 */

/** Riga sintetica di un paziente per le liste. */
export type PazienteRiga = Pick<
  Paziente,
  "id" | "nome" | "cognome" | "data_nascita" | "creato_il"
>;

/**
 * Elenca i pazienti presi in carico dal medico loggato (ordinati per cognome).
 */
export async function elencaMieiPazienti(): Promise<{
  pazienti?: PazienteRiga[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pazienti")
    .select("id, nome, cognome, data_nascita, creato_il")
    .order("cognome", { ascending: true })
    .order("nome", { ascending: true });

  if (error) return { error: error.message };
  return { pazienti: data ?? [] };
}

/**
 * Aggiunge un nuovo paziente associato al medico loggato.
 */
export async function aggiungiPaziente(input: {
  nome: string;
  cognome: string;
  dataNascita: string;
}): Promise<{ paziente?: PazienteRiga; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessione non valida. Effettua di nuovo l'accesso." };
  }

  const nome = input.nome.trim();
  const cognome = input.cognome.trim();
  if (!nome || !cognome) {
    return { error: "Nome e cognome sono obbligatori." };
  }

  const { data, error } = await supabase
    .from("pazienti")
    .insert({
      medico_id: user.id,
      nome,
      cognome,
      // Input date vuoto -> NULL.
      data_nascita: input.dataNascita || null,
    })
    .select("id, nome, cognome, data_nascita, creato_il")
    .single();

  if (error) return { error: error.message };
  return { paziente: data };
}

/**
 * Elimina un paziente del medico loggato.
 * La RLS impedisce comunque di eliminare pazienti altrui.
 */
export async function eliminaPaziente(
  id: string,
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from("pazienti").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
