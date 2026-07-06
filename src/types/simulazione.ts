/*
 * Tipi condivisi per gli simulazioni cliniche dell'Information Extraction.
 * Usati dalla pagina /simulazioni, dalle Server Actions di persistenza e come
 * contratto con le route /api/extract e /api/convert.
 */

/** Identificativi dei sensori simulabili (coerenti con i dispositivi del progetto). */
export type SensoreId =
  | "sfigmomanometro"
  | "saturimetro"
  | "holter_glicemico"
  | "bilancia"
  | "cardiofrequenzimetro";

/** Parametri vitali di un singolo istante di campionamento. */
export interface ParametriVitali {
  sys?: number; // Pressione sistolica (mmHg)
  dia?: number; // Pressione diastolica (mmHg)
  bpm?: number; // Frequenza cardiaca (battiti/min)
  sat?: number; // Saturazione ossigeno (%)
  glicemia?: number; // Glicemia (mg/dL)
  peso?: number; // Peso corporeo (kg)
}

/** Singolo campione della serie temporale generata. */
export interface Campione {
  minutoRelativo: number;
  timestamp: string;
  parametri: ParametriVitali;
}

/**
 * Modalità di generazione della simulazione:
 * - "ia": profilo clinico estratto da Google Gemini;
 * - "simulato": fallback alle euristiche locali (Gemini assente o in errore).
 */
export type ModalitaGenerazione = "ia" | "simulato";

/** Struttura JSON gerarchica restituita da /api/extract. */
export interface SimulazioneEstratto {
  simulazione: {
    id: string;
    descrizione: string;
    generatoIl: string;
    durataMinuti: number;
  };
  persona: {
    descrizione: string;
    profiloClinico: string;
  };
  sensori: SensoreId[];
  campioni: Campione[];
  /** Indica se i dati provengono dall'IA o dal fallback simulato. */
  modalita?: ModalitaGenerazione;
}

/** Riga sintetica di una simulazione persistito (per le liste). */
export interface SimulazioneSalvato {
  id: string;
  descrizione: string;
  profilo_clinico: string | null;
  durata_minuti: number;
  sensori: string[];
  creato_il: string;
}

/** Paziente selezionabile per l'associazione di una simulazione. */
export interface PazienteOpzione {
  id: string;
  nome: string | null;
}
