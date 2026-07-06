/*
 * Core deterministico per la generazione delle simulazioni cliniche.
 *
 * Questo modulo è condiviso da entrambe le "strade" della route /api/extract:
 *  - strada IA: il profilo clinico arriva da Gemini (vedi ./gemini.ts);
 *  - strada fallback: il profilo è dedotto dalle euristiche a keyword qui sotto.
 *
 * In tutti i casi la SERIE temporale dei campioni è costruita qui, in modo
 * deterministico (PRNG seedato) e veloce, anche per durate lunghe (fino a 1440
 * minuti). Così l'output di Gemini resta piccolo e lo schema dei campioni è uno
 * solo, indipendente dalla provenienza del profilo.
 */

import type { Campione, ParametriVitali, SensoreId } from "@/types/simulazione";

/* ------------------------------------------------------------------ */
/* Profilo clinico (contratto tra "interprete" e generatore)           */
/* ------------------------------------------------------------------ */

/** Target di un singolo parametro vitale lungo la finestra temporale. */
export interface ParametroProfilo {
  /** Valore base (media) del parametro. */
  base: number;
  /** Ampiezza dell'oscillazione casuale attorno alla base. */
  variazione: number;
  /** Deriva lineare totale dall'inizio alla fine della finestra (può essere 0). */
  trend: number;
}

/**
 * Profilo clinico strutturato: etichette diagnostiche, sintesi testuale e i
 * target per ciascun parametro vitale. È ciò che Gemini produce (ragionamento
 * clinico) e ciò che le euristiche emulano nel fallback.
 */
export interface ProfiloClinico {
  etichette: string[];
  profiloClinico: string;
  parametri: Partial<Record<keyof ParametriVitali, ParametroProfilo>>;
}

/* ------------------------------------------------------------------ */
/* Costanti fisiologiche                                               */
/* ------------------------------------------------------------------ */

/** Baseline di partenza per ciascun parametro vitale (valori nella norma). */
export const BASELINE: Required<ParametriVitali> = {
  sys: 120,
  dia: 80,
  bpm: 72,
  sat: 98,
  glicemia: 95,
  peso: 75,
};

/** Range plausibili per il clamp finale dei valori generati. */
export const RANGE: Record<keyof ParametriVitali, [number, number]> = {
  sys: [70, 220],
  dia: [40, 130],
  bpm: [35, 190],
  sat: [70, 100],
  glicemia: [40, 400],
  peso: [35, 180],
};

/** Mappa ciascun sensore ai parametri vitali che esso misura. */
export const PARAMETRI_PER_SENSORE: Record<SensoreId, (keyof ParametriVitali)[]> = {
  sfigmomanometro: ["sys", "dia", "bpm"],
  saturimetro: ["sat", "bpm"],
  holter_glicemico: ["glicemia"],
  bilancia: ["peso"],
  cardiofrequenzimetro: ["bpm"],
};

/** Tutti i parametri vitali noti (ordine canonico). */
export const PARAMETRI: (keyof ParametriVitali)[] = [
  "sys",
  "dia",
  "bpm",
  "sat",
  "glicemia",
  "peso",
];

/** Ampiezza di oscillazione "di default" per un parametro (usata nel fallback). */
export function variazioneDefault(parametro: keyof ParametriVitali): number {
  return parametro === "peso" ? 0.6 : parametro === "sat" ? 1.5 : 5;
}

/* ------------------------------------------------------------------ */
/* Utilità deterministiche                                             */
/* ------------------------------------------------------------------ */

/**
 * PRNG deterministico (mulberry32): a parità di seed produce la stessa serie.
 * Garantisce riproducibilità della simulazione senza dipendenze esterne.
 */
