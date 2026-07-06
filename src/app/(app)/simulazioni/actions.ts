"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  PazienteOpzione,
  SimulazioneEstratto,
  SimulazioneSalvato,
} from "@/types/simulazione";
import type { Json } from "@/types/database";

/*
 * Server Actions per la persistenza delle simulazioni cliniche su Supabase.
 *
 * Girano lato server con la sessione dell'utente (cookie): la Row Level
 * Security del database applica automaticamente le regole Medico/Paziente
 * definite nella migration supabase/migrations/20260622120000_simulazioni_persistenza.sql.
 *
 * NB: richiedono che la migration sia stata applicata sul progetto Supabase
 * corretto (vedi supabase/migrations/README.md).
 */

/**
 * Salva una simulazione generata: inserisce l'header in `simulazioni` e la serie
 * temporale in `campioni`. Restituisce l'id del nuova simulazione o un errore.
 * In caso di fallimento sui campioni rimuove l'header per non lasciare
 * simulazioni orfani.
 */
export async function salvaSimulazione(
  simulazione: SimulazioneEstratto,
  pazienteId: string | null,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sessione non valida. Effettua di nuovo l'accesso." };
  }

  // Inserimento dell'header della simulazione (payload JSON completo in `dati`).
  // L'autore è l'utente autenticato (Medico): la RLS simulazioni_insert_propri
  // verifica che creato_da = auth.uid().
  const { data: inserito, error: erroreSimulazione } = await supabase
    .from("simulazioni")
    .insert({
      creato_da: user.id,
      paziente_id: pazienteId,
      descrizione: simulazione.simulazione.descrizione,
      profilo_clinico: simulazione.persona.profiloClinico,
      durata_minuti: simulazione.simulazione.durataMinuti,
      sensori: simulazione.sensori,
      dati: simulazione as unknown as Json,
    })
    .select("id")
    .single();

  if (erroreSimulazione || !inserito) {
    return {
      error:
        erroreSimulazione?.message ?? "Errore nel salvataggio della simulazione.",
    };
  }

  const simulazioneId = inserito.id as string;

  // Inserimento in blocco dei campioni (proiezione normalizzata).
  const righe = simulazione.campioni.map((c) => ({
    simulazione_id: simulazioneId,
    minuto: c.minutoRelativo,
    rilevato_il: c.timestamp,
    sys: c.parametri.sys ?? null,
    dia: c.parametri.dia ?? null,
    bpm: c.parametri.bpm ?? null,
    sat: c.parametri.sat ?? null,
    glicemia: c.parametri.glicemia ?? null,
    peso: c.parametri.peso ?? null,
  }));

  const { error: erroreCampioni } = await supabase
    .from("campioni")
    .insert(righe);

  if (erroreCampioni) {
    // Rollback "best effort": elimina l'header per evitare simulazioni senza campioni.
    await supabase.from("simulazioni").delete().eq("id", simulazioneId);
    return { error: erroreCampioni.message };
  }

  return { id: simulazioneId };
}

/**
 * Elenca gli simulazioni salvate dell'utente corrente.
 * La RLS (simulazioni_select_propri) filtra automaticamente per creato_da = auth.uid().
 */
export async function elencaSimulazioniSalvati(): Promise<{
  simulazioni?: SimulazioneSalvato[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("simulazioni")
    .select("id, descrizione, profilo_clinico, durata_minuti, sensori, creato_il")
    .order("creato_il", { ascending: false })
    .limit(20);

  if (error) return { error: error.message };
  return { simulazioni: (data ?? []) as SimulazioneSalvato[] };
}

/**
 * Elenca i pazienti del medico loggato, selezionabili per associare una simulazione.
 * Legge dalla tabella `pazienti`: la RLS (pazienti_select_propri) restituisce
 * solo i soggetti presi in carico dal medico (medico_id = auth.uid()).
 */
export async function elencaPazienti(): Promise<{
  pazienti?: PazienteOpzione[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pazienti")
    .select("id, nome, cognome")
    .order("cognome", { ascending: true })
    .order("nome", { ascending: true });

  if (error) return { error: error.message };

  // Etichetta leggibile "Nome Cognome" per il selettore.
  const pazienti: PazienteOpzione[] = (data ?? []).map((p) => ({
    id: p.id,
    nome: `${p.nome} ${p.cognome}`,
  }));
  return { pazienti };
}
