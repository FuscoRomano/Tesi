/*
 * Tipi condivisi per la vista clinica (Dashboard Medico).
 * Modellano il "Digital Twin" del paziente: punteggi WHOQOL, fattori grezzi
 * per il calcolo del Priority Score, serie temporali (sonno/attività) e il
 * log degli interventi di fallback del robot assistivo "Amica".
 */

/** Livello dell'indicatore visivo a semaforo. */
export type SemaforoLevel = "verde" | "giallo" | "rosso";

/**
 * Punteggi nei 4 domini WHOQOL (scala 0–100).
 * Più alto = migliore qualità di vita percepita nel dominio.
 */
export interface WhoqolScores {
  fisico: number; // Salute Fisica
  psicologico: number; // Stato Psicologico
  relazioni: number; // Relazioni Sociali
  ambiente: number; // Ambiente
}

/** Singolo punto della serie "ore di sonno" (per il Bar Chart). */
export interface SleepPoint {
  giorno: string; // Etichetta giorno (es. "Lun")
  ore: number; // Ore di sonno registrate
}

/** Fetta del Donut Chart sull'intensità dell'attività motoria. */
export interface ActivitySlice {
  nome: string; // Es. "Intensa", "Moderata", "Leggera", "Sedentario"
  valore: number; // Minuti (o percentuale) nella fascia
  colore: string; // Colore HEX della fetta
}

/** Stato di una domanda/intervento di fallback del robot Amica. */
export type ActiveQuestionStatus = "in_attesa" | "in_corso" | "risolta";

/**
 * Voce del log "Active questions": intervento di fallback generato dal
 * robot assistivo quando il dialogo mattutino richiede attenzione clinica.
 */
export interface ActiveQuestion {
  id: string;
  paziente: string; // Nome del paziente coinvolto
  dominio: keyof WhoqolScores; // Dominio WHOQOL di riferimento
  domanda: string; // Testo dell'intervento/domanda
  stato: ActiveQuestionStatus;
  timestamp: string; // Orario formattato (es. "08:14")
}

/**
 * Rappresentazione completa di un paziente nel Digital Twin.
 * I 4 fattori grezzi (scala 0–10) alimentano il Priority Score; il valore
 * più alto indica una situazione più critica nel rispettivo asse.
 */
export interface Patient {
  id: string;
  nome: string;
  eta: number;

  /** Punteggi nei 4 domini WHOQOL (0–100). */
  whoqol: WhoqolScores;

  /* --- Fattori grezzi del Priority Score (0–10) --- */
  statoFisico: number; // Gravità clinica fisica (da sensori/dispositivi)
  statoPsichico: number; // Disagio psicologico rilevato
  trendPeggioramento: number; // Velocità di peggioramento nel tempo
  urgenzaDialogoAmica: number; // Urgenza emersa dal dialogo mattutino Amica

  /* --- Serie e log per la Vista Dettaglio --- */
  sonno: SleepPoint[];
  attivita: ActivitySlice[];
  domandeAttive: ActiveQuestion[];
}
