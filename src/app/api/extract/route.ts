import { NextResponse, type NextRequest } from "next/server";
import type {
  ModalitaGenerazione,
  SimulazioneEstratto,
  SensoreId,
} from "@/types/simulazione";
import {
  analizzaSimulazioneEuristico,
  generaCampioni,
  hashStringa,
  type ProfiloClinico,
} from "@/lib/simulazioni/generatore";
import { estraiProfiloConGemini, geminiDisponibile } from "@/lib/simulazioni/gemini";

/*
 * Route API: Information Extraction.
 *
 * Riceve una simulazione clinica in linguaggio naturale insieme ai metadati del
 * form (persona, sensori da simulare, durata) e ne estrae un profilo clinico
 * strutturato. Il ragionamento clinico è affidato a Google Gemini (vedi
 * src/lib/simulazioni/gemini.ts); la serie temporale dei campioni è poi costruita
 * in modo deterministico (src/lib/simulazioni/generatore.ts).
 *
 * FALLBACK: se Gemini non è configurato (GEMINI_API_KEY assente) o la chiamata
 * fallisce, si ripiega sulle euristiche locali a keyword, marcando la risposta
 * come modalita="simulato". Lo schema di output (SimulazioneEstratto) è invariato.
 */

// Runtime Node.js: la chiamata di rete a Gemini gira lato server.
export const runtime = "nodejs";
// Margine per la latenza dell'LLM (in secondi).
export const maxDuration = 30;

/** Corpo della richiesta inviato dalla UI. */
interface ExtractRequest {
  simulazione: string;
  persona: string;
  sensori: SensoreId[];
  durataMinuti: number;
}

const SENSORI_VALIDI: SensoreId[] = [
  "sfigmomanometro",
  "saturimetro",
  "holter_glicemico",
  "bilancia",
  "cardiofrequenzimetro",
];

const DURATA_MAX = 1440; // 24 ore: tetto di sicurezza sulla dimensione del dataset.

export async function POST(request: NextRequest) {
  let body: Partial<ExtractRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo della richiesta non valido (JSON atteso)." },
      { status: 400 },
    );
  }

  const simulazione = typeof body.simulazione === "string" ? body.simulazione.trim() : "";
  const persona = typeof body.persona === "string" ? body.persona.trim() : "";
  const durataMinuti = Number(body.durataMinuti);
  const sensori = Array.isArray(body.sensori)
    ? body.sensori.filter((s): s is SensoreId =>
        SENSORI_VALIDI.includes(s as SensoreId),
      )
    : [];

  /* --- Validazione degli input --- */
  if (simulazione.length < 3) {
    return NextResponse.json(
      { error: "Descrivi la simulazione clinica (almeno 3 caratteri)." },
      { status: 400 },
    );
  }
  if (sensori.length === 0) {
    return NextResponse.json(
      { error: "Seleziona almeno un sensore da simulare." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(durataMinuti) || durataMinuti < 1 || durataMinuti > DURATA_MAX) {
    return NextResponse.json(
      { error: `La durata deve essere compresa tra 1 e ${DURATA_MAX} minuti.` },
      { status: 400 },
    );
  }

  const durata = Math.floor(durataMinuti);
  // Seed stabile: la parte numerica (rumore) resta riproducibile a parità di input.
  const seed = hashStringa(`${simulazione}|${persona}|${sensori.join(",")}|${durata}`);

  /* --- Estrazione del profilo clinico: Gemini con fallback euristico --- */
  let profilo: ProfiloClinico;
  let modalita: ModalitaGenerazione;

  if (geminiDisponibile()) {
    try {
      profilo = await estraiProfiloConGemini(simulazione, persona, sensori, durata);
      modalita = "ia";
    } catch (err) {
      console.error("Gemini non disponibile, fallback alle euristiche:", err);
      profilo = analizzaSimulazioneEuristico(simulazione, persona);
      modalita = "simulato";
    }
  } else {
    profilo = analizzaSimulazioneEuristico(simulazione, persona);
    modalita = "simulato";
  }

  const campioni = generaCampioni(sensori, durata, profilo, seed);

  const risposta: SimulazioneEstratto = {
    simulazione: {
      id: `scn_${seed.toString(16)}`,
      descrizione: simulazione,
      generatoIl: new Date().toISOString(),
      durataMinuti: durata,
    },
    persona: {
      descrizione: persona || "Non specificata",
      profiloClinico: profilo.profiloClinico,
    },
    sensori,
    campioni,
    modalita,
  };

  return NextResponse.json(risposta, { status: 200 });
}