export function creaRng(seed: number): () => number {
  let stato = seed >>> 0;
  return () => {
    stato |= 0;
    stato = (stato + 0x6d2b79f5) | 0;
    let t = Math.imul(stato ^ (stato >>> 15), 1 | stato);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Genera un seed numerico stabile a partire da una stringa. */
export function hashStringa(testo: string): number {
  let hash = 2166136261;
  for (let i = 0; i < testo.length; i++) {
    hash ^= testo.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Arrotonda e limita un valore al range fisiologico plausibile. */
export function clamp(parametro: keyof ParametriVitali, valore: number): number {
  const [min, max] = RANGE[parametro];
  return Math.round(Math.min(max, Math.max(min, valore)));
}

/* ------------------------------------------------------------------ */
/* Generazione della serie temporale                                   */
/* ------------------------------------------------------------------ */

/**
 * Costruisce i campioni minuto-per-minuto a partire dal profilo clinico,
 * includendo solo i parametri misurati dai sensori selezionati. Per ogni
 * parametro: valore = base + trend·(avanzamento) + rumore seedato, poi clamp.
 */
export function generaCampioni(
  sensori: SensoreId[],
  durataMinuti: number,
  profilo: ProfiloClinico,
  seed: number,
): Campione[] {
  const rng = creaRng(seed);
  const inizio = Date.now();

  // Insieme dei parametri effettivamente misurati dai sensori selezionati.
  const parametriAttivi = new Set<keyof ParametriVitali>();
  for (const sensore of sensori) {
    for (const p of PARAMETRI_PER_SENSORE[sensore]) parametriAttivi.add(p);
  }

  const campioni: Campione[] = [];
  for (let minuto = 0; minuto < durataMinuti; minuto++) {
    // Avanzamento 0..1 lungo la finestra (per applicare il trend lineare).
    const avanzamento = durataMinuti > 1 ? minuto / (durataMinuti - 1) : 0;
    const parametri: ParametriVitali = {};

    for (const parametro of parametriAttivi) {
      const target = profilo.parametri[parametro] ?? {
        base: BASELINE[parametro],
        variazione: variazioneDefault(parametro),
        trend: 0,
      };
      const rumore = (rng() - 0.5) * 2 * target.variazione;
      const valore = target.base + target.trend * avanzamento + rumore;
      parametri[parametro] = clamp(parametro, valore);
    }

    campioni.push({
      minutoRelativo: minuto,
      timestamp: new Date(inizio + minuto * 60_000).toISOString(),
      parametri,
    });
  }

  return campioni;
}

/* ------------------------------------------------------------------ */
/* Euristiche di fallback (ex finta IA)                                */
/* ------------------------------------------------------------------ */

/** Regole keyword → condizione clinica, con offset rispetto alla baseline. */
const REGOLE: { pattern: RegExp; etichetta: string; offset: Partial<ParametriVitali> }[] = [
  {
    pattern: /ipertensi|pressione alta|iperteso|ipertesa/i,
    etichetta: "ipertensione",
    offset: { sys: 35, dia: 18, bpm: 6 },
  },
  {
    pattern: /ipotensi|pressione bassa|svenimento|sincope/i,
    etichetta: "ipotensione",
    offset: { sys: -30, dia: -18, bpm: 8 },
  },
  {
    pattern: /tachicard|cardiopalmo|palpitazioni/i,
    etichetta: "tachicardia",
    offset: { bpm: 38 },
  },
  {
    pattern: /bradicard/i,
    etichetta: "bradicardia",
    offset: { bpm: -24 },
  },
  {
    pattern: /ipossi|desaturazi|dispnea|insufficienza respiratoria|bpco/i,
    etichetta: "ipossia",
    offset: { sat: -8, bpm: 12 },
  },
  {
    pattern: /iperglicem|glicemia alta|diabet|scompenso glicemico/i,
    etichetta: "iperglicemia",
    offset: { glicemia: 95 },
  },
  {
    pattern: /ipoglicem|glicemia bassa/i,
    etichetta: "ipoglicemia",
    offset: { glicemia: -45, bpm: 10 },
  },
  {
    pattern: /febbre|piressia|stato febbrile|iperpiressia/i,
    etichetta: "febbre",
    offset: { bpm: 16, sat: -2 },
  },
  {
    pattern: /obesit|sovrappeso/i,
    etichetta: "obesità",
    offset: { peso: 28, sys: 10 },
  },
  {
    pattern: /disidratazi/i,
    etichetta: "disidratazione",
    offset: { bpm: 14, sys: -12 },
  },
];

/**
 * Profilo clinico dedotto dal testo tramite euristiche a keyword.
 * Usato come fallback quando Gemini non è disponibile o fallisce: somma gli
 * offset di tutte le condizioni riconosciute e costruisce un ProfiloClinico
 * nel medesimo formato prodotto dall'IA.
 */
export function analizzaSimulazioneEuristico(
  testo: string,
  persona: string,
): ProfiloClinico {
  const corpus = `${testo} ${persona}`;
  const etichette: string[] = [];
  const offset: ParametriVitali = {};

  for (const regola of REGOLE) {
    if (!regola.pattern.test(corpus)) continue;
    etichette.push(regola.etichetta);
    for (const [chiave, valore] of Object.entries(regola.offset) as [
      keyof ParametriVitali,
      number,
    ][]) {
      offset[chiave] = (offset[chiave] ?? 0) + valore;
    }
  }

  // Converte la baseline + offset nel formato ProfiloClinico (trend nullo).
  const parametri: ProfiloClinico["parametri"] = {};
  for (const parametro of PARAMETRI) {
    parametri[parametro] = {
      base: BASELINE[parametro] + (offset[parametro] ?? 0),
      variazione: variazioneDefault(parametro),
      trend: 0,
    };
  }

  return {
    etichette: etichette.length > 0 ? etichette : ["quadro nella norma"],
    profiloClinico:
      etichette.length > 0 ? etichette.join(", ") : "quadro nella norma",
    parametri,
  };
}
