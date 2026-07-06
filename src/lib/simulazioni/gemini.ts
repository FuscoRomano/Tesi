/*
 * Livello di integrazione con Google Gemini per l'Information Extraction.
 *
 * Gemini fa SOLO il ragionamento clinico: legge la simulazione in linguaggio
 * naturale e restituisce un profilo clinico strutturato (etichette + target
 * per parametro). La serie temporale dei campioni è poi costruita dal
 * generatore deterministico in ./generatore.ts.
 *
 * Usa structured output (responseMimeType JSON + responseSchema) per garantire
 * un payload conforme. In caso di errore (assenza key, rete, quota, parsing)
 * la funzione LANCIA: la route /api/extract intercetta e ripiega sulle
 * euristiche locali.
 */

import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { ParametriVitali, SensoreId } from "@/types/simulazione";
import {
  BASELINE,
  PARAMETRI_PER_SENSORE,
  clamp,
  variazioneDefault,
  type ProfiloClinico,
} from "./generatore";

const MODELLO_DEFAULT = "gemini-2.5-flash";

/** Vero se è configurata una API key Gemini (strada IA disponibile). */
export function geminiDisponibile(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Schema di un singolo parametro vitale richiesto a Gemini. */
const schemaParametro = {
  type: Type.OBJECT,
  properties: {
    base: { type: Type.NUMBER, description: "Valore medio del parametro." },
    variazione: {
      type: Type.NUMBER,
      description: "Ampiezza dell'oscillazione casuale attorno al valore medio.",
    },
    trend: {
      type: Type.NUMBER,
      description:
        "Deriva totale dall'inizio alla fine della finestra (0 se stabile, positivo se peggiora in salita, negativo in discesa).",
    },
  },
  required: ["base", "variazione", "trend"],
};

/** Schema completo della risposta strutturata attesa da Gemini. */
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    etichette: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Condizioni cliniche riconosciute (in italiano, minuscolo).",
    },
    profiloClinico: {
      type: Type.STRING,
      description: "Sintesi clinica breve del quadro descritto.",
    },
    parametri: {
      type: Type.OBJECT,
      description:
        "Target per i soli parametri pertinenti ai sensori selezionati.",
      properties: {
        sys: schemaParametro,
        dia: schemaParametro,
        bpm: schemaParametro,
        sat: schemaParametro,
        glicemia: schemaParametro,
        peso: schemaParametro,
      },
    },
  },
  required: ["etichette", "profiloClinico", "parametri"],
};

const SYSTEM_INSTRUCTION = `Sei un simulatore clinico per un Digital Twin sanitario.
Dato una simulazione clinica in linguaggio naturale, la descrizione della persona e l'elenco dei sensori selezionati, deduci un profilo clinico realistico.
Per OGNI parametro misurato dai sensori indicati fornisci: "base" (valore medio fisiologicamente plausibile e coerente con la simulazione), "variazione" (ampiezza di oscillazione realistica, piccola) e "trend" (deriva totale sulla finestra: 0 se stabile, segno coerente con un eventuale peggioramento/miglioramento descritto).
Includi in "parametri" SOLO i parametri pertinenti ai sensori selezionati; ometti gli altri.
Rispetta i range fisiologici: sys 70-220, dia 40-130, bpm 35-190, sat 70-100, glicemia 40-400 mg/dL, peso 35-180 kg.
Le "etichette" sono le condizioni cliniche riconosciute, in italiano e minuscolo (es. "ipertensione", "ipossia"). Rispondi esclusivamente con il JSON richiesto.`;

/** Costruisce il prompt utente con i dati del form. */
function costruisciPrompt(
  simulazione: string,
  persona: string,
  sensori: SensoreId[],
  durataMinuti: number,
): string {
  const parametriRichiesti = Array.from(
    new Set(sensori.flatMap((s) => PARAMETRI_PER_SENSORE[s])),
  );
  return [
    `Simulazione clinica: ${simulazione}`,
    `Persona: ${persona || "non specificata"}`,
    `Sensori selezionati: ${sensori.join(", ")}`,
    `Parametri da fornire (solo questi): ${parametriRichiesti.join(", ")}`,
    `Durata del monitoraggio: ${durataMinuti} minuti.`,
  ].join("\n");
}

/** Forma grezza di un parametro così come può arrivare da Gemini. */
interface ParametroGrezzo {
  base?: unknown;
  variazione?: unknown;
  trend?: unknown;
}

/** Converte un numero "incerto" in number finito, con default. */
function numero(valore: unknown, predefinito: number): number {
  const n = Number(valore);
  return Number.isFinite(n) ? n : predefinito;
}

