import { NextResponse, type NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/*
 * Route API: conversione JSON -> CSV tramite script Python.
 *
 * Riceve il JSON della simulazione generata da /api/extract, lo scrive su file
 * temporaneo e invoca lo script `scripts/convert_to_csv.py` (pandas) per
 * appiattirlo in CSV. Restituisce il CSV come allegato scaricabile.
 *
 * NON BLOCCANTE: lo script gira in un processo figlio separato avviato con
 * `spawn` (asincrono). L'event loop di Node resta libero di servire altre
 * richieste mentre Python lavora; attendiamo l'evento 'close' tramite Promise.
 */

// Forza il runtime Node.js (necessario per child_process e accesso al filesystem):
// le route API in App Router potrebbero altrimenti girare su Edge.
export const runtime = "nodejs";

/** Risultato dell'esecuzione del processo Python. */
interface RisultatoPython {
  codice: number | null;
  stderr: string;
}

/**
 * Individua l'interprete Python: preferisce quello del virtualenv di progetto
 * (.venv), con fallback al `python` di sistema se il venv non è presente.
 */
function trovaInterpretePython(radiceProgetto: string): string {
  const candidati = [
    path.join(radiceProgetto, ".venv", "Scripts", "python.exe"), // Windows
    path.join(radiceProgetto, ".venv", "bin", "python"), // Linux/macOS
  ];
  for (const candidato of candidati) {
    if (existsSync(candidato)) return candidato;
  }
  return "python";
}

/**
 * Esegue lo script di conversione come processo figlio e risolve la Promise
 * quando il processo termina. La cattura di stderr serve alla diagnostica.
 */
function eseguiConversione(
  interprete: string,
  script: string,
  input: string,
  output: string,
): Promise<RisultatoPython> {
  return new Promise((resolve, reject) => {
    const figlio = spawn(interprete, [script, "--input", input, "--output", output]);

    let stderr = "";
    figlio.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    figlio.on("error", (err) => reject(err));
    figlio.on("close", (codice) => resolve({ codice, stderr }));
  });
}

export async function POST(request: NextRequest) {
  // Legge il JSON della simulazione dal corpo della richiesta.
  let simulazione: unknown;
  try {
    simulazione = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo della richiesta non valido (JSON atteso)." },
      { status: 400 },
    );
  }

  if (
    !simulazione ||
    typeof simulazione !== "object" ||
    !Array.isArray((simulazione as { campioni?: unknown }).campioni)
  ) {
    return NextResponse.json(
      { error: "JSON della simulazione non valido: campo 'campioni' mancante." },
      { status: 400 },
    );
  }

  const radiceProgetto = process.cwd();
  const script = path.join(radiceProgetto, "scripts", "convert_to_csv.py");
  const interprete = trovaInterpretePython(radiceProgetto);

  // Cartella temporanea isolata per i file di lavoro di questa richiesta.
  const cartella = await mkdtemp(path.join(tmpdir(), "dt-simulazione-"));
  const idFile = randomUUID();
  const percorsoJson = path.join(cartella, `${idFile}.json`);
  const percorsoCsv = path.join(cartella, `${idFile}.csv`);

  try {
    await writeFile(percorsoJson, JSON.stringify(simulazione), "utf-8");

    const { codice, stderr } = await eseguiConversione(
      interprete,
      script,
      percorsoJson,
      percorsoCsv,
    );

    if (codice !== 0) {
      console.error("Script convert_to_csv.py terminato con errore:", stderr);
      return NextResponse.json(
        { error: "Errore durante la conversione in CSV." },
        { status: 500 },
      );
    }

    const csv = await readFile(percorsoCsv);

    // Nome file basato sull'id della simulazione, se disponibile.
    const idSimulazione =
      (simulazione as { simulazione?: { id?: string } }).simulazione?.id ?? "simulazione";

    return new NextResponse(new Uint8Array(csv), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${idSimulazione}.csv"`,
      },
    });
  } catch (err) {
    console.error("Conversione CSV fallita:", err);
    return NextResponse.json(
      { error: "Impossibile generare il dataset CSV." },
      { status: 500 },
    );
  } finally {
    // Pulizia dei file temporanei, qualunque sia l'esito.
    await rm(cartella, { recursive: true, force: true }).catch(() => {});
  }
}