/*
 * Codici per cui un nuovo tentativo a breve ha senso: solo errori di
 * sovraccarico momentaneo lato server (es. 503 "high demand"), che si
 * risolvono in pochi secondi.
 * NB: il 429 (RESOURCE_EXHAUSTED) NON è incluso di proposito: sul free tier la
 * quota per-minuto si resetta dopo ~50s, quindi ritentare subito è inutile e
 * bloccherebbe la richiesta — meglio fallback immediato alle euristiche.
 */
const STATUS_RIPROVABILI = new Set([500, 502, 503, 504]);

/**
 * Vero se l'errore è un sovraccarico transitorio del modello e quindi un nuovo
 * tentativo a breve ha buone probabilità di riuscire.
 */
function erroreTransitorio(err: unknown): boolean {
  const e = err as { status?: number | string; code?: number; message?: string };
  if (typeof e?.status === "number" && STATUS_RIPROVABILI.has(e.status)) return true;
  if (typeof e?.code === "number" && STATUS_RIPROVABILI.has(e.code)) return true;
  const msg = String(e?.message ?? "");
  return /"code":\s*(500|502|503|504)|UNAVAILABLE|INTERNAL|overload|high demand/i.test(
    msg,
  );
}

/** Attesa in millisecondi. */
function attendi(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Esegue `fn` riprovando sugli errori transitori con backoff esponenziale e
 * jitter. Gli errori non transitori (es. key non valida) vengono rilanciati
 * subito. Dopo l'ultimo tentativo l'errore propaga (la route fa fallback).
 */
async function conRetry<T>(fn: () => Promise<T>, tentativi = 4): Promise<T> {
  let ultimo: unknown;
  for (let i = 0; i < tentativi; i++) {
    try {
      return await fn();
    } catch (err) {
      ultimo = err;
      if (i === tentativi - 1 || !erroreTransitorio(err)) throw err;
      // Backoff: 0.4s, 0.8s, 1.6s (+ jitter casuale fino a 300ms).
      await attendi(400 * 2 ** i + Math.random() * 300);
    }
  }
  throw ultimo;
}

/**
 * Interpreta la simulazione con Gemini e restituisce un ProfiloClinico validato.
 * Mantiene solo i parametri pertinenti ai sensori scelti, applica i default
 * mancanti e fa il clamp del valore base nel range fisiologico.
 * Riprova automaticamente sugli errori transitori (es. 503 "high demand").
 * @throws se la key manca, la chiamata fallisce o il JSON non è valido.
 */
export async function estraiProfiloConGemini(
  simulazione: string,
  persona: string,
  sensori: SensoreId[],
  durataMinuti: number,
): Promise<ProfiloClinico> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY non configurata.");

  const ai = new GoogleGenAI({ apiKey });

  const risposta = await conRetry(() =>
    ai.models.generateContent({
      model: process.env.GEMINI_MODEL || MODELLO_DEFAULT,
      contents: costruisciPrompt(simulazione, persona, sensori, durataMinuti),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.4,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      },
    }),
  );

  const testo = risposta.text;
  if (!testo) throw new Error("Risposta Gemini vuota.");

  const grezzo = JSON.parse(testo) as {
    etichette?: unknown;
    profiloClinico?: unknown;
    parametri?: Record<string, ParametroGrezzo>;
  };

  // Parametri effettivamente misurati dai sensori selezionati.
  const parametriAttivi = new Set<keyof ParametriVitali>(
    sensori.flatMap((s) => PARAMETRI_PER_SENSORE[s]),
  );

  const parametri: ProfiloClinico["parametri"] = {};
  for (const parametro of parametriAttivi) {
    const grezzoP = grezzo.parametri?.[parametro];
    const base = clamp(
      parametro,
      numero(grezzoP?.base, BASELINE[parametro]),
    );
    parametri[parametro] = {
      base,
      variazione: Math.abs(
        numero(grezzoP?.variazione, variazioneDefault(parametro)),
      ),
      trend: numero(grezzoP?.trend, 0),
    };
  }

  const etichette = Array.isArray(grezzo.etichette)
    ? grezzo.etichette.map(String).filter(Boolean)
    : [];
  const profiloClinico =
    typeof grezzo.profiloClinico === "string" && grezzo.profiloClinico.trim()
      ? grezzo.profiloClinico.trim()
      : etichette.join(", ") || "quadro nella norma";

  // Se per qualche motivo non c'è alcun parametro valido, meglio fallire e
  // lasciar partire il fallback euristico.
  if (Object.keys(parametri).length === 0) {
    throw new Error("Nessun parametro valido nel profilo Gemini.");
  }

  return {
    etichette: etichette.length > 0 ? etichette : ["quadro nella norma"],
    profiloClinico,
    parametri,
  };
}
